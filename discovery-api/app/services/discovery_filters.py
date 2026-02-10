"""Shared discovery filters: max ASP (AED) and title keyword exclusion."""
from typing import List, Optional

from app.core.config import settings

USD_TO_AED = getattr(settings, "USD_TO_AED", 3.67)


def filter_by_max_asp(
    price: Optional[float],
    currency: Optional[str],
    max_aed: Optional[float] = None,
) -> bool:
    """
    Return True if item is within max ASP (AED). Uses DISCOVERY_MAX_ASP_AED if max_aed not given.
    Assumes price is in the given currency (AED or USD; USD converted to AED).
    """
    if price is None:
        return True
    if max_aed is None:
        max_aed = getattr(settings, "DISCOVERY_MAX_ASP_AED", 500.0)
    cur = (currency or "").strip().upper()
    if cur == "AED":
        return price <= max_aed
    if cur == "USD":
        return (price * USD_TO_AED) <= max_aed
    return price <= max_aed


def exclude_keywords_in_title(title: Optional[str], exclude_keywords: Optional[List[str]] = None) -> bool:
    """
    Return True if title should be excluded (contains any of the keywords, case-insensitive).
    exclude_keywords: list of substrings to exclude (e.g. ["warranty", "Apple"]).
    If None, uses a small default list (e.g. warranty-related) or empty = no exclusion.
    """
    if not title or not isinstance(title, str):
        return False
    t = title.lower()
    keywords = exclude_keywords if exclude_keywords is not None else ["warranty", "insurance"]
    return any(kw.lower() in t for kw in keywords if kw)
