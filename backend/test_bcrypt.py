from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test():
    try:
        h = pwd_context.hash("admin123")
        print("Hash successful:", h)
        v = pwd_context.verify("admin123", h)
        print("Verify successful:", v)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
