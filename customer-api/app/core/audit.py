"""Audit logging helper."""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from app.models.audit_log import AuditLog


async def log_audit(
    db: AsyncSession,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    method: Optional[str] = None,
    path: Optional[str] = None,
    status_code: Optional[int] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_summary: Optional[str] = None,
):
    """Create an audit log entry."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        method=method,
        path=path,
        status_code=status_code,
        ip=ip,
        user_agent=user_agent,
        request_summary=request_summary,
    )
    db.add(entry)
    await db.flush()


def _client_ip(request: Request) -> Optional[str]:
    """Get client IP from X-Forwarded-For or direct connection."""
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def log_audit_from_request(
    db: AsyncSession,
    request: Request,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    status_code: Optional[int] = None,
):
    """Create audit log entry with data from request."""
    await log_audit(
        db=db,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=user_id,
        method=request.method if request else None,
        path=request.url.path if request else None,
        status_code=status_code,
        ip=_client_ip(request) if request else None,
        user_agent=request.headers.get("User-Agent") if request else None,
    )
