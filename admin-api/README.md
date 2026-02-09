# Admin API

FastAPI backend for admin: products CRUD, orders management, taxonomies. Uses the same database as `customer-api`.

## Setup

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Database**: Set `DATABASE_URL` in `.env` to the same DB as `customer-api`. Example:

```
DATABASE_URL=sqlite+aiosqlite:///../customer-api/ecommerce.db
```

Ensure admin user exists (run from `customer-api` or set `DATABASE_URL` first):

```bash
cd ../customer-api && python3 ensure_admin.py
# or, with DATABASE_URL set: python3 ensure_admin.py
```

## Run

```bash
python3 -m uvicorn app.main:app --reload --port 8001
```

API docs: http://localhost:8001/docs

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
