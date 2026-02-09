# Customer API

FastAPI backend for the customer-facing e-commerce flow: auth, products (read), cart, orders (create + user history).

## Setup

```bash
cd customer-api
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # optional; defaults use sqlite+aiosqlite:///./ecommerce.db
```

**Database:** For a fresh DB with sample data (admin, customers, products, etc.) run `python3 reset_and_seed.py`. For an existing DB, ensure an admin user with `python3 ensure_admin.py`. To create tables only (no seed), run `python3 ensure_tables.py`.

## Run

```bash
python3 -m uvicorn app.main:app --reload
```

API: http://localhost:8000 (docs: http://localhost:8000/docs). The API is mounted at `/v1`; frontends use `http://localhost:8000/v1` as the base URL.

## API docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

| Group | Prefix | Description |
|-------|--------|-------------|
| Auth | `/auth` | Sign up, login |
| Users | `/users` | Profile (`/me`) |
| Addresses | `/addresses` | CRUD for saved delivery addresses |
| Products | `/products` | Catalog (public read), product detail, reviews |
| Orders | `/orders` | Create order, payment intent, my orders, order detail |
| Cart | `/cart` | Cart (Bearer or `X-Visitor-ID` for guests) |
| i18n | `/i18n` | Languages, UI strings, language preference |

Admin operations (products CRUD, orders management, taxonomies) live in `admin-api/`.
