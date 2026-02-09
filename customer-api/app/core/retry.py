"""Structured retries for outbound calls (e.g. Stripe). Use for external HTTP/API calls that may transiently fail."""
import stripe as stripe_module
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception,
)


def _is_retryable_stripe_error(exc: BaseException) -> bool:
    """Retry on connection errors and Stripe 5xx."""
    if isinstance(exc, stripe_module.error.APIConnectionError):
        return True
    if isinstance(exc, stripe_module.error.APIError) and getattr(exc, "http_status", 0) >= 500:
        return True
    return False


def stripe_create_with_retry(sync_create_fn):
    """
    Run a sync Stripe create call with retries: max 3 attempts, exponential backoff (1s, 2s, 4s).
    Retries on APIConnectionError and APIError with http_status >= 500.
    """
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception(_is_retryable_stripe_error),
        reraise=True,
    )
    def _wrapped():
        return sync_create_fn()
    return _wrapped()
