from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, status, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.product import Product
from app.models.product_translation import ProductTranslation
from app.models.product_attribute_value import ProductAttributeValue
from app.models.taxonomy import Taxonomy
from app.models.language import Language
from app.models.taxonomy_attribute import TaxonomyAttributeOption
from app.models.taxonomy_attribute import TaxonomyAttribute
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.core.deps import get_current_admin_user
from app.core.audit import log_audit_from_request
from app.services.bulk_template import generate_xlsx, generate_csv, generate_tsv
from app.models.product_bulk_upload import ProductBulkUpload
from app.storage import get_storage

router = APIRouter()

ALLOWED_EXTENSIONS = {".xlsx", ".csv", ".tsv"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _slugify(s: str) -> str:
    import re
    s = (s or "").lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "untitled"


def _product_options():
    return (
        selectinload(Product.category_rel),
        selectinload(Product.brand_rel),
        selectinload(Product.attribute_values).selectinload(ProductAttributeValue.option_rel).selectinload(TaxonomyAttributeOption.attribute),
    )


@router.get("/bulk/template/{taxonomy_id}")
async def get_bulk_template(
    taxonomy_id: int,
    format: str = Query("xlsx", regex="^(xlsx|csv|tsv)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Download bulk product import template for the given taxonomy. Formats: xlsx (with dropdowns), csv, tsv."""
    result = await db.execute(
        select(Taxonomy)
        .where(Taxonomy.id == taxonomy_id)
        .options(selectinload(Taxonomy.attributes).selectinload(TaxonomyAttribute.options))
    )
    taxonomy = result.scalar_one_or_none()
    if not taxonomy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taxonomy not found")
    if format == "xlsx":
        content = generate_xlsx(taxonomy)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"bulk_product_template_{taxonomy_id}.xlsx"
    elif format == "csv":
        content = generate_csv(taxonomy)
        media_type = "text/csv"
        filename = f"bulk_product_template_{taxonomy_id}.csv"
    else:
        content = generate_tsv(taxonomy)
        media_type = "text/tab-separated-values"
        filename = f"bulk_product_template_{taxonomy_id}.tsv"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/bulk/upload")
async def upload_bulk_products(
    file: UploadFile = File(...),
    taxonomy_id: int = Form(...),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Upload xlsx/csv/tsv file for async bulk product import. Returns upload id and status."""
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Allowed formats: xlsx, csv, tsv. Got: {ext or 'no extension'}",
        )
    result = await db.execute(select(Taxonomy).where(Taxonomy.id == taxonomy_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Taxonomy not found")
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max {MAX_FILE_SIZE // (1024 * 1024)} MB",
        )
    storage = get_storage()
    upload = ProductBulkUpload(
        filename=file.filename or "upload",
        storage_path="",
        taxonomy_id=taxonomy_id,
        status="pending",
        total_rows=0,
        created_by=current_user.id,
    )
    db.add(upload)
    await db.flush()
    storage_path = f"bulk/{upload.id}/{file.filename or 'upload'}"
    from io import BytesIO
    buf = BytesIO(content)
    storage.save(buf, storage_path)
    upload.storage_path = storage_path
    await db.commit()
    await db.refresh(upload)
    return {
        "id": upload.id,
        "filename": upload.filename,
        "taxonomy_id": upload.taxonomy_id,
        "status": upload.status,
        "message": "File uploaded. Processing will begin shortly.",
    }


@router.get("/bulk/uploads")
async def list_bulk_uploads(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List bulk upload jobs with status."""
    result = await db.execute(
        select(ProductBulkUpload)
        .order_by(ProductBulkUpload.created_at.desc())
        .limit(100)
    )
    uploads = result.scalars().all()
    return [
        {
            "id": u.id,
            "filename": u.filename,
            "taxonomy_id": u.taxonomy_id,
            "status": u.status,
            "total_rows": u.total_rows,
            "processed_rows": u.processed_rows,
            "error_rows": u.error_rows,
            "error_details": u.error_details,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "completed_at": u.completed_at.isoformat() if u.completed_at else None,
        }
        for u in uploads
    ]


@router.get("/bulk/uploads/{upload_id}")
async def get_bulk_upload_status(
    upload_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get single bulk upload status."""
    result = await db.execute(select(ProductBulkUpload).where(ProductBulkUpload.id == upload_id))
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found")
    return {
        "id": upload.id,
        "filename": upload.filename,
        "taxonomy_id": upload.taxonomy_id,
        "status": upload.status,
        "total_rows": upload.total_rows,
        "processed_rows": upload.processed_rows,
        "error_rows": upload.error_rows,
        "error_details": upload.error_details,
        "created_at": upload.created_at.isoformat() if upload.created_at else None,
        "started_at": upload.started_at.isoformat() if upload.started_at else None,
        "completed_at": upload.completed_at.isoformat() if upload.completed_at else None,
    }


@router.get("/", response_model=List[ProductResponse])
async def list_all_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Product).order_by(Product.id).options(*_product_options())
    )
    return result.scalars().all()


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    data = product_in.model_dump(exclude={"attribute_option_ids", "translations"})
    base_slug = _slugify(data.get("name") or "product")
    slug = base_slug
    n = 1
    while True:
        r = await db.execute(select(Product.id).where(Product.slug == slug))
        if r.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{n}"
        n += 1
    data["slug"] = slug
    new_product = Product(**data)
    db.add(new_product)
    await db.flush()
    for opt_id in product_in.attribute_option_ids or []:
        db.add(ProductAttributeValue(product_id=new_product.id, option_id=opt_id))
    if product_in.translations:
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in product_in.translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(ProductTranslation(product_id=new_product.id, language_id=lang.id, name=t.name, description=t.description))
    await db.commit()
    await db.refresh(new_product)
    await log_audit_from_request(db, request, "product.create", "product", str(new_product.id), current_user.id, 201)
    await db.commit()
    result = await db.execute(
        select(Product).where(Product.id == new_product.id).options(*_product_options())
    )
    return result.scalar_one_or_none()


@router.put("/{id}", response_model=ProductResponse)
async def update_product(
    id: str,
    product_update: ProductUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Product).where(Product.id == id).options(*_product_options())
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    update_data = product_update.model_dump(exclude_unset=True)
    attr_ids = update_data.pop("attribute_option_ids", None)
    if "name" in update_data:
        base_slug = _slugify(update_data.get("name") or "product")
        slug = base_slug
        n = 1
        while True:
            r = await db.execute(select(Product.id).where(Product.slug == slug).where(Product.id != product.id))
            if r.scalar_one_or_none() is None:
                break
            slug = f"{base_slug}-{n}"
            n += 1
        update_data["slug"] = slug
    for field, value in update_data.items():
        setattr(product, field, value)
    if attr_ids is not None:
        from sqlalchemy import delete
        await db.execute(delete(ProductAttributeValue).where(ProductAttributeValue.product_id == product.id))
        for opt_id in attr_ids:
            db.add(ProductAttributeValue(product_id=product.id, option_id=opt_id))
    if product_update.translations is not None:
        from sqlalchemy import delete
        await db.execute(delete(ProductTranslation).where(ProductTranslation.product_id == product.id))
        result = await db.execute(select(Language))
        langs = {l.code: l for l in result.scalars().all()}
        for code, t in product_update.translations.items():
            lang = langs.get(code.lower())
            if lang:
                db.add(ProductTranslation(product_id=product.id, language_id=lang.id, name=t.name, description=t.description))
    await db.commit()
    await db.refresh(product)
    await log_audit_from_request(db, request, "product.update", "product", id, current_user.id, 200)
    await db.commit()
    result = await db.execute(
        select(Product).where(Product.id == product.id).options(*_product_options())
    )
    return result.scalar_one_or_none()


@router.get("/{id}/translations")
async def get_product_translations(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get translations for a product. Returns { lang_code: { name, description } }."""
    result = await db.execute(
        select(ProductTranslation, Language.code)
        .join(Language, ProductTranslation.language_id == Language.id)
        .where(ProductTranslation.product_id == id)
    )
    out = {}
    for row in result.all():
        trans, code = row
        out[code] = {"name": trans.name, "description": trans.description}
    return out


@router.delete("/{id}", response_model=ProductResponse)
async def delete_product(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Product).where(Product.id == id).options(*_product_options())
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    product.is_active = False
    await db.commit()
    await db.refresh(product)
    await log_audit_from_request(db, request, "product.delete", "product", id, current_user.id, 200)
    await db.commit()
    result = await db.execute(
        select(Product).where(Product.id == product.id).options(*_product_options())
    )
    return result.scalar_one_or_none()
