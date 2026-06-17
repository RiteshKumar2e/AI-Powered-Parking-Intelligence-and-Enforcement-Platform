"""
Seed script: creates demo data including cameras, zones, violations, and hotspots.
Run: python -m app.scripts.seed
"""
import sys
import os
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import SessionLocal, create_tables
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.camera import Camera, CameraStatus
from app.models.zone import Zone, ZoneType
from app.models.violation import Violation, ViolationType, VehicleType, ViolationStatus
from app.models.plate import LicensePlate
from app.models.congestion import CongestionMetric
from app.models.hotspot import Hotspot

# Demo city: central Mumbai coordinates
BASE_LAT = 19.0760
BASE_LNG = 72.8777

CAMERA_LOCATIONS = [
    ("Dadar Station Camera 1", "Dadar Railway Station", 19.0178, 72.8478, "metro_station"),
    ("Andheri West Camera", "Andheri Metro Station", 19.1197, 72.8468, "metro_station"),
    ("Bandra Junction Cam", "Bandra Junction", 19.0544, 72.8402, "commercial"),
    ("Linking Road Camera", "Linking Road", 19.0617, 72.8369, "commercial"),
    ("Worli Sea Face Cam", "Worli Sea Face", 19.0119, 72.8157, "general"),
    ("Kurla Complex Camera", "Kurla LBS Road", 19.0718, 72.8847, "commercial"),
    ("Powai Lake Camera", "Powai Junction", 19.1177, 72.9067, "intersection"),
    ("Dharavi Junction Cam", "Dharavi Cross Road", 19.0440, 72.8557, "intersection"),
]

ZONE_DEFS = [
    ("Dadar No-Parking Zone", ZoneType.no_parking, 19.0178, 72.8478, 150, 4, 1000),
    ("Andheri Metro Dropoff", ZoneType.metro_station, 19.1197, 72.8468, 200, 4, 1500),
    ("Bandra Commercial Zone", ZoneType.commercial, 19.0544, 72.8402, 300, 3, 800),
    ("Linking Road Restricted", ZoneType.restricted, 19.0617, 72.8369, 250, 3, 1500),
    ("Worli Residential Zone", ZoneType.general, 19.0119, 72.8157, 200, 2, 500),
    ("Kurla Market Zone", ZoneType.commercial, 19.0718, 72.8847, 350, 3, 800),
    ("Powai Event Zone", ZoneType.event, 19.1177, 72.9067, 400, 2, 1200),
    ("Dharavi Intersection", ZoneType.intersection, 19.0440, 72.8557, 100, 4, 2000),
]

VIOLATION_TYPES = list(ViolationType)
VEHICLE_TYPES = [VehicleType.car, VehicleType.motorcycle, VehicleType.truck,
                 VehicleType.bus, VehicleType.auto_rickshaw]

INDIAN_STATES = ["MH", "DL", "GJ", "KA", "TN", "RJ", "UP"]


def random_plate():
    state = random.choice(INDIAN_STATES)
    dist = str(random.randint(1, 99)).zfill(2)
    series = "".join(random.choices("ABCDEFGHJKLMNPRSTUVWXYZ", k=random.randint(1, 3)))
    num = str(random.randint(1, 9999)).zfill(4)
    return f"{state} {dist} {series} {num}"


def seed_database():
    create_tables()
    db = SessionLocal()
    try:
        # --- Users ---
        if not db.query(User).filter(User.username == "admin").first():
            users = [
                User(email="admin@parkiq.city", username="admin", full_name="System Administrator",
                     hashed_password=get_password_hash("admin123"), role=UserRole.admin),
                User(email="officer@parkiq.city", username="officer1", full_name="Ravi Kumar",
                     hashed_password=get_password_hash("officer123"), role=UserRole.officer),
                User(email="analyst@parkiq.city", username="analyst1", full_name="Priya Sharma",
                     hashed_password=get_password_hash("analyst123"), role=UserRole.analyst),
                User(email="viewer@parkiq.city", username="viewer1", full_name="Mohan Singh",
                     hashed_password=get_password_hash("viewer123"), role=UserRole.viewer),
            ]
            db.add_all(users)
            db.commit()
            print(f"✓ Created {len(users)} users")

        # --- Cameras ---
        if not db.query(Camera).first():
            cameras = [
                Camera(name=name, location_name=loc, latitude=lat, longitude=lng,
                       zone_type=zt, status=CameraStatus.active,
                       rtsp_url=f"rtsp://demo.camera/{i+1}/stream")
                for i, (name, loc, lat, lng, zt) in enumerate(CAMERA_LOCATIONS)
            ]
            db.add_all(cameras)
            db.commit()
            print(f"✓ Created {len(cameras)} cameras")

        # --- Zones ---
        if not db.query(Zone).first():
            zones = [
                Zone(name=name, zone_type=zt, center_lat=lat, center_lng=lng,
                     radius_meters=radius, priority_level=priority, fine_amount=fine,
                     description=f"Enforcement zone: {zt.value.replace('_', ' ').title()}",
                     is_active=True)
                for name, zt, lat, lng, radius, priority, fine in ZONE_DEFS
            ]
            db.add_all(zones)
            db.commit()
            print(f"✓ Created {len(zones)} zones")

        # --- Violations (last 7 days) ---
        if not db.query(Violation).first():
            cameras = db.query(Camera).all()
            zones = db.query(Zone).all()
            violations_created = 0

            for day in range(7, 0, -1):
                day_start = datetime.utcnow() - timedelta(days=day)
                num_violations = random.randint(15, 45)
                for _ in range(num_violations):
                    cam = random.choice(cameras)
                    zone = random.choice(zones) if random.random() > 0.2 else None
                    vtype = random.choices(
                        [ViolationType.illegal_parking, ViolationType.no_parking_zone,
                         ViolationType.double_parking, ViolationType.blocking_intersection,
                         ViolationType.pavement_parking],
                        weights=[35, 25, 20, 12, 8],
                    )[0]
                    vehicle = random.choice(VEHICLE_TYPES)
                    plate = random_plate() if random.random() > 0.1 else None
                    ts = day_start + timedelta(
                        hours=random.randint(7, 22),
                        minutes=random.randint(0, 59),
                    )
                    dwell = random.randint(120, 3600)
                    lat = cam.latitude + random.uniform(-0.002, 0.002)
                    lng = cam.longitude + random.uniform(-0.002, 0.002)
                    congestion_score = round(random.uniform(10, 85), 2)
                    status = random.choices(
                        [ViolationStatus.pending_review, ViolationStatus.confirmed,
                         ViolationStatus.ticket_issued, ViolationStatus.dismissed],
                        weights=[30, 40, 20, 10],
                    )[0]

                    v = Violation(
                        camera_id=cam.id,
                        zone_id=zone.id if zone else None,
                        violation_type=vtype,
                        vehicle_type=vehicle,
                        plate_number=plate,
                        plate_confidence=round(random.uniform(0.72, 0.98), 3) if plate else 0.0,
                        detection_confidence=round(random.uniform(0.75, 0.99), 3),
                        congestion_impact_score=congestion_score,
                        latitude=lat,
                        longitude=lng,
                        frame_timestamp=ts,
                        dwell_seconds=dwell,
                        status=status,
                        fine_amount=zone.fine_amount if zone else 500.0,
                        bounding_box={"x": random.randint(50, 500), "y": random.randint(50, 400),
                                      "w": random.randint(80, 200), "h": random.randint(50, 120)},
                    )
                    db.add(v)
                    violations_created += 1

                    if plate:
                        db.flush()
                        lp = LicensePlate(
                            violation_id=v.id,
                            raw_text=plate,
                            normalized_text=plate.replace(" ", ""),
                            state_code=plate.split()[0],
                            confidence=v.plate_confidence,
                            needs_review=v.plate_confidence < 0.80,
                        )
                        db.add(lp)

            db.commit()
            print(f"✓ Created {violations_created} violations (last 7 days)")

        # --- Congestion Metrics ---
        if not db.query(CongestionMetric).first():
            cameras = db.query(Camera).all()
            metrics_created = 0
            for hours_ago in range(48, 0, -1):
                for cam in cameras[:4]:
                    ts = datetime.utcnow() - timedelta(hours=hours_ago)
                    hour = ts.hour
                    base_score = 20 + (30 if 8 <= hour <= 10 else 0) + (25 if 17 <= hour <= 20 else 0)
                    score = round(base_score + random.uniform(-10, 20), 2)
                    m = CongestionMetric(
                        camera_id=cam.id,
                        latitude=cam.latitude,
                        longitude=cam.longitude,
                        timestamp=ts,
                        vehicle_count=random.randint(5, 30),
                        parked_vehicle_count=random.randint(1, 8),
                        moving_vehicle_count=random.randint(4, 22),
                        average_speed_kmh=max(5, 40 - score * 0.3),
                        congestion_score=min(score, 100),
                        violation_count=random.randint(0, 3),
                        blocked_lanes=random.randint(0, 2),
                        flow_rate=round(random.uniform(2, 12), 2),
                    )
                    db.add(m)
                    metrics_created += 1
            db.commit()
            print(f"✓ Created {metrics_created} congestion metric snapshots")

        # --- Hotspots ---
        if not db.query(Hotspot).first():
            zones = db.query(Zone).all()
            for zone in zones:
                count = random.randint(5, 40)
                hs = Hotspot(
                    zone_id=zone.id,
                    latitude=zone.center_lat,
                    longitude=zone.center_lng,
                    violation_count=count,
                    avg_congestion_score=round(random.uniform(30, 85), 2),
                    severity_level=min(5, count // 5 + 1),
                    peak_hour=random.choice([8, 9, 10, 17, 18, 19]),
                    period_start=datetime.utcnow() - timedelta(days=1),
                    period_end=datetime.utcnow(),
                    trend=random.choice(["rising", "stable", "falling"]),
                    violation_type_breakdown={
                        "illegal_parking": count // 2,
                        "no_parking_zone": count // 3,
                        "double_parking": count // 6,
                    },
                )
                db.add(hs)
            db.commit()
            print(f"✓ Created {len(zones)} hotspot records")

        print("\n✅ Seed complete!")
        print("\nLogin credentials:")
        print("  Admin:    admin / admin123")
        print("  Officer:  officer1 / officer123")
        print("  Analyst:  analyst1 / analyst123")
        print("  Viewer:   viewer1 / viewer123")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
