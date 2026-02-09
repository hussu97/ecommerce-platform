"""i18n endpoints: languages list, set language preference, UI strings."""
from typing import Dict, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db.session import get_db
from app.models.language import Language
from app.models.visitor_preference import VisitorPreference
from app.core.language import resolve_language
from app.core.deps import get_current_user_optional
from app.models.user import User
from app.services.i18n import get_default_language, get_ui_strings

router = APIRouter()


class LanguageResponse(BaseModel):
    id: int
    code: str
    name: str
    is_default: bool = False
    sort_order: int = 0

    class Config:
        from_attributes = True


class SetLanguageRequest(BaseModel):
    language_id: int


@router.get("/languages", response_model=list[LanguageResponse])
async def list_languages(db: AsyncSession = Depends(get_db)):
    """List all supported languages. Public endpoint."""
    result = await db.execute(select(Language).order_by(Language.sort_order, Language.code))
    return result.scalars().all()


@router.get("/strings", response_model=Dict[str, str])
async def get_strings(
    language: Language = Depends(resolve_language),
    db: AsyncSession = Depends(get_db),
):
    """Get UI strings for frontend in resolved language. Falls back to English for missing keys."""
    strings = await get_ui_strings(db, language.id)
    if not strings and language.code != "en":
        default = await get_default_language(db)
        if default:
            strings = await get_ui_strings(db, default.id)
    return strings or {}


@router.post("/preferences/language")
async def set_language(
    body: SetLanguageRequest,
    x_visitor_id: Optional[str] = Header(None, alias="X-Visitor-ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Set language preference. For logged-in users: updates user.preferred_language_id.
    For visitors: requires X-Visitor-ID header, updates visitor_preferences.
    """
    result = await db.execute(select(Language).where(Language.id == body.language_id))
    lang = result.scalar_one_or_none()
    if not lang:
        return {"ok": False, "detail": "Language not found"}

    if current_user:
        current_user.preferred_language_id = body.language_id
        await db.commit()
        return {"ok": True, "language_id": body.language_id, "code": lang.code}

    if x_visitor_id:
        result = await db.execute(
            select(VisitorPreference).where(VisitorPreference.visitor_id == x_visitor_id)
        )
        vp = result.scalar_one_or_none()
        if vp:
            vp.language_id = body.language_id
        else:
            vp = VisitorPreference(visitor_id=x_visitor_id, language_id=body.language_id)
            db.add(vp)
        await db.commit()
        return {"ok": True, "language_id": body.language_id, "code": lang.code}

    return {"ok": False, "detail": "Provide X-Visitor-ID header for guests or log in"}
