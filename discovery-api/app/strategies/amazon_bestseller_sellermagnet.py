"""Amazon best-seller by category via SellerMagnet API (Phase 2)."""
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.services.discovery_filters import filter_by_max_asp
from app.strategies.base import BaseStrategy

logger = logging.getLogger(__name__)
SELLERMAGNET_BASE = "https://sellermagnet-api.com/api/amazon-bestsellers"

# Default category IDs (US Amazon browse nodes) when AMAZON_CATEGORY_IDS not set
DEFAULT_CATEGORY_IDS = ["172282", "2335752011"]  # Electronics, Cell Phones & Accessories


def _get_category_ids() -> List[str]:
    raw = getattr(settings, "AMAZON_CATEGORY_IDS", None) or ""
    if raw and raw.strip():
        return [c.strip() for c in raw.split(",") if c.strip()]
    return DEFAULT_CATEGORY_IDS


def _price_value(price_field: Any) -> Optional[float]:
    if price_field is None:
        return None
    if isinstance(price_field, (int, float)):
        return float(price_field)
    if isinstance(price_field, dict):
        return _price_value(price_field.get("price"))
    return None


def _currency_from_price(price_field: Any) -> str:
    if isinstance(price_field, dict) and price_field.get("currency_code"):
        return (price_field.get("currency_code") or "USD").strip().upper()
    return "USD"


def _normalize_item(item: dict, domain: str) -> Optional[dict]:
    asin = (item.get("asin") or "").strip()
    title = (item.get("productTitle") or "").strip()
    if not asin or not title:
        return None
    price_field = item.get("price")
    price = _price_value(price_field)
    currency = _currency_from_price(price_field)
    max_aed = getattr(settings, "DISCOVERY_MAX_ASP_AED", 500.0)
    if not filter_by_max_asp(price, currency, max_aed):
        return None
    image_url = item.get("mainImage")
    source_url = f"https://www.{domain}/dp/{asin}"
    raw_payload = {
        "asin": asin,
        "rank": item.get("rank"),
        "reviewAmount": item.get("reviewAmount"),
        "reviewRating": item.get("reviewRating"),
    }
    return {
        "title": title,
        "source_url": source_url,
        "brand": None,
        "image_url": image_url,
        "price": price,
        "currency": currency,
        "delivers_to_uae": False,  # Amazon US/region-specific; set True if using amazon.ae
        "raw_payload": raw_payload,
    }


class AmazonBestsellerSellerMagnetStrategy(BaseStrategy):
    strategy_id = "amazon_bestseller_sellermagnet"
    name = "Amazon Best-Seller (SellerMagnet)"
    description = "Top-selling products by Amazon category via SellerMagnet API. Set SELLERMAGNET_API_KEY and optional AMAZON_CATEGORY_IDS."

    def run(self) -> List[dict]:
        api_key = getattr(settings, "SELLERMAGNET_API_KEY", None) or settings.SELLERMAGNET_API_KEY
        if not api_key:
            logger.warning("SELLERMAGNET_API_KEY not set; returning empty list")
            return []
        marketplace_id = getattr(settings, "AMAZON_MARKETPLACE_ID", "ATVPDKIKX0DER")
        domain = (getattr(settings, "AMAZON_DOMAIN", None) or "amazon.com").strip()
        category_ids = _get_category_ids()
        results: List[dict] = []
        seen: set = set()
        with httpx.Client(timeout=30.0) as client:
            for i, cat_id in enumerate(category_ids):
                if i > 0:
                    time.sleep(0.3)
                params: Dict[str, Any] = {
                    "api_key": api_key,
                    "category_id": cat_id,
                    "marketplaceId": marketplace_id,
                    "count": 30,
                }
                try:
                    r = client.get(SELLERMAGNET_BASE, params=params)
                    r.raise_for_status()
                    data = r.json()
                except Exception as e:
                    logger.warning("SellerMagnet request failed for category %s: %s", cat_id, e)
                    continue
                if not isinstance(data, dict) or not data.get("success"):
                    continue
                inner = data.get("data") or {}
                bestsellers = inner.get("bestsellers")
                if not isinstance(bestsellers, list):
                    continue
                for it in bestsellers:
                    if not isinstance(it, dict):
                        continue
                    norm = _normalize_item(it, domain)
                    if norm and norm["source_url"] not in seen:
                        seen.add(norm["source_url"])
                        results.append(norm)
        return results
