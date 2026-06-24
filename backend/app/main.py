from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from contextlib import asynccontextmanager
from datetime import datetime
import re
import logging
import os

from app.config import settings
from app.database import create_tables
from app.websocket.manager import manager

from app.api import auth, cameras, zones, violations, plates, congestion, hotspots, predictions, reports, dashboard, search, users, history, evaluation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Parking Intelligence Platform...")
    create_tables()
    logger.info("Database tables initialized")
    os.makedirs(settings.LOCAL_STORAGE_PATH, exist_ok=True)
    os.makedirs(f"{settings.LOCAL_STORAGE_PATH}/evidence", exist_ok=True)
    os.makedirs(f"{settings.LOCAL_STORAGE_PATH}/annotated", exist_ok=True)
    os.makedirs(f"{settings.LOCAL_STORAGE_PATH}/plates", exist_ok=True)
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Smart Parking Intelligence and Enforcement System",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    redirect_slashes=False,
)

# CORS — explicit list from env + always allow any localhost port
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
_localhost_re = re.compile(r"^https?://localhost(:\d+)?$")

@app.middleware("http")
async def cors_preflight_middleware(request: Request, call_next):
    origin = request.headers.get("origin", "")
    allowed = origin in origins or bool(_localhost_re.match(origin))
    if request.method == "OPTIONS":
        response = Response(status_code=204)
        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "*"
            response.headers["Access-Control-Max-Age"] = "600"
        return response
    response = await call_next(request)
    if allowed:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://localhost(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded evidence files
if os.path.isdir(settings.LOCAL_STORAGE_PATH):
    app.mount("/storage", StaticFiles(directory=settings.LOCAL_STORAGE_PATH), name="storage")

# API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(cameras.router, prefix="/api/v1")
app.include_router(zones.router, prefix="/api/v1")
app.include_router(violations.router, prefix="/api/v1")
app.include_router(plates.router, prefix="/api/v1")
app.include_router(congestion.router, prefix="/api/v1")
app.include_router(hotspots.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(evaluation.router, prefix="/api/v1")


@app.get("/api/v1/health")
def health():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "simulation_mode": settings.SIMULATE_DETECTIONS,
    }


@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str = "global"):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)
    except Exception:
        manager.disconnect(websocket, channel)


@app.get("/")
def root():
    return {"message": settings.APP_NAME, "docs": "/api/docs"}
