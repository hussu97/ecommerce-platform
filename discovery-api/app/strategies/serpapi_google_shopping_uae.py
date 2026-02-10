"""SerpApi Google Shopping (UAE) discovery strategy."""
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.services.discovery_filters import filter_by_max_asp, exclude_keywords_in_title
from app.services.query_source import get_queries
from app.strategies.base import BaseStrategy

logger = logging.getLogger(__name__)
SERPAPI_BASE = "https://serpapi.com/search"

# Cap queries per run for rate limits
SERPAPI_MAX_QUERIES = 10


def _get_queries() -> List[str]:
    """Resolve query list from DISCOVERY_QUERY_SOURCE (static, trending, reddit, tokinsight)."""
    return get_queries(max_queries=SERPAPI_MAX_QUERIES)


def _normalize_item(item: dict, query: str) -> Optional[dict]:
    """Map SerpApi shopping result to discovery dict. Returns None if invalid or over MAX_ASP."""
    title = (item.get("title") or "").strip()
    if not title or exclude_keywords_in_title(title):
        return None
    link = item.get("link") or item.get("product_link") or ""
    if not link:
        return None
    price = item.get("extracted_price")
    if price is not None and not isinstance(price, (int, float)):
        try:
            price = float(price)
        except (TypeError, ValueError):
            price = None
    currency = "AED"  # UAE Shopping
    if not filter_by_max_asp(price, currency):
        return None
    brand = item.get("source")
    if isinstance(brand, str):
        brand = brand.strip() or None
    image_url = item.get("thumbnail") or item.get("thumbnails", [None])[0] if item.get("thumbnails") else None
    raw_payload = {
        "product_id": item.get("product_id"),
        "position": item.get("position"),
        "query": query,
    }
    return {
        "title": title,
        "source_url": link,
        "brand": brand,
        "image_url": image_url,
        "price": price,
        "currency": currency,
        "delivers_to_uae": True,
        "raw_payload": raw_payload,
    }


class SerpApiGoogleShoppingUAEStrategy(BaseStrategy):
    strategy_id = "serpapi_google_shopping_uae"
    name = "SerpApi Google Shopping (UAE)"
    description = "Product discovery via Google Shopping (UAE, gl=ae) with max price filter."

    def run(self) -> List[dict]:
        """Fetch from SerpApi Google Shopping for each query; normalize and filter by MAX_ASP."""
        api_key = settings.SERPAPI_API_KEY
        if not api_key:
            logger.warning("SERPAPI_API_KEY not set; returning empty list")
            return []
        queries = _get_queries()
        max_aed = getattr(settings, "DISCOVERY_MAX_ASP_AED", 500.0)
        seen_urls: set = set()
        results: List[dict] = []
        with httpx.Client(timeout=30.0) as client:
            for i, query in enumerate(queries):
                if i > 0:
                    time.sleep(0.5)  # rate limit
                params: Dict[str, Any] = {
                    "engine": "google_shopping",
                    "q": query,
                    "gl": "ae",
                    "hl": "en",
                    "api_key": api_key,
                    "max_price": int(max_aed),
                }
                try:
                    r = client.get(SERPAPI_BASE, params=params)
                    r.raise_for_status()
                    data = r.json()
                except Exception as e:
                    logger.warning("SerpApi Google Shopping request failed for q=%s: %s", query, e)
                    continue
                if not isinstance(data, dict):
                    continue
                # Collect from shopping_results and inline_shopping_results
                for key in ("shopping_results", "inline_shopping_results"):
                    items = data.get(key)
                    if not isinstance(items, list):
                        continue
                    for it in items:
                        if not isinstance(it, dict):
                            continue
                        norm = _normalize_item(it, query)
                        if norm and norm["source_url"] not in seen_urls:
                            seen_urls.add(norm["source_url"])
                            results.append(norm)
                # Also from categorized_shopping_results
                for cat in data.get("categorized_shopping_results") or []:
                    if not isinstance(cat, dict):
                        continue
                    for it in (cat.get("shopping_results") or []):
                        if not isinstance(it, dict):
                            continue
                        norm = _normalize_item(it, query)
                        if norm and norm["source_url"] not in seen_urls:
                            seen_urls.add(norm["source_url"])
                            results.append(norm)
        return results
