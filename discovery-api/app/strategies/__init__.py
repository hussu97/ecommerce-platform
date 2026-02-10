"""Pluggable discovery strategies. Register new strategies here."""
from typing import Optional
from app.strategies.base import BaseStrategy
from app.strategies.mock_trending import MockTrendingStrategy
from app.strategies.serpapi_google_shopping_uae import SerpApiGoogleShoppingUAEStrategy
from app.strategies.aliexpress_rapidapi import AliExpressRapidAPIStrategy

STRATEGY_REGISTRY = {
    MockTrendingStrategy.strategy_id: MockTrendingStrategy(),
    SerpApiGoogleShoppingUAEStrategy.strategy_id: SerpApiGoogleShoppingUAEStrategy(),
    AliExpressRapidAPIStrategy.strategy_id: AliExpressRapidAPIStrategy(),
}


def get_strategy(strategy_id: str) -> Optional[BaseStrategy]:
    return STRATEGY_REGISTRY.get(strategy_id)


def get_enabled_strategy_ids():
    """Return strategy ids that are enabled (from hardcoded list for now)."""
    enabled = {"mock_trending", "serpapi_google_shopping_uae", "aliexpress_trending_uae"}
    return [sid for sid in STRATEGY_REGISTRY if sid in enabled]
