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
        ("MG Road Camera 1",         "MG Road Junction",          12.9757, 77.6011, "commercial"),
        ("Silk Board Junction Cam",   "Silk Board Flyover",        12.9176, 77.6228, "intersection"),
        ("Marathahalli Camera",       "Marathahalli Bridge",       12.9564, 77.7010, "commercial"),
        ("Koramangala Camera",        "Koramangala 80 Ft Road",    12.9344, 77.6146, "commercial"),
        ("Whitefield Camera",         "Whitefield Main Road",      12.9698, 77.7499, "metro_station"),
        ("Jayanagar Camera",          "Jayanagar 4th Block",       12.9250, 77.5938, "general"),
        ("Rajajinagar Camera",        "Rajajinagar Circle",        12.9877, 77.5479, "intersection"),
        ("Hebbal Flyover Cam",        "Hebbal Interchange",        13.0358, 77.5970, "intersection"),
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
