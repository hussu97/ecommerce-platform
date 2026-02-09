"""Admin i18n: languages, UI strings CRUD."""
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db.session import get_db
from app.models.language import Language
from app.models.ui_string import UIString
from app.core.deps import get_current_admin_user
from app.models.user import User

router = APIRouter()


class LanguageResponse(BaseModel):
    id: int
    code: str
    name: str
    is_default: bool = False
    sort_order: int = 0

    class Config:
        from_attributes = True


class UIStringCreate(BaseModel):
    key: str
    language_id: int
    value: str


class UIStringUpdate(BaseModel):
    value: str


class UIStringBulkUpdate(BaseModel):
    strings: Dict[str, str]  # key -> value for one language


@router.get("/languages", response_model=List[LanguageResponse])
async def list_languages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Language).order_by(Language.sort_order, Language.code))
    return result.scalars().all()


@router.get("/strings")
async def get_strings_by_language(
    language_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(UIString.key, UIString.value).where(UIString.language_id == language_id)
    )
    return {row[0]: row[1] for row in result.all()}


@router.put("/strings/{language_id}")
async def bulk_update_strings(
    language_id: int,
    body: UIStringBulkUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(Language).where(Language.id == language_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Language not found")
    for key, value in body.strings.items():
        r = await db.execute(
            select(UIString).where(UIString.key == key).where(UIString.language_id == language_id)
        )
        ui = r.scalar_one_or_none()
        if ui:
            ui.value = value
        else:
            db.add(UIString(key=key, language_id=language_id, value=value))
    await db.commit()
    return {"ok": True}
