# backend/app/bank_demo.py
import hashlib
import random
from datetime import date, timedelta
from decimal import Decimal

_MERCHANTS = ["GROCERY MART", "FUEL STATION", "ELECTRICITY BILL", "MOBILE RECHARGE", "ONLINE SHOPPING",
              "RESTAURANT", "PHARMACY", "METRO CARD", "BROADBAND BILL", "CAB RIDE", "MOVIE TICKETS"]
_PEOPLE = ["A KUMAR", "S DAS", "R SHARMA", "P GHOSH", "M SINGH", "N ROY", "K BOSE", "T IYER"]


def _ref(rng: random.Random) -> str:
    return "".join(rng.choice("0123456789") for _ in range(12))


def _money(rng: random.Random, lo: int, hi: int) -> Decimal:
    return Decimal(rng.randint(lo * 100, hi * 100)) / Decimal(100)


def demo_statement(fingerprint: str, days: int = 45, today: date | None = None) -> dict:
    today = today or date.today()
    seed = int(hashlib.sha256(("payzo-demo:" + fingerprint).encode()).hexdigest()[:16], 16)
    rng = random.Random(seed)

    # --- build the entries (oldest -> newest) as (date, description, signed amount, mode) ---
    entries = []
    # one salary-like credit and one EMI-like debit per month-ish
    for off in (days - 3, days - 33):
        if off > 0:
            entries.append((today - timedelta(days=off), "SALARY CREDIT - DEMO EMPLOYER PVT LTD",
                            _money(rng, 25000, 70000), "NEFT"))
    entries.append((today - timedelta(days=rng.randint(5, 20)), "ECS EMI - DEMO FINANCE", -_money(rng, 2000, 9000), "ECS"))

    for _ in range(rng.randint(13, 17)):
        d = today - timedelta(days=rng.randint(0, days - 1))
        kind = rng.random()
        if kind < 0.45:
            entries.append((d, f"UPI/DR/{_ref(rng)}/{rng.choice(_MERCHANTS)}", -_money(rng, 40, 3500), "UPI"))
        elif kind < 0.62:
            entries.append((d, f"UPI/CR/{_ref(rng)}/{rng.choice(_PEOPLE)}", _money(rng, 100, 6000), "UPI"))
        elif kind < 0.74:
            entries.append((d, f"POS {rng.choice(_MERCHANTS)}", -_money(rng, 150, 4000), "POS"))
        elif kind < 0.84:
            entries.append((d, f"ATM WDL {rng.choice(['1000', '2000', '5000', '10000'])}", -Decimal(rng.choice([1000, 2000, 5000, 10000])), "ATM"))
        elif kind < 0.94:
            entries.append((d, f"IMPS-{_ref(rng)}-{rng.choice(_PEOPLE)}", rng.choice([-1, 1]) * _money(rng, 500, 8000), "IMPS"))
        else:
            entries.append((d, "INTEREST CREDIT", _money(rng, 20, 400), "INT"))

    entries.sort(key=lambda e: e[0])

    # --- choose the closing balance, then make sure no running balance goes negative ---
    closing = _money(rng, 15000, 250000)
    net = sum(e[2] for e in entries)
    opening = closing - net
    if opening < 0:
        closing += -opening + Decimal(2000)
        opening = closing - net

    running = opening
    rows = []
    for d, desc, amt, mode in entries:
        running += amt
        rows.append({
            "date": d, "description": desc, "mode": mode, "type": "CR" if amt > 0 else "DR",
            "amount": abs(amt).quantize(Decimal("0.01")), "balance_after": running.quantize(Decimal("0.01")),
        })
    rows.reverse()   # newest first

    return {
        "balance": closing.quantize(Decimal("0.01")),
        "total_in": sum((r["amount"] for r in rows if r["type"] == "CR"), Decimal("0")),
        "total_out": sum((r["amount"] for r in rows if r["type"] == "DR"), Decimal("0")),
        "days": days,
        "transactions": rows,
    }
