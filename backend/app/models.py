#backend/app/models.py
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    JSON, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer,
    Numeric, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def utcnow() -> datetime:
    """Naive UTC – every timestamp in the DB is UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def new_id() -> str:
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    kyc_status: Mapped[str] = mapped_column(String(20), default="NOT_STARTED")  # NOT_STARTED|PENDING|VERIFIED|REJECTED

    totp_secret_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    totp_last_step: Mapped[int] = mapped_column(Integer, default=0)

    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pin_failed: Mapped[int] = mapped_column(Integer, default=0)
    pin_locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    wallet: Mapped["Wallet"] = relationship(back_populates="user", uselist=False)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jti: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = (CheckConstraint("balance >= 0", name="ck_wallet_balance_nonneg"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    wallet_no: Mapped[str] = mapped_column(String(16), unique=True, index=True)  # public ID, e.g. PZ0123456789
    balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    status: Mapped[str] = mapped_column(String(10), default="ACTIVE")  # ACTIVE|FROZEN|CLOSED

    user: Mapped[User] = relationship(back_populates="wallet")


class BankAccount(Base):
    __tablename__ = "bank_accounts"
    __table_args__ = (UniqueConstraint("user_id", "fingerprint", name="uq_bank_user_fingerprint"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    holder_name: Mapped[str] = mapped_column(String(100))
    bank_name: Mapped[str] = mapped_column(String(100))
    ifsc: Mapped[str] = mapped_column(String(11))
    account_no_enc: Mapped[str] = mapped_column(Text)       # encrypted at rest
    last4: Mapped[str] = mapped_column(String(4))
    fingerprint: Mapped[str] = mapped_column(String(64))    # sha256(ifsc:account) – duplicate detection
    status: Mapped[str] = mapped_column(String(10), default="PENDING")  # PENDING|VERIFIED|FAILED
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    provider_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(32), unique=True, default=new_id)
    type: Mapped[str] = mapped_column(String(12))        # TOPUP | TRANSFER | WITHDRAWAL
    status: Mapped[str] = mapped_column(String(10))      # PENDING | SUCCESS | FAILED
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    from_wallet_id: Mapped[int | None] = mapped_column(ForeignKey("wallets.id"), nullable=True)
    to_wallet_id: Mapped[int | None] = mapped_column(ForeignKey("wallets.id"), nullable=True)
    bank_account_id: Mapped[int | None] = mapped_column(ForeignKey("bank_accounts.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String(140), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    provider_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    from_wallet: Mapped[Wallet | None] = relationship(foreign_keys=[from_wallet_id])
    to_wallet: Mapped[Wallet | None] = relationship(foreign_keys=[to_wallet_id])
    bank_account: Mapped[BankAccount | None] = relationship()

    __table_args__ = (
        Index("ix_tx_from_created", "from_wallet_id", "created_at"),
        Index("ix_tx_to_created", "to_wallet_id", "created_at"),
    )


class LedgerEntry(Base):
    """Append-only record of every balance change. Never updated or deleted."""
    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    transaction_id: Mapped[int] = mapped_column(ForeignKey("transactions.id"), index=True)
    wallet_id: Mapped[int] = mapped_column(ForeignKey("wallets.id"), index=True)
    direction: Mapped[str] = mapped_column(String(6))   # DEBIT | CREDIT
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    balance_after: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    action: Mapped[str] = mapped_column(String(50), index=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_msg_pair_created", "sender_id", "recipient_id", "created_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    sender: Mapped[User] = relationship(foreign_keys=[sender_id])
    recipient: Mapped[User] = relationship(foreign_keys=[recipient_id])


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_invoice_amount_pos"),
        Index("ix_inv_issuer_created", "issuer_id", "created_at"),
        Index("ix_inv_payer_created", "payer_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[str] = mapped_column(String(20), unique=True)
    issuer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    payer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    items: Mapped[list] = mapped_column(JSON)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="PENDING")  # PENDING|PAID|CANCELLED|DECLINED
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    transaction_id: Mapped[int | None] = mapped_column(ForeignKey("transactions.id"), nullable=True)

    issuer: Mapped[User] = relationship(foreign_keys=[issuer_id])
    payer: Mapped[User] = relationship(foreign_keys=[payer_id])
    transaction: Mapped[Transaction | None] = relationship()


class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    # Stored normalized (+919876543210). Unique, so one phone number = one account.
    # NULLs are allowed many times, so users without a phone are unaffected.
    phone: Mapped[str | None] = mapped_column(String(25), nullable=True, unique=True, index=True)
    # If false, nobody can find this user by phone number (Wallet ID still works).
    phone_discoverable: Mapped[bool] = mapped_column(Boolean, default=True)
    address_line1: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(120), nullable=True)
    city: Mapped[str | None] = mapped_column(String(60), nullable=True)
    state: Mapped[str | None] = mapped_column(String(60), nullable=True)
    pincode: Mapped[str | None] = mapped_column(String(10), nullable=True)
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)