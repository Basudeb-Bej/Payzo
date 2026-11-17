#backend/app/recipients.py
"""Helpers for finding people to pay."""
import re


def normalize_phone(raw: str) -> str:
    """Canonical E.164-style form, e.g. '+919876543210'.

    Accepted input:
      * 10 digits                -> assumed Indian, '+91' is added
      * 91 + 10 digits           -> '+' is added
      * '00' + country code ...  -> '00' becomes '+'
      * '+' + 7-15 digits        -> kept
    Spaces, dashes and brackets are ignored.
    """
    s = re.sub(r"[\s\-()]", "", raw or "")
    if s.startswith("00"):
        s = "+" + s[2:]
    if re.fullmatch(r"\d{10}", s):
        s = "+91" + s
    elif re.fullmatch(r"91\d{10}", s):
        s = "+" + s
    if not re.fullmatch(r"\+\d{7,15}", s):
        raise ValueError("Enter a 10-digit number, or include the country code (e.g. +91 98765 43210)")
    return s