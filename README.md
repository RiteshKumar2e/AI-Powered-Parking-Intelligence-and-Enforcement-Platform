# ParkIQ — AI-Powered Smart Parking Intelligence & Enforcement Platform

A production-grade AI system for detecting illegal parking, quantifying congestion impact, and enabling data-driven traffic enforcement in smart cities.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Dashboard                          │
│  Dashboard | Live Monitor | Violations | Heatmap | Reports  │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST + WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                   FastAPI Backend                            │
│  Auth | Cameras | Zones | Violations | Reports | Predictions │
└──────┬──────────────────┬───────────────────────────────────┘
       │                  │
┌──────▼──────┐    ┌──────▼──────────────────────────────────┐
│  ML Pipeline│    │          Services Layer                   │
│  YOLOv8     │    │  ViolationEngine | CongestionScorer       │
│  ByteTrack  │    │  ReportingService (Claude API)            │
│  EasyOCR    │    │  StorageService | IngestionService        │
└─────────────┘    └──────────────────────────────────────────┘
                          │
                   ┌──────▼──────┐
                   │  SQLite/    │
                   │  PostgreSQL │
                   └─────────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Computer Vision** | YOLOv8-based vehicle detection with 14 violation types |
| **License Plate OCR** | EasyOCR with Indian plate format validation |
| **Object Tracking** | IoU-based tracker measuring dwell time for parked vehicles |
| **Congestion Scoring** | Weighted formula: dwell + vehicle type + zone priority + lane blocks |
| **Violation Heatmaps** | Grid-based spatial aggregation with severity visualization |
| **Predictive Analytics** | Statistical forecasting of violation hotspots per zone |
| **LLM Reporting** | Claude API generates structured enforcement reports |
| **Real-time Dashboard** | WebSocket-powered live violation/congestion updates |
| **RBAC** | 4 roles: Admin, Officer, Analyst, Viewer |

---

## Quick Start

### Option 1: Local Development (No Docker)

**Prerequisites:** Python 3.11+, Node.js 18+

```bash
# 1. Copy environment config
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY if you want AI reports

# 2. Install dependencies
make install

# 3. Seed demo data (cameras, zones, violations)
make seed

# 4. Start backend (terminal 1)
make dev-backend
# API docs at http://localhost:8000/api/docs

# 5. Start frontend (terminal 2)
make dev-frontend
# App at http://localhost:5173
```

### Option 2: Docker Compose

```bash
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env if desired

docker-compose up --build -d
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/api/docs
```

After startup, seed the database:
```bash
docker exec parkiq-backend python -m app.scripts.seed
```

---

## Login Credentials (Demo)

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Officer | `officer1` | `officer123` |
| Analyst | `analyst1` | `analyst123` |
| Viewer | `viewer1` | `viewer123` |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./parking_enforcement.db` | DB connection string |
| `SIMULATE_DETECTIONS` | `true` | Use mock ML detections (no GPU needed) |
| `ANTHROPIC_API_KEY` | — | Enable Claude AI report generation |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Claude model to use |
| `STORAGE_BACKEND` | `local` | `local` or `s3` |
| `SECRET_KEY` | — | JWT signing secret |

---

## API Endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /api/v1/auth/login`, `/register` |
| Cameras | `GET/POST /cameras`, `POST /cameras/{id}/ingest` |
| Zones | `GET/POST/PATCH/DELETE /zones` |
| Violations | `GET /violations`, `GET /violations/{id}`, `POST /violations/{id}/actions` |
| Congestion | `GET /congestion/timeline`, `/congestion/current` |
| Hotspots | `GET /hotspots/heatmap`, `/hotspots` |
| Predictions | `GET /predictions/forecast`, `/predictions/recommendations` |
| Reports | `GET/POST /reports` (Claude LLM powered) |
| Dashboard | `GET /dashboard/summary`, `/violation-trend`, `/top-zones` |
| Search | `GET /search?q=MH12AB1234` |
| Plates | `GET /plates`, `PATCH /plates/{id}/verify` |

Full interactive docs: `http://localhost:8000/api/docs`

---

## ML Pipeline

```
Image → YOLOv8 Detection → IoU Tracker → Dwell Timer
                                             ↓
                              Parked > 2min? → OCR Plate
                                             ↓
                              Zone Check → Violation Engine
                                             ↓
                              Congestion Score → DB + WebSocket
```

### Violation Types Detected
- Illegal parking, Double parking, No-parking zone
- Blocking intersection, Pavement parking, Bus stop blocking
- Wrong-side driving, Red light / Stop line violation
- Helmet / Seatbelt non-compliance, Triple riding

### Congestion Impact Score (0–100)
```
score = dwell_normalized × 0.40
      + vehicle_impact × 0.20
      + zone_priority × 0.25
      + lane_blocked × 0.15
```

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── api/                 # FastAPI routers (12 modules)
│   │   ├── ml/                  # detector, ocr, tracker
│   │   ├── services/            # violation_engine, congestion, reporting
│   │   ├── websocket/           # WebSocket connection manager
│   │   └── scripts/seed.py      # Demo data seeder
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/               # 10 pages
│       ├── components/          # Reusable UI components
│       ├── api/                 # Axios API client
│       ├── hooks/               # useAuth, useWebSocket
│       └── types/               # TypeScript types
├── docker-compose.yml
├── .env.example
└── Makefile
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| ML | YOLOv8 (ultralytics), EasyOCR, NumPy |
| LLM | Claude API (Anthropic) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Frontend | React 18, TypeScript, Vite |
| Maps | Leaflet + React-Leaflet |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Auth | JWT (python-jose) |
| Containers | Docker + Docker Compose |

---

## Enabling Real ML (Production)

By default, `SIMULATE_DETECTIONS=true` generates synthetic detections for demo purposes. To enable real ML:

```bash
# In .env:
SIMULATE_DETECTIONS=false
YOLO_MODEL_PATH=yolov8n.pt  # auto-downloads on first run
GPU_ENABLED=true             # if CUDA available
```

The system will automatically download YOLOv8n and initialize EasyOCR on startup.
