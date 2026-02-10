from fastapi import APIRouter
from app.schemas.product import StrategyResponse

router = APIRouter()

# Hardcoded list for scaffold; includes mock strategy for UI and runs.
STRATEGIES_HARDCODED = [
    StrategyResponse(
        id="mock_trending",
        name="Mock Trending",
        description="Returns sample products for testing the pipeline.",
        enabled=True,
    ),
]


@router.get("", response_model=list[StrategyResponse])
async def list_strategies():
    """List registered discovery strategies."""
    return STRATEGIES_HARDCODED
