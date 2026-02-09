"""HTTPS redirect and security headers middleware."""
from typing import Optional
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse


def get_https_redirect_middleware(force_redirect: bool):
    """Return HTTPS redirect middleware when force_redirect is True."""

    class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            if not force_redirect:
                return await call_next(request)
            proto = request.headers.get("X-Forwarded-Proto", "").lower()
            if proto == "https":
                return await call_next(request)
            host = request.headers.get("X-Forwarded-Host") or request.url.hostname or "localhost"
            port = request.headers.get("X-Forwarded-Port")
            path = request.url.path
            if request.url.query:
                path = f"{path}?{request.url.query}"
            url = f"https://{host}"
            if port and port != "443":
                url = f"{url}:{port}"
            url = f"{url}{path}"
            return RedirectResponse(url=url, status_code=301)

    return HTTPSRedirectMiddleware


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    def __init__(self, app, csp: Optional[str] = None):
        super().__init__(app)
        self.csp = csp

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        proto = request.headers.get("X-Forwarded-Proto", "").lower()
        if proto == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        if self.csp:
            response.headers["Content-Security-Policy"] = self.csp
        return response


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Generate and attach X-Request-ID to each request and response."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
