"""
Minimal DB check - uses only sqlite3 (stdlib) to read users directly.
No heavy imports needed.
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "parking_enforcement.db")
print(f"DB path: {db_path}")
print(f"DB exists: {os.path.exists(db_path)}")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# List all tables
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cur.fetchall()
print(f"Tables: {[t[0] for t in tables]}")

# Check users table
try:
    cur.execute("SELECT id, username, email, is_active, hashed_password FROM users")
    rows = cur.fetchall()
    print(f"\nTotal users: {len(rows)}")
    for row in rows:
        uid, uname, email, active, hpw = row
        print(f"  id={uid} | username={uname!r} | email={email!r} | active={active} | hash_prefix={str(hpw)[:20] if hpw else 'NULL'}")
except Exception as e:
    print(f"Error reading users: {e}")

conn.close()
