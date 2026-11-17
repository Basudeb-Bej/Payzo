# backend/app/routes_messages.py
import re
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from .database import get_db
from .models import Message, Transaction, User, UserProfile, utcnow
from .routes_wallet import _find_wallet
from .security import current_user, limiter

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _find_contact(db: Session, q: str):
    """Who a message is for. Unlike money, a message may be addressed by email as well as by Wallet ID or phone."""
    q = (q or "").strip()
    if "@" in q:
        u = db.query(User).options(joinedload(User.wallet)).filter(User.email == q.lower()).first()
        return u.wallet if u and u.is_active else None
    return _find_wallet(db, q)

# keep newlines and tabs, drop other control characters. (React escapes text when rendering, so < > & are safe)
_CTRL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


class MessageIn(BaseModel):
    to: str = Field(min_length=3, max_length=255)       # email, Wallet ID or phone number
    body: str = Field(min_length=1, max_length=500)

    @field_validator("body")
    @classmethod
    def _body(cls, v):
        v = _CTRL.sub("", v).strip()
        if not v:
            raise ValueError("Message can't be empty")
        return v


class ReadIn(BaseModel):
    contact: str = Field(min_length=3, max_length=255)  # email, Wallet ID or phone of the other person


class MessageOut(BaseModel):
    id: int
    direction: Literal["in", "out"]
    body: str
    counterparty: str | None
    counterparty_ref: str | None
    counterparty_avatar: str | None = None
    read: bool
    created_at: datetime


def _out(m: Message, me_id: int, avatar: str | None = None) -> MessageOut:
    out = m.sender_id == me_id
    other = m.recipient if out else m.sender
    return MessageOut(
        id=m.id,
        direction="out" if out else "in",
        body=m.body,
        counterparty=other.name,
        counterparty_ref=other.wallet.wallet_no if other.wallet else None,
        counterparty_avatar=avatar,
        read=out or m.read_at is not None,
        created_at=m.created_at,
    )


@router.get("", response_model=list[MessageOut])
def list_messages(limit: int = Query(300, ge=1, le=500), user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    rows = (
        db.query(Message)
        .options(joinedload(Message.sender).joinedload(User.wallet),
                 joinedload(Message.recipient).joinedload(User.wallet))
        .filter(or_(Message.sender_id == user.id, Message.recipient_id == user.id))
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(limit).all()
    )
    other_ids = {m.recipient_id if m.sender_id == user.id else m.sender_id for m in rows}
    avatars = (
        dict(
            db.query(UserProfile.user_id, UserProfile.avatar)
            .filter(UserProfile.user_id.in_(other_ids), UserProfile.avatar.is_not(None))
            .all()
        )
        if other_ids
        else {}
    )
    return [
        _out(m, user.id, avatars.get(m.recipient_id if m.sender_id == user.id else m.sender_id))
        for m in rows
    ]


@router.post("", response_model=MessageOut, status_code=201)
@limiter.limit("30/minute")
def send_message(request: Request, body: MessageIn, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    target = _find_contact(db, body.to)
    if not target or not target.user.is_active:
        raise HTTPException(404, "No user found for that email, Wallet ID or phone number")
    if target.user_id == user.id:
        raise HTTPException(400, "You can't message yourself")

    # Anti-spam: with someone you've never paid (or been paid by), you get ONE message until they reply.
    my_w = user.wallet.id
    paid_before = db.query(Transaction.id).filter(
        Transaction.type == "TRANSFER", Transaction.status == "SUCCESS",
        or_(and_(Transaction.from_wallet_id == my_w, Transaction.to_wallet_id == target.id),
            and_(Transaction.from_wallet_id == target.id, Transaction.to_wallet_id == my_w)),
    ).first()
    if not paid_before:
        they_wrote = db.query(Message.id).filter(
            Message.sender_id == target.user_id, Message.recipient_id == user.id).first()
        i_wrote = db.query(Message.id).filter(
            Message.sender_id == user.id, Message.recipient_id == target.user_id).first()
        if i_wrote and not they_wrote:
            raise HTTPException(403, "Wait for them to reply before sending more messages")

    m = Message(sender_id=user.id, recipient_id=target.user_id, body=body.body)
    db.add(m)
    db.commit()
    prof = db.get(UserProfile, target.user_id)
    return _out(m, user.id, prof.avatar if prof else None)


@router.post("/read", status_code=204)
def mark_read(body: ReadIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    target = _find_contact(db, body.contact)
    if not target:
        raise HTTPException(404, "No user found")
    db.query(Message).filter(
        Message.recipient_id == user.id, Message.sender_id == target.user_id, Message.read_at.is_(None),
    ).update({"read_at": utcnow()}, synchronize_session=False)
    db.commit()