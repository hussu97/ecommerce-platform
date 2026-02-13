# Architecture

## Overview

| Component | Folder | Purpose |
|-----------|--------|---------|
| **Customer BFF** | `customer-bff/` | Optional layer in front of customer-api: proxy, rate limiting, aggregation (e.g. checkout-context). Used by customer-web and shop when configured. |
| **Customer API** | `customer-api/` | Auth, products (read), cart, orders, addresses, i18n |
| **Admin API** | `admin-api/` | Admin-only: products CRUD, orders management, taxonomies, brands |
| **Discovery API** | `discovery-api/` | Product discovery pipeline: strategies, runs, list/filter discovered products (own DB) |
| **Customer Web** | `customer-web/` | Next.js customer web app |
| **Admin Web** | `admin-web/` | Desktop admin dashboard (React + Vite) |
| **Discovery Web** | `discovery-web/` | Discovery dashboard: view products, filters, trigger runs |
| **Shop** | `shop/` | Cross-platform app (React Native + Expo) |

## Ports

Ports are split so **local dev** and **Docker** can run in parallel without conflicts. When adding a new service, assign the next free port in both columns and update this table, [docker-compose.yml](docker-compose.yml), and [docs/DOCKER.md](docs/DOCKER.md).

| Service | Local dev (host) | Docker (host, published) |
|---------|-------------------|---------------------------|
| Customer BFF | 8010 | 8012 |
| Customer API | 8000 | 8002 |
| Admin API | 8001 | 8003 |
| Discovery API | 8004 | 8006 |
| Customer Web | 3000 | 3002 |
| Admin Web | 5173 | 5174 |
| Discovery Web | 5175 | 5176 |
| Redis (optional) | 6379 | 6379 (profile `with-redis`) |

## Design tokens

Design tokens (colors, radius, typography) are defined in two theme files that must be kept in sync: **customer-web** `customer-web/app/theme.css` and **admin-web** `admin-web/src/theme.css`. **shop** uses the same values in `shop/constants/Colors.ts`. When changing any token, update both theme files (and shop constants if the token is used there). See `.cursor/rules/design-tokens-sync.mdc`.

## Shared Database

Both `customer-api` and `admin-api` use the same SQLite database. Set `admin-api`'s `DATABASE_URL` to the same path as `customer-api`.

## Key Models (Customer API)

- **User** – Auth, profile, role (customer/admin)
- **Product** – Catalog (code, slug, content, price). Stock lives on **ProductChild** only.
- **ProductChild** – Variants/sizes per product: code, barcode, size_value (e.g. "S", "M", "L", or "single_size"), stock_quantity, stock_reserved. Every product has at least one child.
- **Order** / **OrderItem** – Order has required `address_code` (saved CustomerAddress) and denormalized `shipping_address` for display. OrderItem has required product_child_id. Orders always reference a child.
- **CustomerAddress** – Saved delivery addresses (address_code, user_id)
- **ProductReview** – Reviews linked to order items
- **CartItem** – Guest (X-Visitor-ID) or logged-in; required product_child_id (cart always references a child)
- **WishlistItem** – Logged-in only; one row per user and product (parent-product level). Used for wishlist; move-to-cart adds to cart and removes from wishlist in one transaction.
- **StockReservation** – Required product_child_id; reservations target a child
- **IdempotencyKey** – (idempotency_key, user_id) → order_id for idempotent order creation (optional header `Idempotency-Key` on POST `/orders/`)

## API Endpoints (Customer API)

| Prefix | Description |
|--------|-------------|
| `/auth` | Sign up, login |
| `/users` | Profile (`/me`) |
| `/addresses` | CRUD for saved delivery addresses |
| `/products` | Catalog (public read), product detail, reviews |
| `/orders` | Create order, payment intent, my orders, order detail |
| `/cart` | Cart (Bearer or X-Visitor-ID) |
| `/wishlist` | Wishlist (logged-in only): list, add by product_slug, remove, move-to-cart |
| `/i18n` | Languages, UI strings, language preference |

## Product images and CDN

- Product and brand images are referenced by `image_url` (string) from the API. Frontends use that URL as-is.
- **CDN:** To serve images from a CDN, configure the API or upload pipeline to store CDN URLs in `image_url` (e.g. `https://cdn.example.com/uploads/...`). Add the CDN host to customer-web `images.remotePatterns` in [customer-web/next.config.ts](customer-web/next.config.ts) if using Next.js Image optimization with that origin.

## Multi-language (i18n)

- **Languages table**: `languages` – new languages added here are supported across admin + customer apps.
- **Translation tables**: products, taxonomies, brands, attributes, options, UI strings.
- **Language resolution**: query `?lang=`, Accept-Language header, user/visitor preference, default English.
- **Visitor/user preference**: POST `/i18n/preferences/language` (user or X-Visitor-ID).

## Structured logging and tracing

- **Request ID:** customer-api and admin-api set `X-Request-ID` on each request/response and bind it to structlog context so all logs for that request include it. The BFF forwards `X-Request-ID` to customer-api.
- **OpenTelemetry (optional):** Set `OTEL_EXPORTER_OTLP_ENDPOINT` (e.g. to a Jaeger OTLP endpoint) to export traces from customer-api and admin-api. Request logs include `trace_id` and `span_id` when present. The BFF does not instrument OpenTelemetry by default; add it to the BFF for end-to-end traces across BFF and customer-api.

## Running All Services

### Option A: Docker Compose

All backend and web frontends in containers, shared SQLite and uploads in volumes. Docker uses **different host ports** (see [Ports](#ports)) so you can run local dev and Docker side by side:

```bash
docker compose up --build
```

- Customer Web: http://127.0.0.1:3002
- Admin Web: http://127.0.0.1:5174
- Discovery Web: http://127.0.0.1:5176
- Customer BFF: http://127.0.0.1:8012 (optional; when used, point customer-web/shop API URL here)
- Customer API: http://127.0.0.1:8002 (docs: http://127.0.0.1:8002/docs)
- Admin API: http://127.0.0.1:8003 (docs: http://127.0.0.1:8003/docs)
- Discovery API: http://127.0.0.1:8006 (docs: http://127.0.0.1:8006/docs)

An **init** service seeds the DB once (admin + sample data). **Shop** is not in Docker; run `cd shop && npm start` on the host and set `EXPO_PUBLIC_API_URL=http://127.0.0.1:8002/v1` to talk to the Docker-exposed customer-api. See [docs/DOCKER.md](docs/DOCKER.md).

### Running: local vs Docker

- **Local (no Docker):** APIs run on the host (uvicorn on 8000/8001). Frontends use default connection URLs to `127.0.0.1:8000` and `127.0.0.1:8001` (customer-web rewrites, admin-web proxy, shop `EXPO_PUBLIC_API_URL`). No need to set `BACKEND_ORIGIN` or `VITE_PROXY_TARGET`. Open apps at http://127.0.0.1:3000 and http://127.0.0.1:5173.
- **Docker:** APIs and web frontends run in containers on host ports **8012, 8002, 8003, 3002, 5174** (see [Ports](#ports)). Set `BACKEND_ORIGIN=http://customer-api:8000` (customer-web) and `VITE_PROXY_TARGET=http://admin-api:8001` (admin-web) so `/api` is proxied to the right service. To use the BFF, set customer-web/shop API URL to `http://127.0.0.1:8012/v1` instead of customer-api. Open the browser at http://127.0.0.1:3002 and http://127.0.0.1:5174. Shop on host: set `EXPO_PUBLIC_API_URL=http://127.0.0.1:8002/v1` (or `http://127.0.0.1:8012/v1` for BFF) to reach the Docker customer-api or BFF.
- **Both in parallel:** Local dev uses 3000, 5173, 8000, 8001; Docker uses 3002, 5174, 8002, 8003. No port conflicts.
- **macOS / Windows:** Defaults use `127.0.0.1` so the stack works on both. For connection URLs (env vars, proxy target) use `127.0.0.1` if you see failures (e.g. localhost → IPv6 on macOS).

### Option B: Run services manually

1. **Customer API** (8000): `cd customer-api && python3 -m uvicorn app.main:app --reload`
2. **Admin API** (8001): `cd admin-api && python3 -m uvicorn app.main:app --reload --port 8001`
3. **Discovery API** (8004): `cd discovery-api && python3 -m uvicorn app.main:app --reload --port 8004`
4. **Customer Web** (3000): `cd customer-web && npm run dev`
5. **Admin Web** (5173): `cd admin-web && npm run dev`
6. **Discovery Web** (5175): `cd discovery-web && npm run dev`
7. **Shop**: `cd shop && npm start`

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
