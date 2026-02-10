"""Pluggable discovery strategies. Register new strategies here."""
from typing import Optional
from app.strategies.base import BaseStrategy
from app.strategies.mock_trending import MockTrendingStrategy

STRATEGY_REGISTRY = {
    MockTrendingStrategy.strategy_id: MockTrendingStrategy(),
}


def get_strategy(strategy_id: str) -> Optional[BaseStrategy]:
    return STRATEGY_REGISTRY.get(strategy_id)


def get_enabled_strategy_ids():
    """Return strategy ids that are enabled (from hardcoded list for now)."""
    enabled = {"mock_trending"}
    return [sid for sid in STRATEGY_REGISTRY if sid in enabled]
