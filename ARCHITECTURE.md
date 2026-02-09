# Architecture

## Overview

| Component | Folder | Port | Purpose |
|-----------|--------|------|---------|
| **Customer API** | `customer-api/` | 8000 | Auth, products (read), cart, orders, addresses, i18n |
| **Admin API** | `admin-api/` | 8001 | Admin-only: products CRUD, orders management, taxonomies, brands |
| **Customer Web** | `customer-web/` | 3000 | Next.js customer web app |
| **Admin Web** | `admin-web/` | 5173 | Desktop admin dashboard (React + Vite) |
| **Shop** | `shop/` | - | Cross-platform app (React Native + Expo) |

## Design tokens

Design tokens (colors, radius, typography) are defined in a single source: `packages/design-tokens`. The package exposes `tokens.json`, a generated `dist/theme.css` (Tailwind v4 `@theme`), and a JS export for React Native. **customer-web** and **admin-web** import `@ecommerce/design-tokens/theme.css`; **shop** imports the package and uses it in `constants/Colors.ts`. Token changes must be made only in `packages/design-tokens` (see `.cursor/rules/project-standards.mdc`). Each app may apply tokens differently for platform-appropriate UI (web vs mobile web vs app).

## Shared Database

Both `customer-api` and `admin-api` use the same SQLite database. Set `admin-api`'s `DATABASE_URL` to the same path as `customer-api`.

## Key Models (Customer API)

- **User** – Auth, profile, role (customer/admin)
- **Product** – Catalog (code, slug, content, price). Stock lives on **ProductChild** only.
- **ProductChild** – Variants/sizes per product: code, barcode, size_value (e.g. "S", "M", "L", or "single_size"), stock_quantity, stock_reserved. Every product has at least one child.
- **Order** / **OrderItem** – OrderItem has required product_child_id. Orders always reference a child.
- **CustomerAddress** – Saved delivery addresses (address_code, user_id)
- **ProductReview** – Reviews linked to order items
- **CartItem** – Guest (X-Visitor-ID) or logged-in; required product_child_id (cart always references a child)
- **StockReservation** – Required product_child_id; reservations target a child

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

### Option A: Docker Compose (recommended for local dev)

All backend and web frontends in containers, shared SQLite and uploads in volumes:

```bash
docker compose up --build
```

- Customer Web: http://localhost:3000
- Admin Web: http://localhost:5173
- Customer API: http://localhost:8000
- Admin API: http://localhost:8001

An **init** service seeds the DB once (admin + sample data). **Shop** is not in Docker; run `cd shop && npm start` on the host and set `EXPO_PUBLIC_API_URL=http://localhost:8000/v1`. See [docs/DOCKER.md](docs/DOCKER.md).

### Option B: Run services manually

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
- Languages (en, ar), taxonomies, brands, products (each product has a required `code` and at least one **ProductChild** with size_value `single_size` and stock)
- UI strings (EN+AR), including "size" and "select_size"
- Sample addresses, orders (3–5 per customer with order items referencing product_child_id), and product reviews
