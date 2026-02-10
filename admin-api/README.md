# Admin API

FastAPI backend for admin: products CRUD, orders management, taxonomies. Uses the same database as `customer-api`.

## Setup

```bash
cd admin-api
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Database:** Set `DATABASE_URL` in `.env` to the same DB as `customer-api` (see **Environment** below).

Ensure the admin user exists (run once from `customer-api` or with `admin-api`’s `DATABASE_URL` set):

```bash
cd customer-api && python3 ensure_admin.py
```

## Run

```bash
python3 -m uvicorn app.main:app --reload --port 8001
```

API: http://127.0.0.1:8001 (docs: http://127.0.0.1:8001/docs). Base path is `/v1`; admin-web proxies `/api` to this. Use 127.0.0.1 if localhost fails (e.g. IPv6 on macOS).

## Bulk Import Worker

For async bulk product uploads, run the worker in a separate terminal:

```bash
cd admin-api
python -m app.workers.bulk_import
```

The worker polls for pending uploads every 5 seconds, parses xlsx/csv/tsv files, and creates products. Ensure `DATABASE_URL` and `STORAGE_PATH` are set (see **Environment** below).

## Environment

**How to set variables:** Create a `.env` file in the `admin-api/` directory. Add one line per variable, e.g.:

```bash
DATABASE_URL=sqlite+aiosqlite:///../customer-api/ecommerce.db
SECRET_KEY=your-secret-key
STORAGE_PATH=./uploads
```

The app loads `.env` automatically (pydantic-settings). Restart uvicorn (and the bulk-import worker if running) after changing `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | Same DB as customer-api (e.g. `sqlite+aiosqlite:///../customer-api/ecommerce.db`). |
| `SECRET_KEY` | — | JWT secret; use same as customer-api for shared auth. |
| `STORAGE_PATH` | `./uploads` | Directory for bulk-upload files. |

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
