"""
Wipes all GENERATED data (violations, congestion, hotspots, plates, detections)
but keeps users, cameras, and zones.
Run: python -m app.scripts.reset_db
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal, engine, create_tables
from sqlalchemy import text

# Only wipe transactional / ML-generated data — NOT cameras or zones
TABLES_TO_CLEAR = [
    "license_plates",
    "enforcement_actions",
    "detections",
    "frame_logs",
    "violations",
    "congestion_metrics",
    "hotspots",
    "predictions",
    "reports",
]


def reset():
    create_tables()
    db = SessionLocal()
    try:
        print("Clearing generated/demo data...")
        with engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys = OFF"))
            for table in TABLES_TO_CLEAR:
                try:
                    result = conn.execute(text(f"DELETE FROM {table}"))
                    try:
                        conn.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{table}'"))
                    except Exception:
                        pass
                    print(f"  [OK] Cleared {table} ({result.rowcount} rows)")
                except Exception as e:
                    print(f"  [SKIP] {table}: {e}")
            conn.execute(text("PRAGMA foreign_keys = ON"))
            conn.commit()

        print("\nEnsuring users exist...")
        from app.scripts.seed import seed_users
        seed_users(db)

        print("\nEnsuring cameras exist...")
        seed_cameras(db)

        print("\n[DONE] Reset complete — cameras/zones/users kept, all generated data cleared.")
    finally:
        db.close()


def seed_cameras(db):
    from app.models.camera import Camera, CameraStatus

    if db.query(Camera).first():
        count = db.query(Camera).count()
        print(f"  [SKIP] {count} cameras already exist")
        return

    cameras_data = [
        ("Dadar Station Camera 1",   "Dadar Railway Station",  19.0178, 72.8478, "metro_station"),
        ("Andheri West Camera",      "Andheri Metro Station",  19.1197, 72.8468, "metro_station"),
        ("Bandra Junction Cam",      "Bandra Junction",        19.0544, 72.8402, "commercial"),
        ("Linking Road Camera",      "Linking Road",           19.0617, 72.8369, "commercial"),
        ("Worli Sea Face Cam",       "Worli Sea Face",         19.0119, 72.8157, "general"),
        ("Kurla Complex Camera",     "Kurla LBS Road",         19.0718, 72.8847, "commercial"),
        ("Powai Lake Camera",        "Powai Junction",         19.1177, 72.9067, "intersection"),
        ("Dharavi Junction Cam",     "Dharavi Cross Road",     19.0440, 72.8557, "intersection"),
    ]

    cameras = [
        Camera(
            name=name, location_name=loc, latitude=lat, longitude=lng,
            zone_type=zt, status=CameraStatus.active,
            rtsp_url=f"rtsp://camera.local/{i+1}/stream",
        )
        for i, (name, loc, lat, lng, zt) in enumerate(cameras_data)
    ]
    db.add_all(cameras)
    db.commit()
    print(f"  [OK] Created {len(cameras)} cameras")


if __name__ == "__main__":
    reset()
