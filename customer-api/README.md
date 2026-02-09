# Customer API

FastAPI backend for the customer-facing e-commerce flow: auth, products (read), cart, orders (create + user history).

## Setup

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python3 reset_and_seed.py  # Fresh DB, or python3 ensure_admin.py for existing DB
python3 -m uvicorn app.main:app --reload
```

API: http://localhost:8000

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
