"""Customer BFF: proxy to customer-api with request ID, rate limiting, and optional aggregation."""
import json
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

from app.core.config import settings
from app.core.middleware import RequestIdMiddleware, RateLimitMiddleware

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="BFF in front of customer-api: proxy, rate limiting, aggregation.",
)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestIdMiddleware)

_BACKEND = settings.CUSTOMER_API_URL.rstrip("/")

_HEADERS_TO_FORWARD = (
    "authorization",
    "x-visitor-id",
    "x-request-id",
    "idempotency-key",
    "x-idempotency-key",
    "content-type",
    "accept",
    "accept-language",
)


def _forward_headers(request: Request) -> dict[str, str]:
    out = {}
    for h in _HEADERS_TO_FORWARD:
        v = request.headers.get(h)
        if v:
            out[h] = v
    if "x-request-id" not in out and hasattr(request.state, "request_id"):
        out["x-request-id"] = request.state.request_id
    return out


@app.get("/health")
async def health():
    """BFF health. Optionally check customer-api health."""
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/v1/checkout-context")
async def checkout_context(request: Request):
    """Aggregated cart + addresses for checkout. Forwards auth and X-Request-ID to customer-api."""
    headers = _forward_headers(request)
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            cart_resp = await client.get(f"{_BACKEND}/v1/cart", headers=headers)
            addr_resp = await client.get(f"{_BACKEND}/v1/addresses", headers=headers)
        except httpx.RequestError as e:
            return Response(
                content=f'{{"detail":"Backend unavailable: {e!s}"}}',
                status_code=502,
                media_type="application/json",
            )
    if cart_resp.status_code >= 400 or addr_resp.status_code >= 400:
        err = cart_resp if cart_resp.status_code >= 400 else addr_resp
        return Response(
            content=err.content,
            status_code=err.status_code,
            media_type=err.headers.get("content-type"),
        )
    cart_data = cart_resp.json() if cart_resp.content else {}
    addr_data = addr_resp.json() if addr_resp.content else []
    return Response(
        content=json.dumps({"cart": cart_data, "addresses": addr_data}),
        status_code=200,
        media_type="application/json",
        headers={"x-request-id": getattr(request.state, "request_id", "") or ""},
    )


@app.api_route("/v1/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy_v1(request: Request, path: str):
    """Proxy all /v1/* to customer-api."""
    url = f"{_BACKEND}/v1/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    headers = _forward_headers(request)
    try:
        body = await request.body()
    except Exception:
        body = b""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.request(
                request.method,
                url,
                content=body if body else None,
                headers=headers,
            )
        except httpx.RequestError as e:
            return Response(
                content=f'{{"detail":"Backend unavailable: {e!s}"}}',
                status_code=502,
                media_type="application/json",
            )
    out_headers = {}
    if resp.headers.get("x-request-id"):
        out_headers["x-request-id"] = resp.headers["x-request-id"]
    elif hasattr(request.state, "request_id"):
        out_headers["x-request-id"] = request.state.request_id
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=out_headers,
        media_type=resp.headers.get("content-type"),
    )
