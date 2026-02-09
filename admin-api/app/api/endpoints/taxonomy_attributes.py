from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.db.session import get_db
from app.models.taxonomy import Taxonomy
from app.models.taxonomy_attribute import TaxonomyAttribute, TaxonomyAttributeOption
from app.models.taxonomy_attribute_translation import (
    TaxonomyAttributeTranslation,
    TaxonomyAttributeOptionTranslation,
)
from app.models.language import Language
from app.models.user import User
from app.schemas.taxonomy import (
    AttributeCreate,
    AttributeUpdate,
    OptionCreate,
    OptionUpdate,
    TaxonomyAttributeResponse,
    TaxonomyAttributeOptionResponse,
)
from app.core.deps import get_current_admin_user
from app.core.audit import log_audit_from_request

router = APIRouter()


def _attr_options():
    return selectinload(TaxonomyAttribute.options)


class AttributeTranslationInput(BaseModel):
    name: str = ""
    options: Dict[str, str] = {}  # option_id (as str in JSON) -> translated value


@router.get("/by-taxonomy/{taxonomy_id}", response_model=List[TaxonomyAttributeResponse])
async def list_attributes_by_taxonomy(
    taxonomy_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(TaxonomyAttribute)
        .where(TaxonomyAttribute.taxonomy_id == taxonomy_id)
        .order_by(TaxonomyAttribute.sort_order, TaxonomyAttribute.name)
        .options(_attr_options())
    )
    return result.scalars().all()


@router.post("/", response_model=TaxonomyAttributeResponse, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    attr_in: AttributeCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    r = await db.execute(select(Taxonomy).where(Taxonomy.id == attr_in.taxonomy_id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taxonomy not found")
    attr = TaxonomyAttribute(
        taxonomy_id=attr_in.taxonomy_id,
        name=attr_in.name,
        sort_order=attr_in.sort_order,
    )
    db.add(attr)
    await db.flush()
    if attr_in.options:
        for i, opt_in in enumerate(attr_in.options):
            opt = TaxonomyAttributeOption(attribute_id=attr.id, value=opt_in.value, sort_order=i)
            db.add(opt)
    await db.commit()
    await db.refresh(attr)
    result = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attr.id).options(_attr_options()))
    created = result.scalar_one_or_none()
    await log_audit_from_request(db, request, "taxonomy_attribute.create", "taxonomy_attribute", str(attr.id), current_user.id, 201)
    await db.commit()
    return created


@router.put("/{attribute_id}", response_model=TaxonomyAttributeResponse)
async def update_attribute(
    attribute_id: int,
    attr_update: AttributeUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attribute_id).options(_attr_options()))
    attr = result.scalar_one_or_none()
    if not attr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    update_data = attr_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(attr, field, value)
    await db.commit()
    await db.refresh(attr)
    result = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attr.id).options(_attr_options()))
    updated = result.scalar_one_or_none()
    await log_audit_from_request(db, request, "taxonomy_attribute.update", "taxonomy_attribute", str(attribute_id), current_user.id, 200)
    await db.commit()
    return updated


@router.delete("/{attribute_id}", response_model=TaxonomyAttributeResponse)
async def deactivate_attribute(
    attribute_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attribute_id).options(_attr_options()))
    attr = result.scalar_one_or_none()
    if not attr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    attr.is_active = False
    await db.commit()
    await db.refresh(attr)
    result = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attr.id).options(_attr_options()))
    deactivated = result.scalar_one_or_none()
    await log_audit_from_request(db, request, "taxonomy_attribute.deactivate", "taxonomy_attribute", str(attribute_id), current_user.id, 200)
    await db.commit()
    return deactivated


@router.patch("/{attribute_id}/activate", response_model=TaxonomyAttributeResponse)
async def activate_attribute(
    attribute_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attribute_id).options(_attr_options()))
    attr = result.scalar_one_or_none()
    if not attr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    attr.is_active = True
    await db.commit()
    await db.refresh(attr)
    result = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attr.id).options(_attr_options()))
    activated = result.scalar_one_or_none()
    await log_audit_from_request(db, request, "taxonomy_attribute.activate", "taxonomy_attribute", str(attribute_id), current_user.id, 200)
    await db.commit()
    return activated


@router.post("/{attribute_id}/options", response_model=TaxonomyAttributeOptionResponse, status_code=status.HTTP_201_CREATED)
async def create_option(
    attribute_id: int,
    opt_in: OptionCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    r = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attribute_id))
    if not r.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")
    opt = TaxonomyAttributeOption(attribute_id=attribute_id, value=opt_in.value)
    db.add(opt)
    await db.flush()
    await db.commit()
    await db.refresh(opt)
    await log_audit_from_request(db, request, "taxonomy_attribute_option.create", "taxonomy_attribute_option", str(opt.id), current_user.id, 201)
    await db.commit()
    return opt


@router.put("/{attribute_id}/options/{option_id}", response_model=TaxonomyAttributeOptionResponse)
async def update_option(
    attribute_id: int,
    option_id: int,
    opt_update: OptionUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaxonomyAttributeOption).where(
        TaxonomyAttributeOption.id == option_id,
        TaxonomyAttributeOption.attribute_id == attribute_id,
    ))
    opt = result.scalar_one_or_none()
    if not opt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
    update_data = opt_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(opt, field, value)
    await db.commit()
    await db.refresh(opt)
    await log_audit_from_request(db, request, "taxonomy_attribute_option.update", "taxonomy_attribute_option", str(option_id), current_user.id, 200)
    await db.commit()
    return opt


@router.delete("/{attribute_id}/options/{option_id}", response_model=TaxonomyAttributeOptionResponse)
async def deactivate_option(
    attribute_id: int,
    option_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaxonomyAttributeOption).where(
        TaxonomyAttributeOption.id == option_id,
        TaxonomyAttributeOption.attribute_id == attribute_id,
    ))
    opt = result.scalar_one_or_none()
    if not opt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
    opt.is_active = False
    await db.commit()
    await db.refresh(opt)
    await log_audit_from_request(db, request, "taxonomy_attribute_option.deactivate", "taxonomy_attribute_option", str(option_id), current_user.id, 200)
    await db.commit()
    return opt


@router.patch("/{attribute_id}/options/{option_id}/activate", response_model=TaxonomyAttributeOptionResponse)
async def activate_option(
    attribute_id: int,
    option_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(select(TaxonomyAttributeOption).where(
        TaxonomyAttributeOption.id == option_id,
        TaxonomyAttributeOption.attribute_id == attribute_id,
    ))
    opt = result.scalar_one_or_none()
    if not opt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Option not found")
    opt.is_active = True
    await db.commit()
    await db.refresh(opt)
    await log_audit_from_request(db, request, "taxonomy_attribute_option.activate", "taxonomy_attribute_option", str(option_id), current_user.id, 200)
    await db.commit()
    return opt


@router.get("/{attribute_id}/translations")
async def get_attribute_translations(
    attribute_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get translations for an attribute (name) and its options (values). Returns { lang_code: { name, options: { option_id: value } } }."""
    attr_res = await db.execute(
        select(TaxonomyAttribute).where(TaxonomyAttribute.id == attribute_id).options(selectinload(TaxonomyAttribute.options))
    )
    attr = attr_res.scalar_one_or_none()
    if not attr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    result = await db.execute(
        select(TaxonomyAttributeTranslation, Language.code)
        .join(Language, TaxonomyAttributeTranslation.language_id == Language.id)
        .where(TaxonomyAttributeTranslation.attribute_id == attribute_id)
    )
    out = {}
    for row in result.all():
        trans, code = row
        out[code] = {"name": trans.name, "options": {}}

    result = await db.execute(
        select(TaxonomyAttributeOptionTranslation, Language.code)
        .join(Language, TaxonomyAttributeOptionTranslation.language_id == Language.id)
        .where(
            TaxonomyAttributeOptionTranslation.option_id.in_(
                [o.id for o in (attr.options or [])]
            )
        )
    )
    for row in result.all():
        trans, code = row
        if code not in out:
            out[code] = {"name": "", "options": {}}
        out[code]["options"][trans.option_id] = trans.value
    return out


class AttributeTranslationsBody(BaseModel):
    translations: Dict[str, AttributeTranslationInput]


@router.put("/{attribute_id}/translations")
async def update_attribute_translations(
    attribute_id: int,
    body: AttributeTranslationsBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update attribute translations. Body: { "ar": { "name": "...", "options": { "1": "value" } } }."""
    attr_res = await db.execute(select(TaxonomyAttribute).where(TaxonomyAttribute.id == attribute_id))
    if not attr_res.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found")

    await db.execute(delete(TaxonomyAttributeTranslation).where(TaxonomyAttributeTranslation.attribute_id == attribute_id))
    opt_res = await db.execute(select(TaxonomyAttributeOption).where(TaxonomyAttributeOption.attribute_id == attribute_id))
    opt_ids = [o.id for o in opt_res.scalars().all()]
    if opt_ids:
        await db.execute(delete(TaxonomyAttributeOptionTranslation).where(TaxonomyAttributeOptionTranslation.option_id.in_(opt_ids)))

    result = await db.execute(select(Language))
    langs = {l.code: l for l in result.scalars().all()}
    for code, t in body.translations.items():
        lang = langs.get(code.lower())
        if not lang:
            continue
        if t.name:
            db.add(TaxonomyAttributeTranslation(attribute_id=attribute_id, language_id=lang.id, name=t.name))
        for opt_id_str, val in (t.options or {}).items():
            try:
                opt_id = int(opt_id_str)
            except (ValueError, TypeError):
                continue
            if opt_id in opt_ids:
                db.add(TaxonomyAttributeOptionTranslation(option_id=opt_id, language_id=lang.id, value=val))
    await db.commit()
    return {"ok": True}
