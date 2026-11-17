#backend/app/routes_wallet.py
import hashlib
import logging
import re
import secrets
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from .database import get_db, settings
from .models import BankAccount, LedgerEntry, Transaction, User, UserProfile, Wallet, utcnow
from .bank_demo import demo_statement
from .ifsc import IfscUnavailable, fallback_from_prefix, lookup_ifsc
from .recipients import normalize_phone
from .schemas import (
    IFSC_RE, BankDetailsOut, BankLinkIn, BankOut, IfscOut, LimitsOut, LookupOut, TopUpIn, TransactionOut, TransferIn, WalletOut, WithdrawIn,
)
from .security import audit, check_pin, current_user, decrypt, encrypt, limiter

log = logging.getLogger("payzo.money")

router = APIRouter(prefix="/api/wallet", tags=["wallet"])
bank_router = APIRouter(prefix="/api/banks", tags=["banks"])
dev_router = APIRouter(prefix="/api/dev", tags=["dev (sandbox only)"])

_WALLET_NO = re.compile(r"^PZ\d{6,14}$", re.I)
NOT_FOUND = "No wallet found for that Wallet ID or phone number"
EMAIL_NOT_ALLOWED = "Email can't be used to send or receive money. Use a Wallet ID or phone number."


def _reject_email(q: str | None) -> None:
    """Money is only ever addressed by Wallet ID or phone number. Email is for login and messages."""
    if "@" in (q or ""):
        raise HTTPException(400, EMAIL_NOT_ALLOWED)


# =====================================================================================
# 1. PAYMENT PROVIDER  (the ONLY place real money enters or leaves the system)
# =====================================================================================
@dataclass
class ProviderResult:
    status: str                      # "SUCCESS" | "PENDING" | "FAILED"
    reference: str | None = None
    reason: str | None = None


class PaymentProvider(ABC):
    """Implement this with your RBI-authorised / licensed partner, then set PAYMENT_PROVIDER."""

    @abstractmethod
    def verify_bank_account(self, *, holder_name: str, account_no: str, ifsc: str) -> ProviderResult: ...

    @abstractmethod
    def collect_funds(self, *, amount: Decimal, user_ref: str, idempotency_key: str) -> ProviderResult: ...

    @abstractmethod
    def payout_to_bank(self, *, amount: Decimal, account_no: str, ifsc: str,
                       holder_name: str, idempotency_key: str) -> ProviderResult: ...


class SandboxProvider(PaymentProvider):
    """Pretend provider for development. NO REAL MONEY MOVES.
    Test hooks: a bank account ending 0000 fails verification; ending 9999 fails payouts."""

    def _ref(self) -> str:
        return "sbx_" + uuid.uuid4().hex[:16]

    def verify_bank_account(self, *, holder_name, account_no, ifsc):
        if account_no.endswith("0000"):
            return ProviderResult("FAILED", self._ref(), "Account could not be verified")
        return ProviderResult("SUCCESS", self._ref())

    def collect_funds(self, *, amount, user_ref, idempotency_key):
        return ProviderResult("SUCCESS", self._ref())

    def payout_to_bank(self, *, amount, account_no, ifsc, holder_name, idempotency_key):
        if account_no.endswith("9999"):
            return ProviderResult("FAILED", self._ref(), "Bank rejected the transfer")
        return ProviderResult("SUCCESS", self._ref())


_provider: PaymentProvider | None = None


def get_provider() -> PaymentProvider:
    global _provider
    if _provider is None:
        if settings.PAYMENT_PROVIDER == "sandbox":
            _provider = SandboxProvider()
        else:
            # Add your licensed partner here, e.g.  elif settings.PAYMENT_PROVIDER == "mypartner": ...
            raise RuntimeError(f"Unknown PAYMENT_PROVIDER '{settings.PAYMENT_PROVIDER}'")
    return _provider


# =====================================================================================
# 2. MONEY RULES  (all balance changes happen here)
#    * amounts are Decimal; a balance never changes without a LedgerEntry
#    * wallets are locked (SELECT ... FOR UPDATE) in id order before any change
#    * a request that carries an idempotency key can never be charged twice
# =====================================================================================
def fmt(v) -> str:
    return f"₹{Decimal(v):,.2f}"


def limits_for(user: User) -> dict:
    return settings.LIMITS["verified" if user.kyc_status == "VERIFIED" else "basic"]


def generate_wallet_no(db: Session) -> str:
    for _ in range(10):
        no = "PZ" + "".join(secrets.choice("0123456789") for _ in range(10))
        if not db.query(Wallet.id).filter(Wallet.wallet_no == no).first():
            return no
    raise RuntimeError("Could not allocate a wallet number")


def daily_out(db: Session, wallet_id: int) -> Decimal:
    start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(
            Transaction.from_wallet_id == wallet_id,
            Transaction.type.in_(("TRANSFER", "WITHDRAWAL")),
            Transaction.status.in_(("SUCCESS", "PENDING")),
            Transaction.created_at >= start,
        )
        .scalar()
    )
    return Decimal(str(total))


def _check_out_limits(db, user, wallet, amount):
    lim = limits_for(user)
    if amount > lim["per_txn"]:
        raise HTTPException(400, f"The limit per transaction is {fmt(lim['per_txn'])}")
    if daily_out(db, wallet.id) + amount > lim["daily"]:
        raise HTTPException(400, f"This would exceed your daily limit of {fmt(lim['daily'])}")


def _check_in_limit(user, wallet, amount, who="Your"):
    if wallet.balance + amount > limits_for(user)["max_balance"]:
        raise HTTPException(400, f"{who} wallet balance limit would be exceeded")


def _lock(db: Session, ids: list[int]) -> dict[int, Wallet]:
    rows = db.query(Wallet).filter(Wallet.id.in_(sorted(set(ids)))).order_by(Wallet.id).with_for_update().all()
    return {w.id: w for w in rows}


def _leg(db: Session, tx: Transaction, wallet: Wallet, direction: str, amount: Decimal) -> None:
    if direction == "DEBIT":
        if wallet.balance < amount:
            raise HTTPException(400, "Insufficient balance")
        wallet.balance -= amount
    else:
        wallet.balance += amount
    db.add(LedgerEntry(transaction_id=tx.id, wallet_id=wallet.id, direction=direction,
                       amount=amount, balance_after=wallet.balance))


def _ikey(user: User, key: str | None) -> str | None:
    return f"{user.id}:{key}" if key else None


def _existing(db: Session, user: User, key: str | None) -> Transaction | None:
    k = _ikey(user, key)
    return db.query(Transaction).filter(Transaction.idempotency_key == k).first() if k else None


def _active(wallet: Wallet) -> None:
    if wallet.status != "ACTIVE":
        raise HTTPException(403, "This wallet is currently restricted. Please contact support")


def do_topup(db: Session, user: User, amount: Decimal, key: str | None) -> Transaction:
    if (ex := _existing(db, user, key)):
        return ex
    wallet = user.wallet
    _active(wallet)
    _check_in_limit(user, wallet, amount)

    tx = Transaction(type="TOPUP", status="PENDING", amount=amount, to_wallet_id=wallet.id,
                     idempotency_key=_ikey(user, key), note="Add money")
    db.add(tx)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if (ex := _existing(db, user, key)):
            return ex
        raise

    try:
        res = get_provider().collect_funds(amount=amount, user_ref=wallet.wallet_no,
                                           idempotency_key=tx.idempotency_key or tx.public_id)
    except Exception:
        log.exception("collect_funds failed tx=%s", tx.public_id)
        tx.failure_reason = "Payment status unknown. We are checking with the bank"
        db.commit()
        return tx  # stays PENDING until reconciled

    tx.provider_ref = res.reference
    if res.status == "SUCCESS":
        w = _lock(db, [wallet.id])[wallet.id]
        _leg(db, tx, w, "CREDIT", amount)
        tx.status = "SUCCESS"
    elif res.status == "FAILED":
        tx.status, tx.failure_reason = "FAILED", res.reason or "Payment failed"
    db.commit()
    return tx


def do_transfer(db: Session, sender: User, recipient_wallet: Wallet, amount: Decimal,
                note: str | None, key: str | None) -> Transaction:
    if (ex := _existing(db, sender, key)):
        return ex
    if recipient_wallet.id == sender.wallet.id:
        raise HTTPException(400, "You can't send money to yourself")

    locked = _lock(db, [sender.wallet.id, recipient_wallet.id])
    s_w, r_w = locked[sender.wallet.id], locked[recipient_wallet.id]
    _active(s_w)
    if r_w.status != "ACTIVE":
        raise HTTPException(400, "The recipient can't receive payments right now")
    _check_out_limits(db, sender, s_w, amount)
    _check_in_limit(r_w.user, r_w, amount, who="The recipient's")

    tx = Transaction(type="TRANSFER", status="SUCCESS", amount=amount, from_wallet_id=s_w.id,
                     to_wallet_id=r_w.id, note=note, idempotency_key=_ikey(sender, key))
    db.add(tx)
    db.flush()
    _leg(db, tx, s_w, "DEBIT", amount)
    _leg(db, tx, r_w, "CREDIT", amount)
    try:
        db.commit()
    except IntegrityError:  # an identical request raced us: return the winner
        db.rollback()
        if (ex := _existing(db, sender, key)):
            return ex
        raise
    return tx


def do_withdraw(db: Session, user: User, bank: BankAccount, amount: Decimal, key: str | None) -> Transaction:
    if (ex := _existing(db, user, key)):
        return ex
    if bank.user_id != user.id or not bank.is_active or bank.status != "VERIFIED":
        raise HTTPException(400, "Choose a verified bank account")

    w = _lock(db, [user.wallet.id])[user.wallet.id]
    _active(w)
    _check_out_limits(db, user, w, amount)

    tx = Transaction(type="WITHDRAWAL", status="PENDING", amount=amount, from_wallet_id=w.id,
                     bank_account_id=bank.id, idempotency_key=_ikey(user, key))
    db.add(tx)
    db.flush()
    _leg(db, tx, w, "DEBIT", amount)       # the money is held straight away
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if (ex := _existing(db, user, key)):
            return ex
        raise

    try:
        res = get_provider().payout_to_bank(
            amount=amount, account_no=decrypt(bank.account_no_enc), ifsc=bank.ifsc,
            holder_name=bank.holder_name, idempotency_key=tx.idempotency_key or tx.public_id)
    except Exception:
        # Outcome unknown: keep the money held and the payment PENDING. Reconcile before refunding.
        log.exception("payout failed tx=%s", tx.public_id)
        tx.failure_reason = "Bank transfer status unknown. We are checking"
        db.commit()
        return tx

    tx.provider_ref = res.reference
    if res.status == "SUCCESS":
        tx.status = "SUCCESS"
    elif res.status == "FAILED":
        w = _lock(db, [user.wallet.id])[user.wallet.id]
        _leg(db, tx, w, "CREDIT", amount)  # reversal: the money goes straight back
        tx.status, tx.failure_reason = "FAILED", res.reason or "Bank transfer failed"
    db.commit()
    return tx


# =====================================================================================
# 3. ENDPOINTS
# =====================================================================================
def mask_name(name: str) -> str:
    parts = name.split()
    return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[-1][0]}."


def _tx_out(tx: Transaction, my_wallet_id: int) -> TransactionOut:
    outgoing = tx.from_wallet_id == my_wallet_id
    name = ref = None
    if tx.type == "TRANSFER":
        other = tx.to_wallet if outgoing else tx.from_wallet
        if other:
            name, ref = other.user.name, other.wallet_no
    elif tx.type == "WITHDRAWAL" and tx.bank_account:
        name, ref = tx.bank_account.bank_name, f"••{tx.bank_account.last4}"
    return TransactionOut(
        id=tx.public_id, type=tx.type, status=tx.status, direction="out" if outgoing else "in",
        amount=tx.amount, counterparty=name, counterparty_ref=ref, note=tx.note,
        reference=tx.provider_ref, failure_reason=tx.failure_reason,
        created_at=tx.created_at,   # UTC without a "Z" suffix (the existing Dashboard appends "Z")
    )


def _wallet_out(db: Session, user: User) -> WalletOut:
    lim, w = limits_for(user), user.wallet
    used = daily_out(db, w.id)
    return WalletOut(
        wallet_no=w.wallet_no, balance=w.balance, currency=w.currency, status=w.status,
        limits=LimitsOut(per_txn=lim["per_txn"], daily=lim["daily"],
                         daily_remaining=max(Decimal("0"), lim["daily"] - used), max_balance=lim["max_balance"]),
    )


def _find_wallet(db: Session, q: str) -> Wallet | None:
    """Resolve a Wallet ID (PZ…) or a phone number to a wallet. Email is not accepted."""
    q = (q or "").strip()
    query = db.query(Wallet).options(joinedload(Wallet.user))
    if _WALLET_NO.match(q):
        return query.filter(Wallet.wallet_no == q.upper()).first()
    try:
        phone = normalize_phone(q)
    except ValueError:
        return None
    return (query.join(User, Wallet.user_id == User.id)
            .join(UserProfile, UserProfile.user_id == User.id)
            .filter(UserProfile.phone == phone, UserProfile.phone_discoverable.is_(True))
            .first())


@router.get("", response_model=WalletOut)
def get_wallet(user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.refresh(user.wallet)
    return _wallet_out(db, user)


@router.get("/lookup", response_model=LookupOut)
@limiter.limit("30/minute")
def lookup(request: Request, q: str = Query(min_length=3, max_length=255), user: User = Depends(current_user),
           db: Session = Depends(get_db)):
    """Confirm who you are paying before you pay. Only a masked name is revealed."""
    _reject_email(q)
    w = _find_wallet(db, q)
    if not w or not w.user.is_active or w.status != "ACTIVE" or w.id == user.wallet.id:
        raise HTTPException(404, NOT_FOUND)
    return LookupOut(wallet_no=w.wallet_no, display_name=mask_name(w.user.name))


@router.post("/topup", response_model=TransactionOut, status_code=201)
@limiter.limit("20/minute")
def topup(request: Request, body: TopUpIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    tx = do_topup(db, user, body.amount, body.idempotency_key)
    audit(db, request, "topup", user_id=user.id, tx=tx.public_id, status=tx.status)
    db.commit()
    return _tx_out(tx, user.wallet.id)


@router.post("/transfer", response_model=TransactionOut, status_code=201)
@limiter.limit("20/minute")
def transfer(request: Request, body: TransferIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _reject_email(body.recipient)          # before the PIN check, so a wrong format never costs a PIN attempt
    check_pin(db, request, user, body.pin)
    target = _find_wallet(db, body.recipient)
    if not target:
        raise HTTPException(404, NOT_FOUND)
    tx = do_transfer(db, user, target, body.amount, body.note, body.idempotency_key)
    audit(db, request, "transfer", user_id=user.id, tx=tx.public_id, amount=str(tx.amount))
    db.commit()
    return _tx_out(tx, user.wallet.id)


@router.post("/withdraw", response_model=TransactionOut, status_code=201)
@limiter.limit("10/minute")
def withdraw(request: Request, body: WithdrawIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    check_pin(db, request, user, body.pin)
    bank = db.get(BankAccount, body.bank_id)
    if not bank or bank.user_id != user.id:
        raise HTTPException(404, "Bank account not found")
    tx = do_withdraw(db, user, bank, body.amount, body.idempotency_key)
    audit(db, request, "withdraw", user_id=user.id, tx=tx.public_id, status=tx.status)
    db.commit()
    return _tx_out(tx, user.wallet.id)


@router.get("/transactions", response_model=list[TransactionOut])
def history(
    kind: str = Query("all", pattern="^(all|sent|received|added|withdrawn)$"),
    limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
    user: User = Depends(current_user), db: Session = Depends(get_db),
):
    wid = user.wallet.id
    q = db.query(Transaction).options(
        joinedload(Transaction.from_wallet).joinedload(Wallet.user),
        joinedload(Transaction.to_wallet).joinedload(Wallet.user),
        joinedload(Transaction.bank_account),
    ).filter(or_(Transaction.from_wallet_id == wid, Transaction.to_wallet_id == wid))
    if kind == "sent":
        q = q.filter(Transaction.type == "TRANSFER", Transaction.from_wallet_id == wid)
    elif kind == "received":
        q = q.filter(Transaction.type == "TRANSFER", Transaction.to_wallet_id == wid)
    elif kind == "added":
        q = q.filter(Transaction.type == "TOPUP")
    elif kind == "withdrawn":
        q = q.filter(Transaction.type == "WITHDRAWAL")
    rows = q.order_by(Transaction.created_at.desc(), Transaction.id.desc()).offset(offset).limit(limit).all()
    return [_tx_out(t, wid) for t in rows]


@router.get("/transactions/{public_id}", response_model=TransactionOut)
def receipt(public_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    wid = user.wallet.id
    tx = db.query(Transaction).filter(
        Transaction.public_id == public_id,
        or_(Transaction.from_wallet_id == wid, Transaction.to_wallet_id == wid),
    ).first()
    if not tx:
        raise HTTPException(404, "Transaction not found")
    return _tx_out(tx, wid)


# ---------------------------------------------------------------- bank accounts
def _bank_out(b: BankAccount) -> BankOut:
    return BankOut(id=b.id, holder_name=b.holder_name, bank_name=b.bank_name, ifsc=b.ifsc,
                   last4=b.last4, status=b.status, created_at=b.created_at)


@bank_router.get("/ifsc/{code}", response_model=IfscOut)
@limiter.limit("30/minute")
def ifsc_details(request: Request, code: str, user: User = Depends(current_user)):
    """Free IFSC lookup so the form can fill in bank + branch for ANY bank (SBI, HDFC, ICICI ...)."""
    code = code.strip().upper()
    if not IFSC_RE.match(code):
        raise HTTPException(400, "Enter a valid 11-character IFSC code")
    try:
        info = lookup_ifsc(code)
    except IfscUnavailable:
        info = fallback_from_prefix(code)
        if not info:
            raise HTTPException(503, "Couldn't check this IFSC right now. You can still type the bank name yourself")
        return info
    if not info:
        raise HTTPException(404, "No bank branch found for this IFSC")
    return info


@bank_router.get("/{bank_id}/details", response_model=BankDetailsOut)
@limiter.limit("30/minute")
def bank_details(request: Request, bank_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Balance + recent transactions for a linked bank.
    SANDBOX ONLY: the figures are simulated (see bank_demo.py). With a real partner this is where its data goes."""
    bank = db.get(BankAccount, bank_id)
    if not bank or bank.user_id != user.id or not bank.is_active:
        raise HTTPException(404, "Bank account not found")
    if bank.status != "VERIFIED":
        raise HTTPException(400, "Details are available once the account is verified")
    if settings.PAYMENT_PROVIDER != "sandbox":
        raise HTTPException(501, "Live bank balances need a connected banking partner")

    try:
        branch = lookup_ifsc(bank.ifsc) or fallback_from_prefix(bank.ifsc)
    except IfscUnavailable:
        branch = fallback_from_prefix(bank.ifsc)

    stmt = demo_statement(bank.fingerprint)
    return BankDetailsOut(
        demo=True, bank_name=bank.bank_name, holder_name=bank.holder_name, ifsc=bank.ifsc, last4=bank.last4,
        branch_info=branch, as_of=utcnow(), **stmt,
    )


@bank_router.get("", response_model=list[BankOut])
def list_banks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(BankAccount)
            .filter(BankAccount.user_id == user.id, BankAccount.is_active.is_(True), BankAccount.status != "FAILED")
            .order_by(BankAccount.id.desc()).all())
    return [_bank_out(b) for b in rows]


@bank_router.post("", response_model=BankOut, status_code=201)
@limiter.limit("10/hour")
def link_bank(request: Request, body: BankLinkIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    active = (db.query(BankAccount)
              .filter(BankAccount.user_id == user.id, BankAccount.is_active.is_(True), BankAccount.status != "FAILED")
              .count())
    if active >= settings.MAX_BANK_ACCOUNTS:
        raise HTTPException(400, f"You can link up to {settings.MAX_BANK_ACCOUNTS} bank accounts")

    # A real, existing IFSC is required. When the lookup works, its bank name wins over whatever the browser sent.
    try:
        info = lookup_ifsc(body.ifsc)
        if info is None:
            raise HTTPException(400, "This IFSC code doesn't exist. Please check it")
        if info.get("bank"):
            body.bank_name = info["bank"][:100]
    except IfscUnavailable:
        pass  # lookup service down: fall back to the name the user confirmed

    fp = hashlib.sha256(f"{body.ifsc}:{body.account_no}".encode()).hexdigest()
    dup = db.query(BankAccount).filter(BankAccount.user_id == user.id, BankAccount.fingerprint == fp).first()
    if dup and dup.is_active and dup.status != "FAILED":
        raise HTTPException(409, "This bank account is already linked")

    res = get_provider().verify_bank_account(holder_name=body.holder_name, account_no=body.account_no, ifsc=body.ifsc)
    status = {"SUCCESS": "VERIFIED", "PENDING": "PENDING"}.get(res.status, "FAILED")
    if dup:  # linking again after a failure or a removal
        bank = dup
        bank.is_active, bank.status, bank.provider_ref = True, status, res.reference
        bank.holder_name, bank.bank_name = body.holder_name, body.bank_name
    else:
        bank = BankAccount(
            user_id=user.id, holder_name=body.holder_name, bank_name=body.bank_name, ifsc=body.ifsc,
            account_no_enc=encrypt(body.account_no), last4=body.account_no[-4:], fingerprint=fp,
            status=status, provider_ref=res.reference,
        )
        db.add(bank)
    audit(db, request, "bank_linked", user_id=user.id, status=status, last4=body.account_no[-4:])
    db.commit()
    if status == "FAILED":
        raise HTTPException(400, res.reason or "We couldn't verify this bank account")
    return _bank_out(bank)


@bank_router.delete("/{bank_id}", status_code=204)
def remove_bank(bank_id: int, request: Request, user: User = Depends(current_user), db: Session = Depends(get_db)):
    bank = db.get(BankAccount, bank_id)
    if not bank or bank.user_id != user.id or not bank.is_active:
        raise HTTPException(404, "Bank account not found")
    pending = db.query(Transaction.id).filter(Transaction.bank_account_id == bank.id,
                                              Transaction.status == "PENDING").first()
    if pending:
        raise HTTPException(400, "A withdrawal to this account is still in progress")
    bank.is_active = False  # soft delete: past transactions keep their reference
    audit(db, request, "bank_removed", user_id=user.id, last4=bank.last4)
    db.commit()


# ---------------------------------------------------------------- sandbox helper
@dev_router.post("/kyc-verify", status_code=204)
def fake_kyc(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Sandbox only (main.py does not mount this router in production)."""
    user.kyc_status = "VERIFIED"
    db.commit()