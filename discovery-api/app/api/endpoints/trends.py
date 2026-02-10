"""Google Trends endpoints (SerpApi): trending searches and interest by region."""
from typing import List, Optional

from fastapi import APIRouter, Query

from app.services.trends import fetch_trending_searches, fetch_interest_by_region

router = APIRouter()


@router.get("/trending-searches", response_model=List[str])
def get_trending_searches(
    geo: Optional[str] = Query(None, description="Two-letter country/region code (e.g. ae for UAE)"),
    hours: Optional[int] = Query(None, description="Past hours: 4, 24, 48, or 168"),
    category_id: Optional[str] = Query(None, description="Trends category filter"),
    hl: str = Query("en", description="Language code"),
):
    """
    Return trending search queries from Google Trends for the given geo and time window.
    Requires SERPAPI_API_KEY. Uses SerpApi engine=google_trends_trending_now.
    """
    queries = fetch_trending_searches(geo=geo, hours=hours, category_id=category_id, hl=hl)
    return queries


@router.get("/interest-by-region", response_model=List[dict])
def get_interest_by_region(
    q: str = Query(..., description="Single search query"),
    geo: Optional[str] = Query(None, description="Two-letter country/region code (e.g. ae)"),
    region: Optional[str] = Query(None, description="Region filter"),
    date: Optional[str] = Query(None, description="Date range for trends"),
    hl: str = Query("en", description="Language code"),
):
    """
    Return interest by region for the given query. Requires SERPAPI_API_KEY.
    Uses SerpApi engine=google_trends with data_type=GEO_MAP_0.
    """
    items = fetch_interest_by_region(q=q, geo=geo, region=region, date=date, hl=hl)
    return items
