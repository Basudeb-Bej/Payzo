#backend/app/database.py
import os
from decimal import Decimal

import certifi
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()


def _env(name: str, default: str = "") -> str:
    """Read an env var and strip stray spaces/quotes (e.g. DB_PASSWORD=abc pasted with quotes)."""
    v = os.getenv(name, default).strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in ("'", '"'):
        v = v[1:-1]
    return v


def _bool(name: str, default: str = "false") -> bool:
    return _env(name, default).lower() in ("1", "true", "yes", "on")


class Settings:
    ENV = _env("APP_ENV", "development").lower()
    IS_PROD = ENV == "production"

    PAYMENT_PROVIDER = _env("PAYMENT_PROVIDER", "sandbox").lower()
    SANDBOX = PAYMENT_PROVIDER == "sandbox"          

    JWT_SECRET = _env("JWT_SECRET", "dev-only-secret-do-not-use-in-production-0000")
    ENCRYPTION_KEY = _env("ENCRYPTION_KEY")          
    # JWT_EXPIRE_MINUTES (your old name) still works
    ACCESS_TOKEN_MINUTES = int(_env("ACCESS_TOKEN_MINUTES") or _env("JWT_EXPIRE_MINUTES") or "30")
    SESSION_MAX_HOURS = int(_env("SESSION_MAX_HOURS", "8"))
    BCRYPT_ROUNDS = int(_env("BCRYPT_ROUNDS", "12"))

    FRONTEND_ORIGINS = [
        o.strip().rstrip("/")
        for o in _env("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if o.strip()
    ]

    RATE_LIMIT_ENABLED = _bool("RATE_LIMIT_ENABLED", "true")
    MAX_FAILED_LOGINS = 5
    MAX_PIN_FAILS = 5
    LOCK_MINUTES = 15

    REQUIRE_PIN = _bool("REQUIRE_PIN", "false" if SANDBOX else "true")
    
    SANDBOX_AUTO_KYC = _bool("SANDBOX_AUTO_KYC", "true") and SANDBOX and not IS_PROD

    RESET_DB = _bool("RESET_DB")

    LIMITS = {
        "basic": {"per_txn": Decimal("5000"), "daily": Decimal("10000"), "max_balance": Decimal("10000")},
        "verified": {"per_txn": Decimal("100000"), "daily": Decimal("200000"), "max_balance": Decimal("200000")},
    }
    MAX_BANK_ACCOUNTS = 5


settings = Settings()

if settings.IS_PROD:
    _problems = []
    if len(settings.JWT_SECRET) < 32 or settings.JWT_SECRET.startswith("dev-only"):
        _problems.append("JWT_SECRET must be set to a long random value")
    if not settings.ENCRYPTION_KEY:
        _problems.append("ENCRYPTION_KEY must be set")
    if not settings.RATE_LIMIT_ENABLED:
        _problems.append("RATE_LIMIT_ENABLED must not be false in production")
    if _problems:
        raise RuntimeError("Unsafe production config: " + "; ".join(_problems))


def _database_url():
    """Two ways to configure the database (use ONE):
       1) separate values:  DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE   (easiest)
       2) one line:         DATABASE_URL=mysql+pymysql://user:password@host:4000/dbname
    """
    url = _env("DATABASE_URL")
    if url:
        return url.replace("mysql://", "mysql+pymysql://", 1) if url.startswith("mysql://") else url
    host = _env("DB_HOST")
    if host:
        return URL.create(  # handles special characters in the password for you
            "mysql+pymysql",
            username=_env("DB_USERNAME"),
            password=_env("DB_PASSWORD"),
            host=host,
            port=int(_env("DB_PORT", "3306")),
            database=_env("DB_DATABASE"),
        )
    return "mysql+pymysql://payuser:paypass@localhost:3306/payment_db" 

connect_args = {}
if _env("DB_SSL", "false").lower() == "true":
    connect_args = {"ssl_ca": certifi.where(), "ssl_verify_cert": True, "ssl_verify_identity": True}

engine = create_engine(_database_url(), connect_args=connect_args, pool_pre_ping=True, pool_recycle=280)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()