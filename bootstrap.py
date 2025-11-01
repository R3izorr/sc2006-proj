# bootstrap.py
import sys
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
BACKEND_REQ = REPO_ROOT / "backend" / "requirements.txt"
SQL_DIR = REPO_ROOT / "backend" / "sql"
ENV_PATH = REPO_ROOT / ".env"

INSTALL_DEPS = True
APPLY_SCHEMA = True
CREATE_ADMIN = True
START_BACKEND = True   # set to True if you want to start the API server after setup

def ensure_deps():
    if not INSTALL_DEPS:
        return
    print("[1/4] Installing backend dependencies...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(BACKEND_REQ)])
    print("    OK")

def apply_schema():
    if not APPLY_SCHEMA:
        return
    print("[2/4] Applying database schema...")
    if not ENV_PATH.exists():
        raise SystemExit("ERROR: .env not found at repo root. Create it (see env.example).")
    from dotenv import load_dotenv
    load_dotenv(str(ENV_PATH))
    import os
    from sqlalchemy import create_engine, text
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("ERROR: DATABASE_URL missing in .env")
    
    # Using psycopg v3 (psycopg[binary]) with SQLAlchemy dialect 'postgresql+psycopg'
    
    try:
        engine = create_engine(url, future=True)
        # Apply all SQL files in backend/sql in lexical order (001_*.sql, 002_*.sql, ...)
        if not SQL_DIR.exists():
            raise SystemExit(f"ERROR: SQL directory not found: {SQL_DIR}")
        files = sorted(SQL_DIR.glob("*.sql"))
        if not files:
            raise SystemExit(f"ERROR: No .sql files found in {SQL_DIR}")
        with engine.begin() as conn:
            for p in files:
                try:
                    sql = p.read_text(encoding="utf-8")
                    conn.execute(text(sql))
                    print(f"    Applied {p.name}")
                except Exception as ee:
                    print(f"    ERROR applying {p.name}: {ee}")
                    raise
        print("    OK (all migrations applied)")
    except Exception as e:
        print(f"    ERROR: Failed to apply schema: {e}")
        print("    Make sure your DATABASE_URL is correct and the database is accessible.")
        raise SystemExit(1)

def create_admin_user():
    if not CREATE_ADMIN:
        return
    print("[3/4] Creating initial admin user (idempotent)...")
    # Make sure Python can import backend.src.*
    sys.path.insert(0, str(REPO_ROOT))
    from dotenv import load_dotenv
    load_dotenv(str(ENV_PATH))
    
    try:
        from backend.src.db import get_session
        from backend.src.services.auth_service import hash_password
        from backend.src.repositories.user_repo import get_user_by_email, create_user
        email = "admin@example.com"
        password = "pass123"
        with get_session() as s:
            existing = get_user_by_email(s, email=email)
            if existing:
                print(f"    Admin user already exists: {email}")
            else:
                uid = create_user(s, email=email, password_hash=hash_password(password), role="admin")
                print(f"    Created admin user {email} with id: {uid}")
        print("    OK")
    except Exception as e:
        print(f"    ERROR: Failed to create admin user: {e}")
        print("    Make sure the database schema was applied successfully.")
        raise SystemExit(1)

def start_backend():
    if not START_BACKEND:
        return
    print("[4/4] Starting backend server at http://127.0.0.1:8000 ...")
    # Run uvicorn in-process
    import uvicorn
    uvicorn.run("backend.src.main:app", host="127.0.0.1", port=8000, reload=False)

def main():
    try:
        ensure_deps()
        apply_schema()
        create_admin_user()
        start_backend()
        print("\nDone.")
        if not START_BACKEND:
            print("Tip: To run the API server later from Python: set START_BACKEND = True and re-run this script.")
            print("Or start it via: uvicorn backend.src.main:app --host 127.0.0.1 --port 8000")
    except subprocess.CalledProcessError as e:
        print("\nCommand failed:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()