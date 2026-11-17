#backend/app/routes_account.py
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .database import get_db
from .models import AuthSession, BankAccount, Invoice, Message, Transaction, User, UserProfile, utcnow
from .routes_auth import _need_password, user_out
from .routes_wallet import _lock
from .schemas import UserOut, _clean
from .security import audit, current_user, encrypt, hash_password, limiter, verify_totp

router = APIRouter(prefix="/api/account", tags=["account"])


class ProfileIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        return _clean(v)


class SessionOut(BaseModel):
    id: int
    ip: str | None
    user_agent: str | None
    created_at: str
    expires_at: str
    current: bool


class DeleteAccountIn(BaseModel):
    password: str = Field(max_length=128)
    otp: str | None = Field(default=None, pattern=r"^\d{6}$")
    confirm: str

    @field_validator("confirm")
    @classmethod
    def _confirm(cls, v):
        if v.strip().upper() != "DELETE":
            raise ValueError('Type "DELETE" to confirm')
        return v


# ---------------------------------------------------------------- profile
@router.post("/profile", response_model=UserOut)
@limiter.limit("10/minute")
def update_profile(request: Request, body: ProfileIn, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    old = user.name
    user.name = body.name
    audit(db, request, "profile_updated", user_id=user.id, old_name=old)
    db.commit()
    return user_out(user)


# ---------------------------------------------------------------- sessions
@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(AuthSession)
            .filter(AuthSession.user_id == user.id, AuthSession.revoked.is_(False),
                    AuthSession.expires_at > utcnow())
            .order_by(AuthSession.created_at.desc()).all())
    cur = request.state.session.id
    return [SessionOut(id=s.id, ip=s.ip, user_agent=s.user_agent,
                       created_at=s.created_at.isoformat(), expires_at=s.expires_at.isoformat(),
                       current=s.id == cur) for s in rows]


@router.delete("/sessions/{session_id}", status_code=204)
def revoke_session(session_id: int, request: Request, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    if session_id == request.state.session.id:
        raise HTTPException(400, "Use Sign out to end this session")
    sess = db.query(AuthSession).filter(AuthSession.id == session_id, AuthSession.user_id == user.id).first()
    if not sess:
        raise HTTPException(404, "Session not found")
    sess.revoked = True
    audit(db, request, "session_revoked", user_id=user.id, session_id=session_id)
    db.commit()


# ---------------------------------------------------------------- delete account
@router.post("/delete", status_code=204)
@limiter.limit("3/hour")
def delete_account(request: Request, body: DeleteAccountIn, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    """Closes the account and anonymises the person. Transactions and ledger rows are KEPT
    (money records must not disappear), but they no longer point to a real name or email."""
    _need_password(db, request, user, body.password)
    if user.totp_enabled and not (body.otp and verify_totp(user, body.otp)):
        db.commit()  # saves totp_last_step / nothing else
        raise HTTPException(400, "Invalid verification code")

    wallet = _lock(db, [user.wallet.id])[user.wallet.id]
    if wallet.balance > 0:
        raise HTTPException(400, "Withdraw or transfer your remaining balance before deleting your account")
    pending = (db.query(Transaction.id)
               .filter(or_(Transaction.from_wallet_id == wallet.id, Transaction.to_wallet_id == wallet.id),
                       Transaction.status == "PENDING").first())
    if pending:
        raise HTTPException(400, "You have a payment in progress. Try again once it completes")

    user_id = user.id
    user.is_active = False
    user.name = "Deleted user"
    user.email = f"deleted-{user_id}@deleted.invalid"
    user.password_hash = hash_password(secrets.token_urlsafe(32))   # unusable
    user.totp_enabled, user.totp_secret_enc, user.totp_last_step = False, None, 0
    user.pin_hash, user.pin_failed, user.pin_locked_until = None, 0, None
    wallet.status = "CLOSED"

    for b in db.query(BankAccount).filter(BankAccount.user_id == user_id).all():
        b.is_active = False
        b.account_no_enc = encrypt("deleted")
        b.holder_name = "Deleted"
    db.query(AuthSession).filter(AuthSession.user_id == user_id).update({"revoked": True})

    db.query(Message).filter(or_(Message.sender_id == user_id, Message.recipient_id == user_id)).delete(synchronize_session=False)

    db.query(Invoice).filter(
        Invoice.status == "PENDING", or_(Invoice.issuer_id == user_id, Invoice.payer_id == user_id)
    ).update({"status": "CANCELLED"}, synchronize_session=False)

    db.query(UserProfile).filter(UserProfile.user_id == user_id).delete(synchronize_session=False)

    audit(db, request, "account_deleted", user_id=user_id)
    db.commit()