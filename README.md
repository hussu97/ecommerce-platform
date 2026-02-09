# E-commerce Platform

Monorepo for the e-commerce platform: customer-facing and admin apps, with shared database.

---

## Repository structure

| App | Folder | Port | Description |
|-----|--------|------|-------------|
| **Customer API** | `customer-api/` | 8000 | FastAPI – auth, products (read), cart, orders (create + user history) |
| **Admin API** | `admin-api/` | 8001 | FastAPI – admin-only: products CRUD, orders management, taxonomies |
| **Customer Web** | `customer-web/` | 3000 | Next.js – customer web app (browser) |
| **Admin Web** | `admin-web/` | 5173 | React + Vite – desktop admin dashboard |
| **Shop** | `shop/` | - | React Native + Expo – cross-platform (Web, iOS, Android); feature-parallel to customer-web |

**Note:** `customer-web` and `shop` must stay feature-parallel. When adding frontend features, implement in both apps. See `.cursor/rules/project-standards.mdc`.

**Design tokens:** Colors, spacing, radius, and typography are defined in `packages/design-tokens`. When changing any design token, update that package only (see project rules). Run `npm run tokens:build` from repo root to regenerate theme CSS.

---

## Quick start

Run **Customer API** first (required for customer-web and shop). Run **Admin API** first if you use admin-web. Each app can be run from its folder as below.

### 1. Customer API (port 8000)

```bash
cd customer-api
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 reset_and_seed.py  # Fresh DB: admin@example.com / admin123, or use ensure_admin.py for existing DB
python3 -m uvicorn app.main:app --reload
```

### 2. Admin API (port 8001)

```bash
cd admin-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Set DATABASE_URL in .env to the same DB as customer-api (e.g. sqlite+aiosqlite:///../customer-api/ecommerce.db)
python3 -m uvicorn app.main:app --reload --port 8001
```

### 3. Admin Web (port 5173)

```bash
cd admin-web
npm install
npm run dev
```

### 4. Customer Web (port 3000)

```bash
cd customer-web
npm install
npm run dev
```

### 5. Shop (Web / iOS / Android)

```bash
cd shop
npm install
npm start           # Expo dev server
npm run web         # Web only
npm run ios         # iOS simulator
npm run android     # Android emulator
```

---

## Shared database

`customer-api` and `admin-api` use the same SQLite database. Point `admin-api`’s `DATABASE_URL` to the same DB path as `customer-api` (see `admin-api/README.md`).

---

## Environment variables

| App | Variable | Default |
|-----|----------|---------|
| customer-api | `DATABASE_URL` | `sqlite+aiosqlite:///./ecommerce.db` |
| customer-api | `SECRET_KEY` | (change in production) |
| admin-api | `DATABASE_URL` | Same as customer-api |
| admin-api | `SECRET_KEY` | Same as customer-api |
| customer-web | `NEXT_PUBLIC_API_URL` | `http://localhost:8000/v1` |
| customer-web | `NEXT_PUBLIC_ADMIN_URL` | `http://localhost:5173` |
| admin-web | `VITE_API_URL` | `/api` (proxied to 8001/v1) |
| shop | `EXPO_PUBLIC_API_URL` | `http://localhost:8000/v1` |

---

## Docker Compose

Run the full stack (APIs, customer-web, admin-web, bulk-import worker) in containers:

```bash
docker compose up --build
```

Then open http://localhost:3000 (customer) and http://localhost:5173 (admin). The **Shop** app runs on the host: `cd shop && npm start`. See [docs/DOCKER.md](docs/DOCKER.md).

---

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) – Architecture overview
- [CHANGELOG.md](CHANGELOG.md) – Release history
- [docs/DOCKER.md](docs/DOCKER.md) – Docker Compose
- [PRODUCTION.md](PRODUCTION.md) – Production deployment guide
- [customer-api/README.md](customer-api/README.md) – Customer API
- [admin-api/README.md](admin-api/README.md) – Admin API
- [customer-web/README.md](customer-web/README.md) – Customer Web
- [admin-web/README.md](admin-web/README.md) – Admin Web
- [shop/README.md](shop/README.md) – Shop (React Native + Expo)
- [design_template.html](design_template.html) – UI reference (tokens, PDP, filters, cart)
- [FRONTEND_REDESIGN_PROMPTS.md](FRONTEND_REDESIGN_PROMPTS.md) – Customer-web & admin redesign prompts
- [SHOP_APP_UI_PROMPTS.md](SHOP_APP_UI_PROMPTS.md) – Shop app UI prompts

---

## Stock reservation

- **Order created (paid)**: Creates `StockReservation` per item, increments `product.stock_reserved`
- **Order shipped**: Deactivates reservations, decrements `product.stock_quantity` and `product.stock_reserved`
- **Order cancelled**: Deactivates reservations, decrements `product.stock_reserved` only
- **stock_net** = `stock_quantity` (gross) − `stock_reserved` (available to sell)

---

## Taxonomy, Brands & Product Attributes

- **High-level taxonomies** (categories): Electric & Electronics, Home Improvement Tools, Health & Personal Care, Men & Women's Fashion, Outdoors Fitness & Sports, Mobiles Tablets & Accessories, Smart Devices & Accessories, Travel Accessories, Seasonal Products, Smart Watch & Band.
- **Taxonomy attributes**: Each taxonomy has 3–5 select-type attributes with predefined options (e.g. Size, Color, OS) for filtering and product enrichment.
- **Admin-web**: Create, update, and deactivate taxonomies; create, update, and deactivate taxonomy attributes and their options. Brand CRUD also in admin-web.
- **Customer app**: Products show brand and attributes; filters by category, brand, and attribute options. Inactive taxonomies and attributes are hidden from filters.

### Resetting database and seeding (admin, languages, taxonomies, brands, products)

```bash
cd customer-api
python3 reset_and_seed.py
```

Or run `./run_full_seed.sh`. This drops all tables, recreates them, and seeds:
- Admin user (admin@example.com / admin123)
- 4 sample customers (customer1@example.com … customer4@example.com / customer123)
- Languages: English, Arabic
- Taxonomies + taxonomy attributes (with EN+AR translations)
- 5 brands (with EN+AR translations)
- 5 products (with EN+AR translations)
- UI strings (EN+AR for customer-web and shop)
- Sample addresses (1–2 per customer), orders (3–5 per customer), and product reviews

---

## Multi-language (i18n)

Supported languages: **English** (default), **Arabic**. Add new languages in the `languages` table; all systems support them.

- **Language resolution** (customer API): `?lang=ar` query param → Accept-Language header → user preference → visitor preference (X-Visitor-ID) → English.
- **Translatable content**: products, taxonomies, brands, taxonomy attributes/options; UI strings (frontend).
- **Customer language switcher**: persists via POST `/i18n/preferences/language` (user or X-Visitor-ID).
- **Admin**: product create/update accepts optional `translations: {"ar": {name, description}, "zh": {...}}`.

i18n (languages, translations, UI strings) is seeded by `reset_and_seed.py`.

---

## Frontend design system

Design tokens (used across customer-web, admin-web, shop): **primary** `#ec9213`, **background-light** `#f8f7f6`, **sand-divider** `#e5e1da`, **text-muted** `#897961`, **Noto Serif** (headings), **Noto Sans** (body). Reference: `design_template.html`.

- **Customer-web:** Filters overlay (sort, category, price, brand, attributes), ProductCard (brand/title, 4:5 image, in-cart qty pill), PDP with Specifications and delivery copy; **Add to Cart** (not “Add to Sanctuary”); strings via i18n.
- **Shop (Expo):** Product cards aligned with design template (brand as header, product name as subheader, 4:5 image, primary price, rounded-full add/qty); full-screen **Filters modal** (sort, category grid, price range, brand pills, attribute chips, “Show Products”); **Cart** tab with card layout, sand borders, rounded-full qty, primary “Proceed to Checkout”; **PDP** with image at top, content panel sliding over image, parallax/scroll animation, **Specifications** section (attributes), delivery row, fixed bottom “Add to Cart” + qty; all copy via `t(...)` (i18n).
- **Admin-web:** Layout and pages use same tokens; fonts loaded via `index.html` (no `@import` in CSS).

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history. When you change apps or structure, update this README, the relevant app-specific README, and add an entry to CHANGELOG.md.

