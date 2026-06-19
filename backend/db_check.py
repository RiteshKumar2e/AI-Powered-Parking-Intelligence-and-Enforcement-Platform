import sqlite3

def check_db():
    conn = sqlite3.connect('parking_enforcement.db')
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables in database:", tables)
        
        cursor.execute("SELECT id, username, email, role, is_active FROM users;")
        users = cursor.fetchall()
        print("Users in database:")
        for u in users:
            print(u)
    except Exception as e:
        print("Error checking db:", e)
    finally:
        conn.close()

if __name__ == '__main__':
    check_db()
