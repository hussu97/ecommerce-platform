class BaseStrategy:
    """Base for discovery strategies. Subclass and implement run()."""
    strategy_id: str = ""
    name: str = ""
    description: str = ""

    def run(self) -> list[dict]:
        """Return a list of normalized product dicts. Override in subclasses."""
        raise NotImplementedError
