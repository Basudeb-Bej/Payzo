#backend/app/main.py
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import inspect, text

from . import models  # noqa: F401  (registers the tables)
from .database import Base, engine, settings
from .routes_auth import router as auth_router, security_router
from .routes_wallet import bank_router, dev_router, get_provider, router as wallet_router
from .security import limiter
from .routes_account import router as account_router
from .routes_messages import router as messages_router
from .routes_invoices import router as invoices_router
from .routes_profile import router as profile_router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("payzo")


def _sql_default(col) -> str | None:
    """SQL literal for a column's simple Python default (True, 0, 'x'), else None."""
    d = col.default
    if d is None or not getattr(d, "is_scalar", False):
        return None
    v = d.arg
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, str):
        return "'" + v.replace("'", "''") + "'"
    return None


def _add_missing_columns(table, missing_cols) -> bool:
    """ALTER TABLE ... ADD COLUMN for new columns. Only safe for columns that are nullable
    or have a simple default; returns False (and changes nothing) if any column is not."""
    prep = engine.dialect.identifier_preparer
    statements = []
    for col in missing_cols:
        default = _sql_default(col)
        if not col.nullable and default is None:
            return False
        ddl = (f"ALTER TABLE {prep.quote(table.name)} ADD COLUMN {prep.quote(col.name)} "
               f"{col.type.compile(dialect=engine.dialect)}")
        if default is not None:
            ddl += f" DEFAULT {default}"
        statements.append(ddl)
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
    return True


def _create_missing_indexes() -> None:
    """create_all() never adds indexes to tables that already exist, so add any that are missing
    (e.g. the unique index on user_profiles.phone). A failure (such as duplicate phone numbers
    breaking a unique index) is logged and does not stop the server."""
    insp = inspect(engine)
    for table in Base.metadata.sorted_tables:
        have = {i["name"] for i in insp.get_indexes(table.name)}
        for idx in table.indexes:
            if idx.name in have:
                continue
            try:
                idx.create(bind=engine)
                log.info("Created index %s on %s", idx.name, table.name)
            except Exception as exc:
                log.warning("Could not create index %s on %s: %s", idx.name, table.name, exc)


def prepare_database() -> None:
    """Create the tables. Columns added to an existing table later (nullable, or with a simple
    default) are added automatically. If the database still has tables from an OLDER version of this
    project that can't be upgraded that way, stop with a clear message instead of failing later
    with a 500 error."""
    insp = inspect(engine)
    existing = set(insp.get_table_names())
    outdated = []
    for table in Base.metadata.sorted_tables:
        if table.name in existing:
            have = {c["name"] for c in insp.get_columns(table.name)}
            missing = [c for c in table.columns if c.name not in have]
            if not missing:
                continue
            try:
                if _add_missing_columns(table, missing):
                    log.info("Added missing columns to %s: %s", table.name, ", ".join(c.name for c in missing))
                    continue
            except Exception:
                log.exception("Could not add missing columns to %s", table.name)
            outdated.append(f"{table.name} (missing: {', '.join(c.name for c in missing)})")

    if outdated:
        if settings.RESET_DB and settings.SANDBOX and not settings.IS_PROD:
            log.warning("RESET_DB=true: deleting this app's OLD tables and recreating them: %s", "; ".join(outdated))
            Base.metadata.drop_all(bind=engine)       # only the tables defined in models.py
        else:
            raise RuntimeError(
                "Your database has tables from an older version of this project: " + "; ".join(outdated) + ". "
                "Fix: either set DB_DATABASE to a NEW empty database, or (test data only!) add RESET_DB=true "
                "to backend/.env for ONE start, then remove it. RESET_DB deletes this app's tables."
            )
    Base.metadata.create_all(bind=engine)
    _create_missing_indexes()


prepare_database()
get_provider()   # fail at start-up (not on the first payment) if PAYMENT_PROVIDER is misconfigured

app = FastAPI(
    title="Payzo API",
    docs_url=None if settings.IS_PROD else "/docs",     # no public API docs in production
    redoc_url=None,
    openapi_url=None if settings.IS_PROD else "/openapi.json",
)

app.state.limiter = limiter


async def too_many_requests(request: Request, exc: RateLimitExceeded):
    return JSONResponse({"detail": "Too many attempts. Please wait a minute and try again."},
                        status_code=429, headers={"Retry-After": "60"})


app.add_exception_handler(RateLimitExceeded, too_many_requests)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Cache-Control"] = "no-store"
    resp.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return resp


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)


app.include_router(auth_router)
app.include_router(security_router)
app.include_router(bank_router)
app.include_router(wallet_router)
if not settings.IS_PROD and settings.SANDBOX:
    app.include_router(dev_router)
app.include_router(account_router)
app.include_router(messages_router)
app.include_router(invoices_router)
app.include_router(profile_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/config")
def public_config():
    return {"sandbox": settings.SANDBOX}