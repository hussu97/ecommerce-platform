"""AliExpress product discovery via Aliexpress True API (RapidAPI) – /hot-products."""
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.services.discovery_filters import filter_by_max_asp, exclude_keywords_in_title
from app.services.query_source import get_queries
from app.strategies.base import BaseStrategy

logger = logging.getLogger(__name__)

# AliExpress free tier is tight; cap queries per run
ALIEXPRESS_MAX_QUERIES = 5
HOT_PRODUCTS_PAGE_SIZE = 30


def _get_queries() -> List[str]:
    """Query list from DISCOVERY_QUERY_SOURCE (static, trending, reddit, tokinsight), capped for free tier."""
    return get_queries(max_queries=ALIEXPRESS_MAX_QUERIES)


def _price_to_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    try:
        return float(str(val).replace(",", "").strip())
    except (TypeError, ValueError):
        return None


def _normalize_hot_product(item: dict, max_aed: float) -> Optional[dict]:
    """
    Map one Aliexpress True API hot-product item to discovery dict.
    Response shape: product_id, product_title, product_main_image_url, target_sale_price,
    target_original_price, discount, commission_rate, evaluate_rate, lastest_volume, promotion_link.
    """
    title = item.get("product_title") or ""
    if isinstance(title, str):
        title = title.strip()
    if not title or exclude_keywords_in_title(title):
        return None
    product_id = item.get("product_id")
    url = (item.get("promotion_link") or "").strip()
    if not url and product_id is not None:
        url = f"https://www.aliexpress.com/item/{product_id}.html"
    if not url:
        return None
    image_url = item.get("product_main_image_url")
    price = _price_to_float(item.get("target_sale_price"))
    currency = "USD"
    if not filter_by_max_asp(price, currency, max_aed):
        return None
    raw_payload = {
        "product_id": product_id,
        "target_original_price": item.get("target_original_price"),
        "discount": item.get("discount"),
        "commission_rate": item.get("commission_rate"),
        "lastest_volume": item.get("lastest_volume"),
    }
    return {
        "title": title,
        "source_url": url,
        "brand": None,
        "image_url": image_url,
        "price": price,
        "currency": currency,
        "delivers_to_uae": True,
        "raw_payload": raw_payload,
    }


class AliExpressRapidAPIStrategy(BaseStrategy):
    strategy_id = "aliexpress_trending_uae"
    name = "AliExpress (True API – hot products)"
    description = "Product discovery via Aliexpress True API /hot-products (trending, high-commission); UAE targeting."

    def run(self) -> List[dict]:
        """Call Aliexpress True API GET /hot-products; normalize and filter by MAX_ASP_AED."""
        api_key = settings.RAPIDAPI_KEY
        host = (settings.RAPIDAPI_ALIEXPRESS_HOST or "").strip()
        if not api_key or not host:
            logger.warning("RAPIDAPI_KEY or RAPIDAPI_ALIEXPRESS_HOST not set; returning empty list")
            return []
        max_aed = getattr(settings, "DISCOVERY_MAX_ASP_AED", 500.0)
        ship_to_country = getattr(settings, "DISCOVERY_ALIEXPRESS_SHIP_COUNTRY", "AE")
        target_language = getattr(settings, "DISCOVERY_ALIEXPRESS_LANGUAGE", "EN")
        # Optional API-side max price (USD) from DISCOVERY_MAX_ASP_AED
        usd_to_aed = getattr(settings, "USD_TO_AED", 3.67)
        max_sale_price_usd = max_aed / usd_to_aed if usd_to_aed else None

        host_clean = host.replace("https://", "").split("/")[0]
        base_url = f"https://{host_clean}/api/v3"
        path = "/hot-products"
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": host_clean,
        }

        queries = _get_queries()
        results: List[dict] = []
        seen: set = set()

        with httpx.Client(timeout=30.0) as client:
            for i, query in enumerate(queries):
                if i > 0:
                    time.sleep(0.5)
                params: Dict[str, Any] = {
                    "keywords": query,
                    "page_no": 1,
                    "page_size": HOT_PRODUCTS_PAGE_SIZE,
                    "target_currency": "USD",
                    "target_language": target_language,
                    "ship_to_country": ship_to_country,
                    "sort": "LAST_VOLUME_DESC",
                }
                if max_sale_price_usd is not None:
                    params["max_sale_price"] = max_sale_price_usd
                try:
                    r = client.get(
                        f"{base_url}{path}",
                        params=params,
                        headers=headers,
                    )
                    r.raise_for_status()
                    data = r.json()
                except Exception as e:
                    logger.warning("Aliexpress True API /hot-products failed for q=%s: %s", query, e)
                    continue
                if not isinstance(data, dict):
                    continue
                products_obj = data.get("products")
                if not isinstance(products_obj, dict):
                    continue
                items = products_obj.get("product")
                if not isinstance(items, list):
                    # API might return a single object in some cases
                    if isinstance(items, dict):
                        items = [items]
                    else:
                        continue
                for it in items:
                    if not isinstance(it, dict):
                        continue
                    norm = _normalize_hot_product(it, max_aed)
                    if norm and norm["source_url"] not in seen:
                        seen.add(norm["source_url"])
                        results.append(norm)
        return results
