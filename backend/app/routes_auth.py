#backend/app/routes_auth.py
from datetime import timedelta
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db, settings
from .models import AuthSession, User, Wallet, utcnow
from .routes_wallet import generate_wallet_no
from .schemas import (
    ChangePasswordIn, LoginIn, PasswordConfirmIn, PinSetIn, RegisterIn,
    TokenOut, TotpCodeIn, TotpDisableIn, UserOut,
)
from .security import (
    DUMMY_HASH, audit, create_token, current_user, encode_token, encrypt, hash_password, hash_pin,
    limiter, new_totp_secret, password_problem, pin_problem, totp_uri, verify_password, verify_totp,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
security_router = APIRouter(prefix="/api/security", tags=["security"])


def ensure_wallet(db: Session, user: User) -> None:
    """Every user must own a wallet. If a row is missing (e.g. an account created before wallets existed,
    or a half-finished sign-up), create it instead of crashing with a 500."""
    if user.wallet is None:
        user.wallet = Wallet(wallet_no=generate_wallet_no(db))
        db.commit()
        db.refresh(user)


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id, name=user.name, email=user.email, wallet_no=user.wallet.wallet_no,
        kyc_status=user.kyc_status, totp_enabled=user.totp_enabled,
        has_pin=bool(user.pin_hash), created_at=user.created_at,
    )


# ====================================================================== register / login
@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute;20/hour")
def register(request: Request, body: RegisterIn, db: Session = Depends(get_db)):
    email = str(body.email).strip().lower()

    if (problem := password_problem(body.password, email, body.name)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    if db.query(User.id).filter(User.email == email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=hash_password(body.password),
        kyc_status="VERIFIED" if settings.SANDBOX_AUTO_KYC else "NOT_STARTED",
    )
    user.wallet = Wallet(wallet_no=generate_wallet_no(db))   # every user gets a wallet at sign-up
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    audit(db, request, "register", user_id=user.id)
    token = create_token(db, user.id, request)
    db.commit()
    return TokenOut(access_token=token)


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute;60/hour")
def login(request: Request, body: LoginIn, db: Session = Depends(get_db)):
    now = utcnow()
    user = db.query(User).filter(User.email == str(body.email).strip().lower()).first()

    if not user:
        verify_password(body.password, DUMMY_HASH)   # same timing as a real check
        audit(db, request, "login_failed", reason="unknown_email")
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect")

    if user.locked_until and user.locked_until > now:
        mins = ceil((user.locked_until - now).total_seconds() / 60)
        audit(db, request, "login_blocked_locked", user_id=user.id)
        db.commit()
        raise HTTPException(423, f"Too many failed attempts. Try again in {mins} minute(s)")

    password_ok = verify_password(body.password, user.password_hash)
    otp_ok = True
    if password_ok and user.totp_enabled:
        if not body.otp:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "otp_required")
        otp_ok = verify_totp(user, body.otp)

    if not (password_ok and otp_ok and user.is_active):
        user.failed_logins += 1
        if user.failed_logins >= settings.MAX_FAILED_LOGINS:
            user.locked_until = now + timedelta(minutes=settings.LOCK_MINUTES)
            user.failed_logins = 0
        audit(db, request, "login_failed", user_id=user.id, reason="bad_otp" if password_ok else "bad_password")
        db.commit()
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid verification code" if password_ok else "Email or password is incorrect",
        )

    user.failed_logins, user.locked_until, user.last_login_at = 0, None, now
    ensure_wallet(db, user)
    token = create_token(db, user.id, request)
    audit(db, request, "login", user_id=user.id)
    db.commit()
    return TokenOut(access_token=token)


@router.post("/refresh", response_model=TokenOut)
@limiter.limit("30/hour")
def refresh(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Sliding session: extends the session while the user is active (up to SESSION_MAX_HOURS)."""
    sess = request.state.session
    hard_stop = sess.created_at + timedelta(hours=settings.SESSION_MAX_HOURS)
    new_exp = min(utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES), hard_stop)
    if new_exp <= utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired. Please sign in again")
    sess.expires_at = new_exp
    db.commit()
    return TokenOut(access_token=encode_token(user.id, sess.jti, new_exp))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    ensure_wallet(db, user)
    return user_out(user)


@router.post("/logout", status_code=204)
def logout(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    request.state.session.revoked = True
    audit(db, request, "logout", user_id=user.id)
    db.commit()


@router.post("/logout-all", status_code=204)
def logout_all(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.query(AuthSession).filter(AuthSession.user_id == user.id).update({"revoked": True})
    audit(db, request, "logout_all", user_id=user.id)
    db.commit()


@router.post("/change-password", status_code=204)
@limiter.limit("5/minute")
def change_password(request: Request, body: ChangePasswordIn, user: User = Depends(current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        audit(db, request, "password_change_failed", user_id=user.id)
        db.commit()
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Current password is incorrect")
    if (problem := password_problem(body.new_password, user.email, user.name)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    user.password_hash = hash_password(body.new_password)
    # sign out every other device
    db.query(AuthSession).filter(
        AuthSession.user_id == user.id, AuthSession.id != request.state.session.id
    ).update({"revoked": True})
    audit(db, request, "password_changed", user_id=user.id)
    db.commit()


# ====================================================================== account security
def _need_password(db: Session, request: Request, user: User, password: str) -> None:
    if not verify_password(password, user.password_hash):
        audit(db, request, "reauth_failed", user_id=user.id)
        db.commit()
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Password is incorrect")


@security_router.post("/totp/setup")
@limiter.limit("10/hour")
def totp_setup(request: Request, body: PasswordConfirmIn, user: User = Depends(current_user),
               db: Session = Depends(get_db)):
    if user.totp_enabled:
        raise HTTPException(400, "Two-factor authentication is already on")
    _need_password(db, request, user, body.password)
    secret = new_totp_secret()
    user.totp_secret_enc = encrypt(secret)
    db.commit()
    return {"secret": secret, "uri": totp_uri(secret, user.email)}


@security_router.post("/totp/enable", status_code=204)
@limiter.limit("10/minute")
def totp_enable(request: Request, body: TotpCodeIn, user: User = Depends(current_user),
                db: Session = Depends(get_db)):
    if user.totp_enabled or not user.totp_secret_enc:
        raise HTTPException(400, "Start setup first")
    if not verify_totp(user, body.code):
        raise HTTPException(400, "That code didn't match. Check your authenticator app and try again")
    user.totp_enabled = True
    audit(db, request, "totp_enabled", user_id=user.id)
    db.commit()


@security_router.post("/totp/disable", status_code=204)
@limiter.limit("5/minute")
def totp_disable(request: Request, body: TotpDisableIn, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    _need_password(db, request, user, body.password)
    if not user.totp_enabled or not verify_totp(user, body.code):
        raise HTTPException(400, "Invalid verification code")
    user.totp_enabled, user.totp_secret_enc, user.totp_last_step = False, None, 0
    audit(db, request, "totp_disabled", user_id=user.id)
    db.commit()


@security_router.post("/pin", status_code=204)
@limiter.limit("5/minute")
def set_pin(request: Request, body: PinSetIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _need_password(db, request, user, body.password)
    if (problem := pin_problem(body.pin)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, problem)
    user.pin_hash = hash_pin(user.id, body.pin)
    user.pin_failed, user.pin_locked_until = 0, None
    audit(db, request, "pin_set", user_id=user.id)
    db.commit()