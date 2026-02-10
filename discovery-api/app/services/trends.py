"""Google Trends via SerpApi: trending searches and interest by region."""
import logging
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)
SERPAPI_BASE = "https://serpapi.com/search"


def _serpapi_get(params: Dict[str, Any]) -> Optional[dict]:
    """Call SerpApi with given params. Returns None if no key or on error."""
    api_key = settings.SERPAPI_API_KEY
    if not api_key:
        logger.warning("SERPAPI_API_KEY not set; skipping SerpApi call")
        return None
    params = dict(params)
    params["api_key"] = api_key
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.get(SERPAPI_BASE, params=params)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        # 400 often means invalid params (e.g. geo must be uppercase: US, AE)
        logger.warning("SerpApi request failed: %s %s", e.response.status_code, e.response.text[:200] if e.response.text else "")
        return None
    except Exception as e:
        logger.warning("SerpApi request failed: %s", e)
        return None


def fetch_trending_searches(
    geo: Optional[str] = None,
    hours: Optional[int] = None,
    category_id: Optional[str] = None,
    hl: str = "en",
) -> List[str]:
    """
    Fetch trending search queries from Google Trends (SerpApi engine=google_trends_trending_now).
    Returns list of query strings; empty if no key or on error.
    """
    geo = (geo or getattr(settings, "DISCOVERY_TRENDS_GEO", "ae") or "ae").strip().upper()
    hours = hours if hours is not None else 24
    # SerpApi expects geo in uppercase (e.g. US, AE) and hours as 4, 24, 48, or 168
    if hours not in (4, 24, 48, 168):
        hours = 24
    params: Dict[str, Any] = {
        "engine": "google_trends_trending_now",
        "geo": geo,
        "hours": hours,
        "hl": hl,
    }
    if category_id is not None:
        params["category_id"] = category_id
    data = _serpapi_get(params)
    if not data or not isinstance(data, dict):
        return []
    trending = data.get("trending_searches") or data.get("trending_searches_now") or []
    if not isinstance(trending, list):
        return []
    queries: List[str] = []
    for item in trending:
        if isinstance(item, dict) and item.get("query"):
            queries.append(str(item["query"]).strip())
        elif isinstance(item, str):
            queries.append(item.strip())
    return [q for q in queries if q]


def fetch_interest_by_region(
    q: str,
    geo: Optional[str] = None,
    region: Optional[str] = None,
    date: Optional[str] = None,
    hl: str = "en",
) -> List[dict]:
    """
    Fetch interest by region for a single query (SerpApi engine=google_trends, data_type=GEO_MAP_0).
    Returns list of dicts with keys like geo, location, value; empty if no key or on error.
    """
    if not q or not q.strip():
        return []
    geo = (geo or getattr(settings, "DISCOVERY_TRENDS_GEO", "ae") or "ae").strip().upper()
    params: Dict[str, Any] = {
        "engine": "google_trends",
        "data_type": "GEO_MAP_0",
        "q": q.strip(),
        "geo": geo,
        "hl": hl,
    }
    if region is not None:
        params["region"] = region
    if date is not None:
        params["date"] = date
    data = _serpapi_get(params)
    if not data or not isinstance(data, dict):
        return []
    interest = data.get("interest_by_region") or []
    if not isinstance(interest, list):
        return []
    return [item for item in interest if isinstance(item, dict)]
