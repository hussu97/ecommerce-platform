# Admin API

FastAPI backend for admin: products CRUD, orders management, taxonomies. Uses the same database as `customer-api`.

## Setup

```bash
cd admin-api
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Database:** Set `DATABASE_URL` in `.env` to the same DB as `customer-api`. Example:

```
DATABASE_URL=sqlite+aiosqlite:///../customer-api/ecommerce.db
```

Ensure the admin user exists (run once from `customer-api` or with `admin-api`’s `DATABASE_URL` set):

```bash
cd customer-api && python3 ensure_admin.py
```

## Run

```bash
python3 -m uvicorn app.main:app --reload --port 8001
```

API: http://localhost:8001 (docs: http://localhost:8001/docs). Base path is `/v1`; admin-web proxies `/api` to this.

## Bulk Import Worker

For async bulk product uploads, run the worker in a separate terminal:

```bash
cd admin-api
python -m app.workers.bulk_import
```

The worker polls for pending uploads every 5 seconds, parses xlsx/csv/tsv files, and creates products. Ensure `DATABASE_URL` and `STORAGE_PATH` (default: `./uploads`) are set.

## Endpoints

- `POST /auth/login` – Admin login (requires `is_superuser`)
- `GET /auth/me` – Current admin user
- `GET /products` – List all products
- `POST /products` – Create product
- `PUT /products/{id}` – Update product
- `DELETE /products/{id}` – Soft delete product
- `GET /orders` – List all orders
- `PUT /orders/{id}/status` – Update order status
- `GET /taxonomies` – List taxonomies
- `GET /brands` – List brands
- `GET /taxonomy-attributes` – List taxonomy attributes
- `GET /products/bulk/template/{taxonomy_id}` – Download bulk product template (xlsx/csv/tsv)
- `POST /products/bulk/upload` – Upload file for bulk import (multipart: file, taxonomy_id)
- `GET /products/bulk/uploads` – List bulk upload jobs and status
