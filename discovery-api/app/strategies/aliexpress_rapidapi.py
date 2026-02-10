"""AliExpress product discovery via RapidAPI."""
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.services.discovery_filters import filter_by_max_asp, exclude_keywords_in_title
from app.strategies.base import BaseStrategy

logger = logging.getLogger(__name__)

# Default search terms (generic, low-ASP)
DEFAULT_QUERIES = [
    "wireless earbuds",
    "phone stand",
    "yoga mat",
    "desk organizer",
    "led lamp",
]


def _get_queries() -> List[str]:
    """Query list from config or default."""
    raw = getattr(settings, "DISCOVERY_QUERY_LIST", None) or ""
    raw = (raw or "").strip()
    if raw:
        if "," in raw:
            return [q.strip() for q in raw.split(",") if q.strip()][:10]
        return [raw]
    return DEFAULT_QUERIES[:5]  # limit requests for free tier


def _price_to_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    try:
        return float(str(val).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _normalize_item(item: dict, max_aed: float) -> Optional[dict]:
    """
    Map a generic AliExpress-style result to discovery dict.
    Tries common RapidAPI AliExpress response keys.
    """
    title = (
        item.get("title")
        or item.get("title_en")
        or item.get("product_title")
        or item.get("titleEn")
        or ""
    )
    if isinstance(title, str):
        title = title.strip()
    if not title or exclude_keywords_in_title(title):
        return None
    url = (
        item.get("product_detail_url")
        or item.get("product_url")
        or item.get("url")
        or item.get("link")
        or item.get("detail_url")
        or ""
    )
    if isinstance(url, str):
        url = url.strip()
    if not url:
        return None
    image_url = (
        item.get("product_main_image_url")
        or item.get("image_url")
        or item.get("thumbnail")
        or item.get("image")
        or item.get("product_image")
    )
    price = _price_to_float(
        item.get("sale_price")
        or item.get("price")
        or item.get("target_sale_price")
        or item.get("min_price")
        or item.get("price_min")
    )
    currency = (item.get("currency") or "USD").strip().upper() or "USD"
    if not filter_by_max_asp(price, currency, max_aed):
        return None
    raw_payload = {
        "product_id": item.get("product_id") or item.get("productId"),
        "original_price": item.get("original_price") or item.get("original_price_min"),
    }
    return {
        "title": title,
        "source_url": url,
        "brand": None,  # AliExpress often generic
        "image_url": image_url,
        "price": price,
        "currency": currency,
        "delivers_to_uae": True,  # assume UAE for UAE-focused run
        "raw_payload": raw_payload,
    }


class AliExpressRapidAPIStrategy(BaseStrategy):
    strategy_id = "aliexpress_trending_uae"
    name = "AliExpress (RapidAPI)"
    description = "Product discovery via AliExpress search on RapidAPI; filtered by max ASP (AED)."

    def run(self) -> List[dict]:
        """Call RapidAPI AliExpress search; normalize and filter by MAX_ASP_AED."""
        api_key = settings.RAPIDAPI_KEY
        host = settings.RAPIDAPI_ALIEXPRESS_HOST
        if not api_key or not host:
            logger.warning("RAPIDAPI_KEY or RAPIDAPI_ALIEXPRESS_HOST not set; returning empty list")
            return []
        max_aed = getattr(settings, "DISCOVERY_MAX_ASP_AED", 500.0)
        queries = _get_queries()
        results: List[dict] = []
        seen: set = set()
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": host.strip(),
        }
        host_clean = host.strip().replace("https://", "").split("/")[0]
        base_url = f"https://{host_clean}"
        # Common path for RapidAPI AliExpress search APIs
        search_path = "/search"
        with httpx.Client(timeout=30.0) as client:
            for i, query in enumerate(queries):
                if i > 0:
                    time.sleep(0.5)
                params = {"keyword": query}
                try:
                    r = client.get(
                        f"{base_url}{search_path}",
                        params=params,
                        headers=headers,
                    )
                    r.raise_for_status()
                    data = r.json()
                except Exception as e:
                    logger.warning("RapidAPI AliExpress request failed for q=%s: %s", query, e)
                    continue
                if not isinstance(data, dict):
                    continue
                # Unnest common response shapes
                items = (
                    data.get("results")
                    or data.get("result")
                    or data.get("products")
                    or data.get("data")
                    or data.get("items")
                )
                if isinstance(items, dict):
                    items = items.get("products") or items.get("items") or items.get("result") or []
                if not isinstance(items, list):
                    continue
                for it in items:
                    if not isinstance(it, dict):
                        continue
                    norm = _normalize_item(it, max_aed)
                    if norm and norm["source_url"] not in seen:
                        seen.add(norm["source_url"])
                        results.append(norm)
        return results
