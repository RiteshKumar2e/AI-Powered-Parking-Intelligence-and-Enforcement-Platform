"""
Seed script: creates users + cameras only. No fake violations or congestion data.
All violation/congestion data comes from real ML detections.

Run: python -m app.scripts.seed
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal, create_tables
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.camera import Camera, CameraStatus


CAMERAS = [
    ("Dadar Station Camera 1",   "Dadar Railway Station",  19.0178, 72.8478, "metro_station"),
    ("Andheri West Camera",      "Andheri Metro Station",  19.1197, 72.8468, "metro_station"),
    ("Bandra Junction Cam",      "Bandra Junction",        19.0544, 72.8402, "commercial"),
    ("Linking Road Camera",      "Linking Road",           19.0617, 72.8369, "commercial"),
    ("Worli Sea Face Cam",       "Worli Sea Face",         19.0119, 72.8157, "general"),
    ("Kurla Complex Camera",     "Kurla LBS Road",         19.0718, 72.8847, "commercial"),
    ("Powai Lake Camera",        "Powai Junction",         19.1177, 72.9067, "intersection"),
    ("Dharavi Junction Cam",     "Dharavi Cross Road",     19.0440, 72.8557, "intersection"),
]


def seed_users(db):
    if db.query(User).filter(User.username == "admin").first():
        print("[SKIP] Users already exist")
        return

    users = [
        User(email="admin@parkiq.city",   username="admin",    full_name="System Administrator",
             hashed_password=get_password_hash("admin123"),   role=UserRole.admin,   is_active=True),
        User(email="officer@parkiq.city", username="officer1", full_name="Ravi Kumar",
             hashed_password=get_password_hash("officer123"), role=UserRole.officer, is_active=True),
        User(email="analyst@parkiq.city", username="analyst1", full_name="Priya Sharma",
             hashed_password=get_password_hash("analyst123"), role=UserRole.analyst, is_active=True),
        User(email="viewer@parkiq.city",  username="viewer1",  full_name="Mohan Singh",
             hashed_password=get_password_hash("viewer123"),  role=UserRole.viewer,  is_active=True),
    ]
    db.add_all(users)
    db.commit()
    print(f"[OK] Created {len(users)} users")


def seed_cameras(db):
    if db.query(Camera).first():
        print(f"[SKIP] Cameras already exist ({db.query(Camera).count()} found)")
        return

    cameras = [
        Camera(
            name=name, location_name=loc, latitude=lat, longitude=lng,
            zone_type=zt, status=CameraStatus.active,
            rtsp_url=f"rtsp://camera.local/{i+1}/stream",
        )
        for i, (name, loc, lat, lng, zt) in enumerate(CAMERAS)
    ]
    db.add_all(cameras)
    db.commit()
    print(f"[OK] Created {len(cameras)} cameras")


def seed_database():
    create_tables()
    db = SessionLocal()
    try:
        seed_users(db)
        seed_cameras(db)
        print("\n[DONE] Seed complete.")
        print("\nLogin credentials:")
        print("  Admin:    admin    / admin123")
        print("  Officer:  officer1 / officer123")
        print("  Analyst:  analyst1 / analyst123")
        print("  Viewer:   viewer1  / viewer123")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
