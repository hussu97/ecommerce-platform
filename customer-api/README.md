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

API: http://127.0.0.1:8000 (docs: http://127.0.0.1:8000/docs). The API is mounted at `/v1`; frontends use `http://127.0.0.1:8000/v1` as the base URL. Use 127.0.0.1 if localhost fails (e.g. IPv6 on macOS).

## Environment

**How to set variables:** Create a `.env` file in the `customer-api/` directory. Copy from `.env.example` if present (`cp .env.example .env`), then edit. The app loads `.env` automatically (pydantic-settings). Restart uvicorn after changing variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./ecommerce.db` | Database URL (same DB as admin-api for shared data). |
| `SECRET_KEY` | (set in production) | Used for JWT; change in production. |

## API docs

- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

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
