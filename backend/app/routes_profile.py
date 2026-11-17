#backend/app/routes_profile.py
"""Personal details (phone, address) and profile photo. Private to the signed-in user."""
import base64
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import get_db
from .models import User, UserProfile
from .recipients import normalize_phone
from .security import audit, current_user, limiter

router = APIRouter(prefix="/api/profile", tags=["profile"])

_CTRL = re.compile(r"[\x00-\x1f\x7f]")
_POSTAL = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 \-]{2,9}$")   # international postal / PIN codes
_DATA_URL = re.compile(r"^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$")
MAX_AVATAR_CHARS = 60_000          # fits a TEXT column; the browser shrinks photos to ~256px before upload

PHONE_TAKEN = "That phone number is already linked to another account"


def _clean(v: str | None) -> str | None:
    if v is None:
        return None
    v = _CTRL.sub(" ", v).strip()
    return v or None


# ------------------------------------------------------------------ schemas
class DetailsIn(BaseModel):
    phone: str | None = Field(default=None, max_length=25)
    phone_discoverable: bool = True
    address_line1: str | None = Field(default=None, max_length=120)
    address_line2: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=60)
    state: str | None = Field(default=None, max_length=60)
    pincode: str | None = Field(default=None, max_length=10)

    @field_validator("address_line1", "address_line2", "city", "state")
    @classmethod
    def _text(cls, v):
        return _clean(v)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v):
        v = _clean(v)
        if v is None:
            return None
        # Stored in one canonical form (e.g. +919876543210) so lookups and the
        # unique index treat "98765 43210" and "+91 9876543210" as the same number.
        return normalize_phone(v)

    @field_validator("pincode")
    @classmethod
    def _pin(cls, v):
        v = _clean(v)
        if v is None:
            return None
        if not _POSTAL.match(v):
            raise ValueError("Invalid postal code")
        return v


class AvatarIn(BaseModel):
    image: str = Field(max_length=MAX_AVATAR_CHARS + 100)


class DetailsOut(BaseModel):
    phone: str | None = None
    phone_discoverable: bool = True
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    avatar: str | None = None


def _out(p: UserProfile | None) -> DetailsOut:
    if not p:
        return DetailsOut()
    return DetailsOut(
        phone=p.phone,
        phone_discoverable=True if p.phone_discoverable is None else p.phone_discoverable,
        address_line1=p.address_line1, address_line2=p.address_line2,
        city=p.city, state=p.state, pincode=p.pincode, avatar=p.avatar,
    )


def _get_or_create(db: Session, user: User) -> UserProfile:
    p = db.get(UserProfile, user.id)
    if not p:
        p = UserProfile(user_id=user.id)
        db.add(p)
    return p


def _looks_like_image(kind: str, raw: bytes) -> bool:
    """Check the real file signature, not just the label in the data URL."""
    if kind == "jpeg":
        return raw[:3] == b"\xff\xd8\xff"
    if kind == "png":
        return raw[:8] == b"\x89PNG\r\n\x1a\n"
    if kind == "webp":
        return raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"
    return False


# ------------------------------------------------------------------ endpoints
@router.get("", response_model=DetailsOut)
def get_details(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _out(db.get(UserProfile, user.id))


@router.post("", response_model=DetailsOut)
@limiter.limit("20/minute")
def save_details(request: Request, body: DetailsIn, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    # Friendly early check; the unique index below is the real guarantee against races.
    if body.phone:
        taken = (db.query(UserProfile.user_id)
                 .filter(UserProfile.phone == body.phone, UserProfile.user_id != user.id)
                 .first())
        if taken:
            raise HTTPException(409, PHONE_TAKEN)

    p = _get_or_create(db, user)
    p.phone, p.address_line1, p.address_line2 = body.phone, body.address_line1, body.address_line2
    p.city, p.state, p.pincode = body.city, body.state, body.pincode
    p.phone_discoverable = body.phone_discoverable
    audit(db, request, "profile_details_updated", user_id=user.id)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, PHONE_TAKEN)
    return _out(p)


@router.post("/avatar", response_model=DetailsOut)
@limiter.limit("10/minute")
def set_avatar(request: Request, body: AvatarIn, user: User = Depends(current_user),
               db: Session = Depends(get_db)):
    if len(body.image) > MAX_AVATAR_CHARS:
        raise HTTPException(413, "That photo is too large. Try a smaller image")
    m = _DATA_URL.match(body.image)                     # raster images only: never SVG (script risk)
    if not m:
        raise HTTPException(422, "Upload a JPG, PNG or WebP image")
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except Exception:
        raise HTTPException(422, "That image couldn't be read")
    if not _looks_like_image(m.group(1), raw):
        raise HTTPException(422, "That file isn't a valid image")

    p = _get_or_create(db, user)
    p.avatar = body.image
    audit(db, request, "avatar_set", user_id=user.id)
    db.commit()
    return _out(p)


@router.delete("/avatar", response_model=DetailsOut)
def remove_avatar(request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.get(UserProfile, user.id)
    if p and p.avatar:
        p.avatar = None
        audit(db, request, "avatar_removed", user_id=user.id)
        db.commit()
    return _out(p)