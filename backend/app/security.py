#backend/app/security.py
import base64
import hashlib
import hmac
import re
import secrets
import time
from datetime import datetime, timedelta

import bcrypt
import jwt
import pyotp
from cryptography.fernet import Fernet
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from .database import get_db, settings
from .models import AuditLog, AuthSession, User, utcnow

JWT_ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------- rate limiting
# In-memory counters: correct for ONE server instance (Render free/starter plan).
# Several instances? Use Redis: Limiter(..., storage_uri="redis://...")
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["300/minute"],
    enabled=settings.RATE_LIMIT_ENABLED,
)


# ---------------------------------------------------------------- audit log
def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def audit(db: Session, request: Request, action: str, user_id: int | None = None, **meta) -> None:
    """Add an audit row. The caller commits (so it is saved together with the action)."""
    db.add(AuditLog(
        user_id=user_id,
        action=action,
        ip=client_ip(request),
        user_agent=(request.headers.get("user-agent") or "")[:255],
        meta=meta or None,
    ))


# ---------------------------------------------------------------- passwords
def _prehash(pw: str) -> bytes:
    # SHA-256 first so bcrypt's 72-byte limit never silently truncates a long password.
    return base64.b64encode(hashlib.sha256(pw.encode()).digest())


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(_prehash(pw), bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prehash(pw), hashed.encode())
    except ValueError:
        return False


DUMMY_HASH = hash_password("timing-equaliser-password")  # checked when the email doesn't exist

_COMMON = {
    "password12", "password123", "password1234", "qwerty12345", "1234567890", "12345678901",
    "iloveyou123", "welcome123", "welcome1234", "letmein1234", "admin12345", "abc1234567",
}


def password_problem(pw: str, email: str = "", name: str = "") -> str | None:
    if len(pw) < 10:
        return "Password must be at least 10 characters"
    if not re.search(r"[a-z]", pw) or not re.search(r"[A-Z]", pw) or not re.search(r"\d", pw):
        return "Password needs an uppercase letter, a lowercase letter and a number"
    local = email.split("@")[0].lower()
    if len(local) >= 4 and local in pw.lower():
        return "Password must not contain your email name"
    if pw.lower() in _COMMON:
        return "That password is too common. Choose a different one"
    return None


# ---------------------------------------------------------------- transaction PIN
def _pin_material(user_id: int, pin: str) -> bytes:
    mac = hmac.new(settings.JWT_SECRET.encode(), f"{user_id}:{pin}".encode(), hashlib.sha256).digest()
    return base64.b64encode(mac)


def hash_pin(user_id: int, pin: str) -> str:
    return bcrypt.hashpw(_pin_material(user_id, pin), bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)).decode()


def pin_problem(pin: str) -> str | None:
    if len(set(pin)) == 1 or pin in "0123456789" or pin in "9876543210":
        return "Choose a PIN that isn't a repeated or sequential number"
    return None


def check_pin(db: Session, request: Request, user: User, pin: str | None) -> None:
    """Verify the transaction PIN (with lockout). Raises HTTPException on failure.

    A user who has set a PIN must always give it. A user without a PIN is only allowed
    through while settings.REQUIRE_PIN is false (sandbox)."""
    if not user.pin_hash:
        if settings.REQUIRE_PIN:
            raise HTTPException(400, "Set your transaction PIN in Security settings first")
        return
    if not pin:
        raise HTTPException(400, "Enter your 6-digit transaction PIN")

    now = utcnow()
    if user.pin_locked_until and user.pin_locked_until > now:
        mins = int((user.pin_locked_until - now).total_seconds() // 60) + 1
        raise HTTPException(423, f"PIN locked after too many attempts. Try again in {mins} minute(s)")

    try:
        ok = bcrypt.checkpw(_pin_material(user.id, pin), user.pin_hash.encode())
    except ValueError:
        ok = False
    if not ok:
        user.pin_failed += 1
        left = settings.MAX_PIN_FAILS - user.pin_failed
        if left <= 0:
            user.pin_locked_until = now + timedelta(minutes=settings.LOCK_MINUTES)
            user.pin_failed = 0
        audit(db, request, "pin_failed", user_id=user.id)
        db.commit()
        raise HTTPException(403, "Incorrect PIN" + (f". {left} attempt(s) left" if left > 0 else ". PIN locked"))
    if user.pin_failed:
        user.pin_failed = 0


# ---------------------------------------------------------------- encryption at rest
def _fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    if not key:  # development fallback only (production refuses to start without a key)
        key = base64.urlsafe_b64encode(hashlib.sha256(settings.JWT_SECRET.encode()).digest()).decode()
    return Fernet(key.encode())


def encrypt(text: str) -> str:
    return _fernet().encrypt(text.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()


# ---------------------------------------------------------------- TOTP (authenticator app)
def new_totp_secret() -> str:
    return pyotp.random_base32()


def totp_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Payzo")


def verify_totp(user: User, code: str) -> bool:
    """Accepts the current code ±1 step; a code can never be used twice."""
    if not user.totp_secret_enc:
        return False
    totp = pyotp.TOTP(decrypt(user.totp_secret_enc))
    base = int(time.time()) // 30
    for off in (-1, 0, 1):
        step = base + off
        if step <= (user.totp_last_step or 0):
            continue
        if hmac.compare_digest(totp.at(step * 30), code):
            user.totp_last_step = step
            return True
    return False


# ---------------------------------------------------------------- tokens & sessions
def encode_token(user_id: int, jti: str, expires_at: datetime) -> str:
    payload = {"sub": str(user_id), "jti": jti, "exp": expires_at, "iat": int(time.time())}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_token(db: Session, user_id: int, request: Request) -> str:
    """Start a login session (stored in the DB so it can be revoked) and return its JWT.
    The caller commits."""
    now = utcnow()
    sess = AuthSession(
        jti=secrets.token_hex(16),
        user_id=user_id,
        ip=client_ip(request),
        user_agent=(request.headers.get("user-agent") or "")[:255],
        created_at=now,
        expires_at=now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES),
        revoked=False,
    )
    db.add(sess)
    db.flush()
    return encode_token(user_id, sess.jti, sess.expires_at)


def current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    def unauthorized():
        return HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again")

    if creds is None:
        raise unauthorized()
    try:
        payload = jwt.decode(creds.credentials, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM],
                             options={"require": ["exp", "jti", "sub"]})
    except jwt.PyJWTError:
        raise unauthorized()
    sess = db.query(AuthSession).filter(AuthSession.jti == payload["jti"], AuthSession.revoked.is_(False)).first()
    if not sess or sess.expires_at < utcnow():
        raise unauthorized()
    user = db.get(User, sess.user_id)
    if not user or not user.is_active:
        raise unauthorized()
    request.state.session = sess
    return user