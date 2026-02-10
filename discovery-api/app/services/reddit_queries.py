"""
Reddit as query source (Phase 2): fetch hot posts from subreddits, return titles as search queries.
Requires REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (Reddit API app). Commercial use may require Reddit approval.
"""
import logging
from typing import List, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)
REDDIT_OAUTH_URL = "https://www.reddit.com/api/v1/access_token"
REDDIT_OAUTH_BASE = "https://oauth.reddit.com"


def _get_token() -> Optional[str]:
    client_id = getattr(settings, "REDDIT_CLIENT_ID", None) or ""
    client_secret = getattr(settings, "REDDIT_CLIENT_SECRET", None) or ""
    if not client_id or not client_secret:
        return None
    import base64
    auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                REDDIT_OAUTH_URL,
                data={"grant_type": "client_credentials"},
                headers={
                    "Authorization": f"Basic {auth}",
                    "User-Agent": "discovery-api/1.0 (product research)",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            )
            r.raise_for_status()
            data = r.json()
            return data.get("access_token")
    except Exception as e:
        logger.warning("Reddit OAuth failed: %s", e)
        return None


def get_reddit_queries(max_queries: int = 20) -> List[str]:
    """
    Fetch hot post titles from REDDIT_SUBREDDITS and return them as query strings (deduped, capped).
    Returns [] if Reddit credentials missing or on error.
    """
    token = _get_token()
    if not token:
        logger.warning("Reddit credentials not set or OAuth failed; returning empty query list")
        return []
    subreddits_raw = getattr(settings, "REDDIT_SUBREDDITS", "BuyItForLife,Frugal,GiftIdeas") or "BuyItForLife,Frugal,GiftIdeas"
    subreddits = [s.strip() for s in subreddits_raw.split(",") if s.strip()]
    if not subreddits:
        return []
    seen: set = set()
    queries: List[str] = []
    with httpx.Client(timeout=15.0) as client:
        for sub in subreddits[:5]:  # limit subreddits to avoid rate limit
            try:
                r = client.get(
                    f"{REDDIT_OAUTH_BASE}/r/{sub}/hot",
                    params={"limit": "25"},
                    headers={
                        "Authorization": f"Bearer {token}",
                        "User-Agent": "discovery-api/1.0 (product research)",
                    },
                )
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                logger.warning("Reddit hot request failed for r/%s: %s", sub, e)
                continue
            children = (data.get("data") or {}).get("children") or []
            for child in children:
                if not isinstance(child, dict):
                    continue
                inner = child.get("data") or {}
                title = (inner.get("title") or "").strip()
                if not title or len(title) < 4 or title in seen:
                    continue
                seen.add(title)
                # Use title as query (many are "What's the best X?" or product names)
                if len(title) > 80:
                    title = title[:80].rsplit(" ", 1)[0] if " " in title[:80] else title[:80]
                queries.append(title)
                if max_queries and len(queries) >= max_queries:
                    return queries
    return queries
