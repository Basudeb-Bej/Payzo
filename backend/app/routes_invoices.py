#backend/app/routes_invoices.py
"""Invoices: a Payzo user bills another Payzo user, who can pay it straight from their wallet."""
import re
import secrets
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from .database import get_db
from .models import Invoice, Transaction, User, Wallet, utcnow
from .routes_wallet import _find_wallet, _reject_email, do_transfer
#from .schemas import Money
from .security import audit, check_pin, current_user, limiter
from typing import Annotated, Literal
from pydantic import BaseModel, Field, field_validator

Money = Annotated[Decimal, Field(gt=Decimal("0"), max_digits=12, decimal_places=2)]

router = APIRouter(prefix="/api/invoices", tags=["invoices"])

MAX_TOTAL = Decimal("10000000")   # ₹1 crore per invoice
_CTRL = re.compile(r"[\x00-\x1f\x7f]")


def _today() -> date:
    """Today's date in India (invoices are INR)."""
    return (utcnow() + timedelta(hours=5, minutes=30)).date()


def _text(v: str) -> str:
    v = _CTRL.sub(" ", v).strip()
    if not v:
        raise ValueError("This can't be empty")
    return v


# ------------------------------------------------------------------ schemas
class ItemIn(BaseModel):
    description: str = Field(min_length=1, max_length=100)
    qty: int = Field(ge=1, le=9999)
    unit_price: Money

    @field_validator("description")
    @classmethod
    def _d(cls, v):
        return _text(v)


class InvoiceIn(BaseModel):
    to: str = Field(min_length=3, max_length=255)               # Wallet ID or phone number of who should pay
    items: list[ItemIn] = Field(min_length=1, max_length=20)
    due_date: date | None = None
    note: str | None = Field(default=None, max_length=255)

    @field_validator("note")
    @classmethod
    def _n(cls, v):
        return _text(v) if v and v.strip() else None


class PayIn(BaseModel):
    pin: str | None = Field(default=None, pattern=r"^\d{6}$")


class InvoiceOut(BaseModel):
    id: int
    number: str
    direction: Literal["issued", "received"]     # from the point of view of the caller
    status: Literal["PENDING", "PAID", "CANCELLED", "DECLINED"]
    overdue: bool
    amount: Decimal
    items: list[dict]
    note: str | None
    due_date: date | None
    created_at: datetime
    paid_at: datetime | None
    counterparty: str | None
    counterparty_ref: str | None
    transaction_ref: str | None


def _out(inv: Invoice, me_id: int) -> InvoiceOut:
    issued = inv.issuer_id == me_id
    other = inv.payer if issued else inv.issuer
    return InvoiceOut(
        id=inv.id, number=inv.number, direction="issued" if issued else "received", status=inv.status,
        overdue=inv.status == "PENDING" and inv.due_date is not None and inv.due_date < _today(),
        amount=inv.amount, items=inv.items, note=inv.note, due_date=inv.due_date,
        created_at=inv.created_at, paid_at=inv.paid_at,
        counterparty=other.name, counterparty_ref=other.wallet.wallet_no if other.wallet else None,
        transaction_ref=inv.transaction.public_id if inv.transaction else None,
    )


# ------------------------------------------------------------------ endpoints
@router.get("", response_model=list[InvoiceOut])
def list_invoices(limit: int = Query(200, ge=1, le=500), user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    rows = (
        db.query(Invoice)
        .options(joinedload(Invoice.issuer).joinedload(User.wallet),
                 joinedload(Invoice.payer).joinedload(User.wallet),
                 joinedload(Invoice.transaction))
        .filter(or_(Invoice.issuer_id == user.id, Invoice.payer_id == user.id))
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
        .limit(limit).all()
    )
    return [_out(i, user.id) for i in rows]


@router.post("", response_model=InvoiceOut, status_code=201)
@limiter.limit("20/minute")
def create_invoice(request: Request, body: InvoiceIn, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    _reject_email(body.to)
    target = _find_wallet(db, body.to)
    if not target or not target.user.is_active:
        raise HTTPException(404, "No user found for that Wallet ID or phone number")
    if target.user_id == user.id:
        raise HTTPException(400, "You can't invoice yourself")
    if body.due_date and body.due_date < _today():
        raise HTTPException(422, "The due date can't be in the past")

    total = sum((i.unit_price * i.qty for i in body.items), Decimal("0")).quantize(Decimal("0.01"))
    if total > MAX_TOTAL:
        raise HTTPException(400, "The invoice total is too large")

    # Anti-spam / anti-phishing: limit unpaid invoices per person, and be stricter with strangers.
    unpaid = db.query(Invoice.id).filter(
        Invoice.issuer_id == user.id, Invoice.payer_id == target.user_id, Invoice.status == "PENDING").count()
    if unpaid >= 5:
        raise HTTPException(400, "You already have 5 unpaid invoices for this person")
    my_w = user.wallet.id
    paid_before = db.query(Transaction.id).filter(
        Transaction.type == "TRANSFER", Transaction.status == "SUCCESS",
        or_(and_(Transaction.from_wallet_id == my_w, Transaction.to_wallet_id == target.id),
            and_(Transaction.from_wallet_id == target.id, Transaction.to_wallet_id == my_w)),
    ).first()
    if not paid_before and unpaid >= 1:
        raise HTTPException(403, "Wait until your earlier invoice is paid or declined before sending another")

    inv = Invoice(
        number="INV-" + secrets.token_hex(4).upper(),
        issuer_id=user.id, payer_id=target.user_id, amount=total, note=body.note, due_date=body.due_date,
        items=[{"description": i.description, "qty": i.qty, "unit_price": str(i.unit_price)} for i in body.items],
    )
    db.add(inv)
    audit(db, request, "invoice_created", user_id=user.id, invoice=inv.number, amount=str(total))
    db.commit()
    return _out(inv, user.id)


@router.post("/{invoice_id}/pay", response_model=InvoiceOut)
@limiter.limit("20/minute")
def pay_invoice(request: Request, invoice_id: int, body: PayIn, user: User = Depends(current_user),
                db: Session = Depends(get_db)):
    inv = (db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.payer_id == user.id)
           .with_for_update().first())
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status == "PAID":
        return _out(inv, user.id)                     # already paid: nothing more to do
    if inv.status != "PENDING":
        raise HTTPException(400, f"This invoice is {inv.status.lower()}")

    check_pin(db, request, user, body.pin)
    issuer_wallet = (db.query(Wallet).options(joinedload(Wallet.user))
                     .filter(Wallet.user_id == inv.issuer_id).first())
    if not issuer_wallet or not issuer_wallet.user.is_active:
        raise HTTPException(400, "The sender can no longer receive payments")

    # Fixed idempotency key: a double click or a retry can never charge the invoice twice.
    tx = do_transfer(db, user, issuer_wallet, inv.amount, f"Invoice {inv.number}", f"inv-{inv.id}")

    inv.status, inv.paid_at, inv.transaction_id = "PAID", utcnow(), tx.id
    audit(db, request, "invoice_paid", user_id=user.id, invoice=inv.number, tx=tx.public_id)
    db.commit()
    return _out(inv, user.id)


def _close(db: Session, request: Request, invoice_id: int, user: User, *, as_issuer: bool,
           new_status: str, action: str) -> Invoice:
    col = Invoice.issuer_id if as_issuer else Invoice.payer_id
    inv = db.query(Invoice).filter(Invoice.id == invoice_id, col == user.id).with_for_update().first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.status != "PENDING":
        raise HTTPException(400, f"This invoice is already {inv.status.lower()}")
    inv.status = new_status
    audit(db, request, action, user_id=user.id, invoice=inv.number)
    db.commit()
    return inv


@router.post("/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_invoice(request: Request, invoice_id: int, user: User = Depends(current_user),
                   db: Session = Depends(get_db)):
    inv = _close(db, request, invoice_id, user, as_issuer=True, new_status="CANCELLED", action="invoice_cancelled")
    return _out(inv, user.id)


@router.post("/{invoice_id}/decline", response_model=InvoiceOut)
def decline_invoice(request: Request, invoice_id: int, user: User = Depends(current_user),
                    db: Session = Depends(get_db)):
    inv = _close(db, request, invoice_id, user, as_issuer=False, new_status="DECLINED", action="invoice_declined")
    return _out(inv, user.id)