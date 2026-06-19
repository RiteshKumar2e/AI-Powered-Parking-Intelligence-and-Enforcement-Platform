from pydantic_settings import BaseSettings
from typing import Optional
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Parking Intelligence & Enforcement Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./parking_enforcement.db"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_ENABLED: bool = False

    # Storage
    STORAGE_BACKEND: str = "local"  # local | s3
    LOCAL_STORAGE_PATH: str = "./storage"
    S3_BUCKET: Optional[str] = None
    S3_REGION: Optional[str] = None
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # ML
    SIMULATE_DETECTIONS: bool = True
    YOLO_MODEL_PATH: str = "yolov8n.pt"
    YOLO_CONFIDENCE: float = 0.4
    OCR_LANGUAGES: str = "en"
    GPU_ENABLED: bool = False

    # Groq LLM
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"   # fast & capable — free tier available
    GROQ_MAX_TOKENS: int = 2048

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Frame ingestion
    FRAME_SAMPLE_RATE: int = 5  # process every Nth frame
    MAX_DWELL_SECONDS: int = 300  # 5 min before violation flag
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"  # used to build annotated image URLs

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
