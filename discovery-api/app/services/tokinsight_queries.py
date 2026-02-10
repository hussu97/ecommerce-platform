"""
TokInsight TikTok as query source (Phase 2): fetch trending terms/videos, return as search queries.
Get API key from tokinsight.com or use via RapidAPI (RAPIDAPI_KEY + RAPIDAPI_TOKINSIGHT_HOST).
Free tier: 2,000 calls/day, 20/min.
"""
import logging
from typing import Any, List

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_tokinsight_queries(max_queries: int = 20) -> List[str]:
    """
    Fetch TikTok trending data and return query strings (e.g. video titles or hashtags).
    Uses RapidAPI when RAPIDAPI_KEY and RAPIDAPI_TOKINSIGHT_HOST are set; otherwise returns [].
    """
    api_key = getattr(settings, "RAPIDAPI_KEY", None) or ""
    host = (getattr(settings, "RAPIDAPI_TOKINSIGHT_HOST", None) or "").strip()
    if not api_key or not host:
        logger.debug("TokInsight/RapidAPI not configured (RAPIDAPI_KEY, RAPIDAPI_TOKINSIGHT_HOST); skipping")
        return []
    host_clean = host.replace("https://", "").split("/")[0]
    base_url = f"https://{host_clean}"
    headers = {"X-RapidAPI-Key": api_key, "X-RapidAPI-Host": host_clean}
    queries: List[str] = []
    seen: set = set()
    # Common RapidAPI TikTok scraper paths for trending
    for path in ["/trending", "/getTrendingVideos", "/trending/videos"]:
        try:
            with httpx.Client(timeout=20.0) as client:
                r = client.get(base_url + path, headers=headers)
                if r.status_code != 200:
                    continue
                data = r.json()
        except Exception as e:
            logger.debug("TokInsight request %s failed: %s", path, e)
            continue
        if not isinstance(data, dict):
            continue
        # Try to extract titles or descriptions from response (structure varies by API)
        items = data.get("data") or data.get("videos") or data.get("itemList") or data.get("items") or []
        if isinstance(items, dict):
            items = items.get("videos") or items.get("itemList") or []
        if not isinstance(items, list):
            continue
        for it in items:
            if not isinstance(it, dict):
                continue
            title = (it.get("title") or it.get("desc") or it.get("description") or "").strip()
            if title and len(title) > 2 and title not in seen:
                seen.add(title)
                if len(title) > 80:
                    title = title[:80].rsplit(" ", 1)[0] if " " in title[:80] else title[:80]
                queries.append(title)
                if max_queries and len(queries) >= max_queries:
                    return queries
        if queries:
            break
    return queries
