"""Language resolution: query param > header > user preference > visitor preference > default (English)."""
from typing import Optional
from fastapi import Query, Request, Header, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.language import Language
from app.models.visitor_preference import VisitorPreference
from app.models.user import User
from app.core.deps import get_current_user_optional
from app.services.i18n import get_default_language


async def resolve_language(
    request: Request,
    lang: Optional[str] = Query(None, description="Language code (en, ar, zh)"),
    accept_language: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Language:
    """
    Resolve language from (in order):
    1. Query param ?lang=ar
    2. Accept-Language header
    3. User preference (if logged in)
    4. Visitor preference (if X-Visitor-ID)
    5. Default language (English)
    """
    visitor_id = request.headers.get("X-Visitor-ID")

    # 1. Query param
    if lang:
        result = await db.execute(select(Language).where(Language.code == lang.lower()))
        resolved = result.scalar_one_or_none()
        if resolved:
            return resolved

    # 2. Accept-Language header (e.g. "ar-SA,ar;q=0.9,en;q=0.8")
    if accept_language:
        for part in accept_language.split(","):
            code = part.split(";")[0].strip().split("-")[0]
            result = await db.execute(select(Language).where(Language.code == code.lower()))
            resolved = result.scalar_one_or_none()
            if resolved:
                return resolved

    # 3. User preference
    if current_user and current_user.preferred_language_id:
        result = await db.execute(
            select(Language).where(Language.id == current_user.preferred_language_id)
        )
        resolved = result.scalar_one_or_none()
        if resolved:
            return resolved

    # 4. Visitor preference
    if visitor_id:
        result = await db.execute(
            select(VisitorPreference).where(VisitorPreference.visitor_id == visitor_id)
        )
        vp = result.scalar_one_or_none()
        if vp and vp.language_id:
            result = await db.execute(select(Language).where(Language.id == vp.language_id))
            resolved = result.scalar_one_or_none()
            if resolved:
                return resolved

    # 5. Default
    default = await get_default_language(db)
    if default:
        return default

    # Fallback: create in-memory English if DB empty
    return Language(id=1, code="en", name="English", is_default=True, sort_order=0)
