#backend/app/schemas.py
import re
from datetime import date as Date, datetime
from decimal import Decimal
from typing import Annotated, Literal, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

Money = Annotated[Decimal, Field(gt=Decimal("0"), max_digits=12, decimal_places=2)]
IFSC_RE = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")


def _clean(v: str) -> str:
    v = v.strip()
    if re.search(r"[<>&\"\x00-\x1f]", v):
        raise ValueError("Contains characters that are not allowed")
    return v


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        return _clean(v)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    otp: Optional[str] = Field(default=None, pattern=r"^\d{6}$")


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)


class PasswordConfirmIn(BaseModel):
    password: str = Field(max_length=128)


class TotpCodeIn(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class TotpDisableIn(BaseModel):
    password: str = Field(max_length=128)
    code: str = Field(pattern=r"^\d{6}$")


class PinSetIn(BaseModel):
    pin: str = Field(pattern=r"^\d{6}$")
    password: str = Field(max_length=128)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    wallet_no: str
    kyc_status: str
    totp_enabled: bool
    has_pin: bool
    created_at: datetime


class LimitsOut(BaseModel):
    per_txn: Decimal
    daily: Decimal
    daily_remaining: Decimal
    max_balance: Decimal


class WalletOut(BaseModel):
    wallet_no: str
    balance: Decimal
    currency: str
    status: str
    limits: LimitsOut


class LookupOut(BaseModel):
    wallet_no: str
    display_name: str


class TopUpIn(BaseModel):
    amount: Money
    idempotency_key: Optional[str] = Field(default=None, min_length=8, max_length=64)


class TransferIn(BaseModel):
    to: Optional[str] = Field(default=None, min_length=3, max_length=255)        # Wallet ID or phone number (never email)
    amount: Money
    note: Optional[str] = Field(default=None, max_length=140)
    pin: Optional[str] = Field(default=None, pattern=r"^\d{6}$")
    idempotency_key: Optional[str] = Field(default=None, min_length=8, max_length=64)

    @field_validator("note")
    @classmethod
    def _note(cls, v):
        return _clean(v) if v else None

    @model_validator(mode="after")
    def _need_recipient(self):
        if not self.to:
            raise ValueError("Enter who you want to pay (Wallet ID or phone number)")
        return self

    @property
    def recipient(self) -> str:
        return (self.to or "").strip()


class WithdrawIn(BaseModel):
    bank_id: int
    amount: Money
    pin: Optional[str] = Field(default=None, pattern=r"^\d{6}$")
    idempotency_key: Optional[str] = Field(default=None, min_length=8, max_length=64)


class BankLinkIn(BaseModel):
    holder_name: str = Field(min_length=2, max_length=100)
    bank_name: str = Field(min_length=2, max_length=100)
    ifsc: str
    account_no: str

    @field_validator("holder_name", "bank_name")
    @classmethod
    def _t(cls, v):
        return _clean(v)

    @field_validator("ifsc")
    @classmethod
    def _ifsc(cls, v):
        v = v.strip().upper()
        if not IFSC_RE.match(v):
            raise ValueError("Enter a valid 11-character IFSC code")
        return v

    @field_validator("account_no")
    @classmethod
    def _acct(cls, v):
        v = v.strip()
        if not re.fullmatch(r"\d{9,18}", v):
            raise ValueError("Account number must be 9 to 18 digits")
        return v


class IfscOut(BaseModel):
    ifsc: str
    bank: str
    branch: str = ""
    city: str = ""
    state: str = ""
    address: str = ""
    upi: bool = False
    imps: bool = False
    neft: bool = False
    rtgs: bool = False
    exact: bool = True   # False = only the bank name is known (lookup service was unreachable)


class BankTxnOut(BaseModel):
    date: Date
    description: str
    mode: str
    type: Literal["CR", "DR"]
    amount: Decimal
    balance_after: Decimal


class BankDetailsOut(BaseModel):
    demo: bool = True            # always True until a real partner is connected
    bank_name: str
    holder_name: str
    ifsc: str
    last4: str
    branch_info: Optional[IfscOut] = None
    balance: Decimal
    total_in: Decimal
    total_out: Decimal
    days: int
    as_of: datetime
    transactions: list[BankTxnOut]


class BankOut(BaseModel):
    id: int
    holder_name: str
    bank_name: str
    ifsc: str
    last4: str
    status: str
    created_at: datetime


class TransactionOut(BaseModel):
    id: str
    type: Literal["TOPUP", "TRANSFER", "WITHDRAWAL"]
    status: Literal["PENDING", "SUCCESS", "FAILED"]
    direction: Literal["in", "out"]
    amount: Decimal
    counterparty: Optional[str] = None
    counterparty_ref: Optional[str] = None
    note: Optional[str] = None
    reference: Optional[str] = None
    failure_reason: Optional[str] = None
    created_at: datetime