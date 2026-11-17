# backend/app/ifsc.py
import json
import logging
import time
import urllib.error
import urllib.request

log = logging.getLogger("payzo.ifsc")

API = "https://ifsc.razorpay.com/{code}"
TTL_FOUND = 24 * 3600      # bank branches almost never change
TTL_MISSING = 10 * 60
_cache: dict[str, tuple[float, dict | None]] = {}

# Offline fallback: the first 4 letters of an IFSC identify the bank.
BANK_PREFIXES = {
    "SBIN": "State Bank of India", "HDFC": "HDFC Bank", "ICIC": "ICICI Bank", "UTIB": "Axis Bank",
    "PUNB": "Punjab National Bank", "BARB": "Bank of Baroda", "CNRB": "Canara Bank", "UBIN": "Union Bank of India",
    "KKBK": "Kotak Mahindra Bank", "IDIB": "Indian Bank", "BKID": "Bank of India", "MAHB": "Bank of Maharashtra",
    "CBIN": "Central Bank of India", "IOBA": "Indian Overseas Bank", "UCBA": "UCO Bank", "YESB": "Yes Bank",
    "INDB": "IndusInd Bank", "IDFB": "IDFC First Bank", "FDRL": "Federal Bank", "KARB": "Karnataka Bank",
    "SIBL": "South Indian Bank", "RATN": "RBL Bank", "PSIB": "Punjab & Sind Bank", "AUBL": "AU Small Finance Bank",
    "BDBL": "Bandhan Bank", "CIUB": "City Union Bank", "KVBL": "Karur Vysya Bank", "TMBL": "Tamilnad Mercantile Bank",
    "JAKA": "Jammu & Kashmir Bank", "DLXB": "Dhanlaxmi Bank", "PYTM": "Paytm Payments Bank",
    "AIRP": "Airtel Payments Bank", "IPOS": "India Post Payments Bank", "SCBL": "Standard Chartered Bank",
    "HSBC": "HSBC", "DBSS": "DBS Bank India", "ESFB": "Equitas Small Finance Bank", "UJVN": "Ujjivan Small Finance Bank",
}


class IfscUnavailable(Exception):
    pass


def _from_cache(code: str):
    hit = _cache.get(code)
    if hit and hit[0] > time.time():
        return True, hit[1]
    return False, None


def lookup_ifsc(code: str) -> dict | None:
    code = code.strip().upper()
    cached, value = _from_cache(code)
    if cached:
        return value

    req = urllib.request.Request(API.format(code=code), headers={"Accept": "application/json", "User-Agent": "Payzo/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            raw = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            _cache[code] = (time.time() + TTL_MISSING, None)
            return None
        log.warning("IFSC service error %s", e.code)
        raise IfscUnavailable() from e
    except Exception as e:  # timeout, DNS, bad JSON ...
        log.warning("IFSC service unreachable: %s", e)
        raise IfscUnavailable() from e

    info = {
        "ifsc": code,
        "bank": raw.get("BANK") or BANK_PREFIXES.get(code[:4], ""),
        "branch": raw.get("BRANCH") or "",
        "city": raw.get("CITY") or "",
        "state": raw.get("STATE") or "",
        "address": raw.get("ADDRESS") or "",
        "upi": bool(raw.get("UPI")),
        "imps": bool(raw.get("IMPS")),
        "neft": bool(raw.get("NEFT")),
        "rtgs": bool(raw.get("RTGS")),
        "exact": True,
    }
    _cache[code] = (time.time() + TTL_FOUND, info)
    return info


def fallback_from_prefix(code: str) -> dict | None:
    """Used only when the lookup service is down: we can still name the bank, but can't confirm the branch."""
    name = BANK_PREFIXES.get(code[:4].upper())
    if not name:
        return None
    return {"ifsc": code.upper(), "bank": name, "branch": "", "city": "", "state": "", "address": "",
            "upi": False, "imps": False, "neft": False, "rtgs": False, "exact": False}
