"""Request ID and rate limiting middleware."""
import time
import uuid
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

# In-memory rate limit: key -> list of timestamps (sliding window)
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_RATE_WINDOW = 60.0  # seconds


def _clean_old_entries(key: str, now: float) -> None:
    cutoff = now - _RATE_WINDOW
    _rate_limit_store[key] = [t for t in _rate_limit_store[key] if t > cutoff]


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Generate or forward X-Request-ID and attach to response."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limit (sliding window). Returns 429 when exceeded."""

    async def dispatch(self, request: Request, call_next):
        now = time.monotonic()
        limit = getattr(settings, "RATE_LIMIT_PER_MIN", 100)
        if limit <= 0:
            return await call_next(request)
        client_ip = request.client.host if request.client else "unknown"
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        key = client_ip
        _clean_old_entries(key, now)
        if len(_rate_limit_store[key]) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
                headers={"Retry-After": "60"},
            )
        _rate_limit_store[key].append(now)
        return await call_next(request)
