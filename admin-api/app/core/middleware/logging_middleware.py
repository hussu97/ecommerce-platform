"""Structured logging middleware."""
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import structlog

try:
    from opentelemetry import trace
    _OTEL_AVAILABLE = True
except ImportError:
    _OTEL_AVAILABLE = False


def _get_trace_context():
    if not _OTEL_AVAILABLE:
        return {}
    span = trace.get_current_span()
    if not span or not span.is_recording():
        return {}
    ctx = span.get_span_context()
    trace_id = ctx.trace_id if isinstance(ctx.trace_id, str) else (ctx.trace_id.hex() if isinstance(ctx.trace_id, bytes) else format(ctx.trace_id, "032x"))
    span_id = ctx.span_id if isinstance(ctx.span_id, str) else (ctx.span_id.hex() if isinstance(ctx.span_id, bytes) else format(ctx.span_id, "016x"))
    return {"trace_id": trace_id, "span_id": span_id}


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Log each request with structured JSON output."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        request_id = getattr(request.state, "request_id", None)
        log = structlog.get_logger()
        extra = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration_ms, 2),
        }
        extra.update(_get_trace_context())
        log.info("request", **extra)
        return response
