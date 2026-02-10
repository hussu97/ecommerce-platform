"""
Static and file-based query source for discovery strategies (Phase 1 + 2).
Use DISCOVERY_QUERY_LIST (comma-separated or path to file) or this default list.
DISCOVERY_QUERY_SOURCE: static | trending | reddit | tokinsight.
"""
from typing import List

from app.core.config import settings

# Category-based default queries (generic, low-ASP friendly). Used when DISCOVERY_QUERY_LIST is unset.
DEFAULT_QUERIES: List[str] = [
    # Electronics / accessories
    "wireless earbuds",
    "phone stand",
    "usb cable",
    "phone case",
    "led desk lamp",
    # Home / office
    "desk organizer",
    "yoga mat",
    "kitchen utensils set",
    # Fashion / lifestyle
    "cotton tote bag",
    "water bottle",
    "slim wallet",
]


def get_static_queries(max_queries: int = 0) -> List[str]:
    """
    Return query list from DISCOVERY_QUERY_LIST (comma-separated or path to file) or DEFAULT_QUERIES.
    Path: if value contains no comma and no newline, treat as file path (one query per line).
    max_queries: cap length (0 = no cap).
    """
    raw = getattr(settings, "DISCOVERY_QUERY_LIST", None) or ""
    raw = (raw or "").strip()
    if raw:
        # File path: single path-like string (no comma, no newline)
        if "\n" not in raw and "," not in raw and raw.count(" ") == 0:
            try:
                with open(raw, "r", encoding="utf-8") as f:
                    lines = [
                        line.strip()
                        for line in f
                        if line.strip() and not line.strip().startswith("#")
                    ]
                if lines:
                    result = lines
                    if max_queries:
                        result = result[:max_queries]
                    return result
            except OSError:
                pass
        # Comma-separated
        parts = [q.strip() for q in raw.split(",") if q.strip()]
        if parts:
            if max_queries:
                parts = parts[:max_queries]
            return parts
    result = list(DEFAULT_QUERIES)
    if max_queries:
        result = result[:max_queries]
    return result


def get_queries(max_queries: int = 0) -> List[str]:
    """
    Return query list based on DISCOVERY_QUERY_SOURCE:
    static -> get_static_queries; trending -> SerpApi Google Trends; reddit -> Reddit hot; tokinsight -> TokInsight trending.
    """
    source = (getattr(settings, "DISCOVERY_QUERY_SOURCE", None) or "static").lower().strip()
    cap = max_queries or 30
    if source == "trending":
        from app.services.trends import fetch_trending_searches
        queries = fetch_trending_searches(
            geo=getattr(settings, "DISCOVERY_TRENDS_GEO", "ae"),
            hours=24,
        )
        return (queries or [])[: min(cap, 10)]
    if source == "reddit":
        from app.services.reddit_queries import get_reddit_queries
        return get_reddit_queries(max_queries=cap)
    if source == "tokinsight":
        from app.services.tokinsight_queries import get_tokinsight_queries
        return get_tokinsight_queries(max_queries=cap)
    return get_static_queries(max_queries=cap if cap else 0)
