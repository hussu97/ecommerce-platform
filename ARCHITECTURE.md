# Architecture

## Overview

| Component | Folder | Port | Purpose |
|-----------|--------|------|---------|
| **Customer API** | `customer-api/` | 8000 | Auth, products (read), cart, orders, addresses, i18n |
| **Admin API** | `admin-api/` | 8001 | Admin-only: products CRUD, orders management, taxonomies, brands |
| **Customer Web** | `customer-web/` | 3000 | Next.js customer web app |
| **Admin Web** | `admin-web/` | 5173 | Desktop admin dashboard (React + Vite) |
| **Shop** | `shop/` | - | Cross-platform app (React Native + Expo) |

## Shared Database

Both `customer-api` and `admin-api` use the same SQLite database. Set `admin-api`'s `DATABASE_URL` to the same path as `customer-api`.

## Key Models (Customer API)

- **User** – Auth, profile, role (customer/admin)
- **Product** – Catalog, translations, attributes
- **Order** / **OrderItem** – Orders with line items
- **CustomerAddress** – Saved delivery addresses (address_code, user_id)
- **ProductReview** – Reviews linked to order items
- **CartItem** – Guest (X-Visitor-ID) or logged-in
- **StockReservation** – Reserved stock on order creation

## API Endpoints (Customer API)

| Prefix | Description |
|--------|-------------|
| `/auth` | Sign up, login |
| `/users` | Profile (`/me`) |
| `/addresses` | CRUD for saved delivery addresses |
| `/products` | Catalog (public read), product detail, reviews |
| `/orders` | Create order, payment intent, my orders, order detail |
| `/cart` | Cart (Bearer or X-Visitor-ID) |
| `/i18n` | Languages, UI strings, language preference |

## Multi-language (i18n)

- **Languages table**: `languages` – new languages added here are supported across admin + customer apps.
- **Translation tables**: products, taxonomies, brands, attributes, options, UI strings.
- **Language resolution**: query `?lang=`, Accept-Language header, user/visitor preference, default English.
- **Visitor/user preference**: POST `/i18n/preferences/language` (user or X-Visitor-ID).

## Running All Services

1. **Customer API** (8000): `cd customer-api && python3 -m uvicorn app.main:app --reload`
2. **Admin API** (8001): `cd admin-api && python3 -m uvicorn app.main:app --reload --port 8001`
3. **Customer Web** (3000): `cd customer-web && npm run dev`
4. **Admin Web** (5173): `cd admin-web && npm run dev`
5. **Shop**: `cd shop && npm start`

## Admin User

```bash
cd customer-api && python3 ensure_admin.py
```

Credentials: `admin@example.com` / `admin123`

## Sample Data

Run `python3 reset_and_seed.py` in `customer-api/` to seed:

- Admin user
- 4 sample customers: `customer1@example.com` … `customer4@example.com` / `customer123`
- Languages (en, ar), taxonomies, brands, products
- UI strings (EN+AR)
- Sample addresses, orders (3–5 per customer), and product reviews
