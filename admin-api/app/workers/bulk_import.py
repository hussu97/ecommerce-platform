"""
Bulk product import worker. Polls for pending uploads and processes them.
Run: cd admin-api && python -m app.workers.bulk_import
"""
from __future__ import annotations

import asyncio
import csv
import io
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Ensure admin-api is on path when run from project root
if str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import AsyncSessionLocal
from app.models.product import Product
from app.models.product_translation import ProductTranslation
from app.models.product_attribute_value import ProductAttributeValue
from app.models.product_bulk_upload import ProductBulkUpload
from app.models.user import User  # ensure User is in registry for ProductBulkUpload.user_rel
from app.models.taxonomy import Taxonomy
from app.models.taxonomy_attribute import TaxonomyAttribute, TaxonomyAttributeOption
from app.models.brand import Brand
from app.models.language import Language
from app.storage import get_storage


POLL_INTERVAL = 5


def _slugify(s: str) -> str:
    s = (s or "").lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-") or "untitled"


def _parse_xlsx(content: bytes) -> tuple[list[str], list[dict]]:
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return [], []
    headers = [str(h or "").strip() for h in rows[0]]
    data = []
    for row in rows[1:]:
        row_dict = {}
        for i, h in enumerate(headers):
            if i < len(row) and row[i] is not None:
                val = row[i]
                if isinstance(val, (int, float)) and "price" in h.lower() or "stock" in h.lower() or "id" in h.lower():
                    row_dict[h] = val
                else:
                    row_dict[h] = str(val).strip() if val else ""
            else:
                row_dict[h] = ""
        data.append(row_dict)
    wb.close()
    return headers, data


def _parse_csv(content: bytes) -> tuple[list[str], list[dict]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    data = list(reader)
    return list(headers), data


def _parse_tsv(content: bytes) -> tuple[list[str], list[dict]]:
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text), delimiter="\t")
    headers = reader.fieldnames or []
    data = list(reader)
    return list(headers), data


def _parse_file(content: bytes, ext: str) -> tuple[list[str], list[dict]]:
    if ext == ".xlsx":
        return _parse_xlsx(content)
    if ext == ".csv":
        return _parse_csv(content)
    if ext == ".tsv":
        return _parse_tsv(content)
    raise ValueError(f"Unsupported format: {ext}")


async def _process_row(
    db: AsyncSession,
    row: dict,
    row_num: int,
    taxonomy_id: int,
    attr_name_to_option_ids: dict[str, dict[str, int]],
    lang_en_id: Optional[int],
    lang_ar_id: Optional[int],
    brands_by_id: dict[int, Brand],
    brands_by_name: dict[str, Brand],
) -> tuple[bool, Optional[str]]:
    """Process one row. Returns (success, error_message)."""
    name_en = (row.get("name_en") or "").strip()
    name_ar = (row.get("name_ar") or "").strip()
    name = name_en or name_ar
    if not name:
        return False, "name_en or name_ar required"
    try:
        price = float(row.get("price") or 0)
    except (ValueError, TypeError):
        return False, "invalid price"
    if price < 0:
        return False, "price must be >= 0"
    stock = 0
    try:
        stock = int(float(row.get("stock_quantity") or 0))
    except (ValueError, TypeError):
        pass
    category_id = taxonomy_id
    try:
        cid = row.get("category_id")
        if cid is not None and str(cid).strip():
            category_id = int(float(cid))
    except (ValueError, TypeError):
        pass
    brand_id = None
    brand_val = row.get("brand_id") or row.get("brand_name")
    if brand_val is not None and str(brand_val).strip():
        try:
            bid = int(float(brand_val))
            if bid in brands_by_id:
                brand_id = bid
        except (ValueError, TypeError):
            pass
        if brand_id is None and isinstance(brand_val, str):
            b = brands_by_name.get(brand_val.strip().lower())
            brand_id = b.id if b else None
    is_active = True
    av = str(row.get("is_active", "")).strip().lower()
    if av in ("0", "false", "no", "inactive"):
        is_active = False
    base_slug = _slugify(name)
    slug = base_slug
    n = 1
    while True:
        r = await db.execute(select(Product.id).where(Product.slug == slug))
        if r.scalar_one_or_none() is None:
            break
        slug = f"{base_slug}-{n}"
        n += 1
    product = Product(
        name=name,
        slug=slug,
        description=(row.get("description_en") or row.get("description_ar") or "").strip() or None,
        price=price,
        stock_quantity=max(0, stock),
        image_url=(row.get("image_url") or "").strip() or None,
        category_id=category_id,
        brand_id=brand_id,
        is_active=is_active,
    )
    db.add(product)
    await db.flush()
    if name_en and lang_en_id:
        db.add(ProductTranslation(product_id=product.id, language_id=lang_en_id, name=name_en, description=(row.get("description_en") or "").strip() or None))
    if name_ar and lang_ar_id:
        db.add(ProductTranslation(product_id=product.id, language_id=lang_ar_id, name=name_ar, description=(row.get("description_ar") or "").strip() or None))
    if not name_en and not name_ar and lang_en_id:
        db.add(ProductTranslation(product_id=product.id, language_id=lang_en_id, name=name, description=(row.get("description_en") or row.get("description_ar") or "").strip() or None))
    for attr_name, value_to_opt_id in attr_name_to_option_ids.items():
        val = (row.get(attr_name) or "").strip()
        if not val:
            continue
        opt_id = value_to_opt_id.get(val.lower()) or value_to_opt_id.get(val)
        if opt_id:
            db.add(ProductAttributeValue(product_id=product.id, option_id=opt_id))
    return True, None


async def process_upload(upload: ProductBulkUpload, content: bytes, ext: str) -> None:
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(ProductBulkUpload).where(ProductBulkUpload.id == upload.id))
        u = r.scalar_one_or_none()
        if u:
            u.status = "processing"
            u.started_at = datetime.utcnow()
            await db.commit()
    try:
        headers, rows = _parse_file(content, ext)
        total = len(rows)
    except Exception as e:
        async with AsyncSessionLocal() as db:
            r = await db.execute(select(ProductBulkUpload).where(ProductBulkUpload.id == upload.id))
            u = r.scalar_one_or_none()
            if u:
                u.status = "failed"
                u.error_details = {"0": str(e)}
                u.completed_at = datetime.utcnow()
            await db.commit()
        return
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(ProductBulkUpload).where(ProductBulkUpload.id == upload.id))
        u = r.scalar_one_or_none()
        if not u:
            return
        u.total_rows = total
        await db.commit()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Taxonomy)
            .where(Taxonomy.id == upload.taxonomy_id)
            .options(selectinload(Taxonomy.attributes).selectinload(TaxonomyAttribute.options))
        )
        taxonomy = result.scalar_one_or_none()
    if not taxonomy:
        async with AsyncSessionLocal() as db:
            r = await db.execute(select(ProductBulkUpload).where(ProductBulkUpload.id == upload.id))
            u = r.scalar_one_or_none()
            if u:
                u.status = "failed"
                u.error_details = {"0": "Taxonomy not found"}
                u.completed_at = datetime.utcnow()
            await db.commit()
        return
    attr_name_to_option_ids: dict[str, dict[str, int]] = {}
    for attr in taxonomy.attributes or []:
        if not attr.is_active:
            continue
        value_to_opt_id = {}
        for opt in attr.options or []:
            if opt.is_active:
                value_to_opt_id[opt.value.lower()] = opt.id
                value_to_opt_id[opt.value] = opt.id
        attr_name_to_option_ids[attr.name] = value_to_opt_id
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Language))
        langs = {l.code.lower(): l for l in result.scalars().all()}
        lang_en = langs.get("en")
        lang_ar = langs.get("ar")
        lang_en_id = lang_en.id if lang_en else None
        lang_ar_id = lang_ar.id if lang_ar else None
        result = await db.execute(select(Brand))
        brands = result.scalars().all()
    brands_by_id = {b.id: b for b in brands}
    brands_by_name = {b.name.lower(): b for b in brands}
    processed = 0
    errors = 0
    error_details: dict = {}
    async with AsyncSessionLocal() as db:
        for i, row in enumerate(rows):
            row_num = i + 2
            ok, err = await _process_row(
                db, row, row_num, upload.taxonomy_id or 0,
                attr_name_to_option_ids, lang_en_id, lang_ar_id,
                brands_by_id, brands_by_name,
            )
            if ok:
                processed += 1
                await db.commit()
            else:
                errors += 1
                error_details[str(row_num)] = err or "Unknown error"
                await db.rollback()
        r = await db.execute(select(ProductBulkUpload).where(ProductBulkUpload.id == upload.id))
        u = r.scalar_one_or_none()
        if u:
            u.status = "completed"
            u.processed_rows = processed
            u.error_rows = errors
            u.error_details = error_details if error_details else None
            u.completed_at = datetime.utcnow()
        await db.commit()


async def run_worker():
    storage = get_storage()
    print("Bulk import worker started. Polling for pending uploads...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(ProductBulkUpload)
                    .where(ProductBulkUpload.status == "pending")
                    .order_by(ProductBulkUpload.created_at)
                    .limit(1)
                )
                upload = result.scalar_one_or_none()
                if upload:
                    try:
                        content = storage.get(upload.storage_path)
                    except Exception as e:
                        upload.status = "failed"
                        upload.error_details = {"0": f"Failed to read file: {e}"}
                        upload.completed_at = datetime.utcnow()
                        await db.commit()
                    else:
                        ext = os.path.splitext(upload.filename or "")[1].lower()
                        if ext not in {".xlsx", ".csv", ".tsv"}:
                            upload.status = "failed"
                            upload.error_details = {"0": f"Unsupported format: {ext}"}
                            upload.completed_at = datetime.utcnow()
                            await db.commit()
                        else:
                            await db.commit()
                            await process_upload(upload, content, ext)
        except Exception as e:
            print(f"Worker error: {e}", flush=True)
        await asyncio.sleep(POLL_INTERVAL)


def main():
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
