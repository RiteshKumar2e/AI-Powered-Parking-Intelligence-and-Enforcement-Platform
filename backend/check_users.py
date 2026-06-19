import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import verify_password, get_password_hash

db = SessionLocal()
users = db.query(User).all()
print(f"Total users in DB: {len(users)}")

test_passwords = {
    'admin': 'admin123',
    'officer1': 'officer123',
    'analyst1': 'analyst123',
    'viewer1': 'viewer123',
}

for u in users:
    pw = test_passwords.get(u.username, 'unknown')
    ok = verify_password(pw, u.hashed_password) if u.hashed_password else False
    print(f"  {u.username} | active={u.is_active} | pw_ok={ok} | hash_prefix={u.hashed_password[:15] if u.hashed_password else 'None'}")

db.close()
print("\nDone.")
