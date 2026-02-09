from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, status, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.models.product import Product
from app.models.product_child import ProductChild
from app.models.product_translation import ProductTranslation
from app.models.order import OrderItem
from app.models.product_attribute_value import ProductAttributeValue
from app.models.taxonomy import Taxonomy
from app.models.language import Language
from app.models.taxonomy_attribute import TaxonomyAttributeOption
from app.models.taxonomy_attribute import TaxonomyAttribute
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductChildCreate, ProductChildUpdate, ProductChildResponse,
    SINGLE_SIZE_VALUE,
)
from app.core.deps import get_current_admin_user
from app.core.audit import log_audit_from_request
from app.core.codegen import generate_parent_code, generate_child_code
from app.core.config import settings
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
        selectinload(Product.children),
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
    data = product_in.model_dump(exclude={"attribute_option_ids", "translations", "is_single_size", "single_size_barcode", "single_size_stock", "children"})
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
    data["code"] = await generate_parent_code(db)
    new_product = Product(**data)
    db.add(new_product)
    await db.flush()

    # At least one child required
    if product_in.is_single_size:
        child_code = await generate_child_code(db, new_product.id)
        child = ProductChild(
            product_id=new_product.id,
            code=child_code,
            barcode=product_in.single_size_barcode,
            size_value=settings.SINGLE_SIZE_VALUE,
            stock_quantity=product_in.single_size_stock or 0,
        )
        db.add(child)
    elif product_in.children:
        for ch_in in product_in.children:
            child_code = await generate_child_code(db, new_product.id)
            db.add(ProductChild(
                product_id=new_product.id,
                code=child_code,
                barcode=ch_in.barcode,
                size_value=ch_in.size_value,
                stock_quantity=ch_in.stock_quantity or 0,
            ))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide is_single_size with single_size_barcode, or children list (at least one child required)",
        )

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


@router.get("/{id}/children", response_model=List[ProductChildResponse])
async def list_product_children(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List children (variants/sizes) for a product."""
    result = await db.execute(
        select(ProductChild).where(ProductChild.product_id == id).order_by(ProductChild.size_value)
    )
    return result.scalars().all()


@router.post("/{id}/children", response_model=ProductChildResponse, status_code=status.HTTP_201_CREATED)
async def add_product_child(
    id: str,
    child_in: ProductChildCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Add a child (variant/size). For single-sized product only one child with size_value single_size is allowed."""
    prod = await db.execute(select(Product).where(Product.id == id))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    existing = await db.execute(select(ProductChild).where(ProductChild.product_id == id))
    children = existing.scalars().all()
    if children and len(children) == 1 and getattr(children[0], "size_value", None) == settings.SINGLE_SIZE_VALUE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is single-sized; only one child with size_value single_size is allowed",
        )
    # Unique (product_id, size_value)
    for c in children:
        if (c.size_value or "").strip().lower() == (child_in.size_value or "").strip().lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate size_value for this product")
    code = await generate_child_code(db, id)
    child = ProductChild(
        product_id=id,
        code=code,
        barcode=child_in.barcode,
        size_value=child_in.size_value.strip(),
        stock_quantity=child_in.stock_quantity or 0,
    )
    db.add(child)
    await db.commit()
    await db.refresh(child)
    await log_audit_from_request(db, request, "product_child.create", "product_child", str(child.id), current_user.id, 201)
    return child


@router.put("/{id}/children/{child_id}", response_model=ProductChildResponse)
async def update_product_child(
    id: str,
    child_id: int,
    child_update: ProductChildUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(ProductChild).where(ProductChild.id == child_id, ProductChild.product_id == id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    data = child_update.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(child, k, v)
    await db.commit()
    await db.refresh(child)
    await log_audit_from_request(db, request, "product_child.update", "product_child", str(child_id), current_user.id, 200)
    return child


@router.delete("/{id}/children/{child_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_child(
    id: str,
    child_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    from sqlalchemy import text
    result = await db.execute(
        select(ProductChild).where(ProductChild.id == child_id, ProductChild.product_id == id)
    )
    child = result.scalar_one_or_none()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")
    siblings = await db.execute(select(ProductChild).where(ProductChild.product_id == id))
    if len(siblings.scalars().all()) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product must have at least one child. Add another size before removing this one.",
        )
    cart_use = await db.execute(text("SELECT 1 FROM cart_items WHERE product_child_id = :cid LIMIT 1"), {"cid": child_id})
    if cart_use.scalar():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Child is in a cart; remove cart items first")
    order_use = await db.execute(select(OrderItem.id).where(OrderItem.product_child_id == child_id).limit(1))
    if order_use.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Child is in an order; cannot delete")
    await db.delete(child)
    await db.commit()
    await log_audit_from_request(db, request, "product_child.delete", "product_child", str(child_id), current_user.id, 204)


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
