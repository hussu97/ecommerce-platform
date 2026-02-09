# Changelog

All notable changes are recorded here only. Use format: `## YYYY-MM-DD` for the date, then `- **Topic:** Short description. (scope).`

---

## [Unreleased]

- **Shop pull-to-refresh:** Home, Cart, and Orders screens support pull-from-top refresh on iOS/Android via RefreshControl; full-screen loader only on initial load when list is empty. (shop)
- **Seed: 5 single-sized + 5 multi-sized products:** PRODUCTS extended with optional 11th element `children_spec`; single-sized keep one child with `single_size`; 5 new multi-sized products (Fashion/Outdoors) have multiple ProductChild rows with size_value S/M/L/XL, barcode, and stock. (customer-api)
- **customer-web API 404 fix:** Normalize `NEXT_PUBLIC_API_URL` so full URLs (e.g. `http://localhost:8000`) get `/v1` appended; requests then hit `/v1/i18n`, `/v1/products`, `/v1/cart` correctly. Updated .env.example and README for API URL. (customer-web)
- **CORS OPTIONS 400 fix:** Customer-api returned 400 on CORS preflight (OPTIONS) when the request Origin was not in the allowed list. Added `allow_origin_regex` in development so any `http(s)://localhost` or `127.0.0.1` (any port) is allowed; added 5173 to default origins; validator to parse `BACKEND_CORS_ORIGINS` from comma-separated env. (customer-api)

_Add new entries here; move to a dated section when released._

---

## 2025-02-09

- **Rules:** Project standards updated: README files must stay up to date with launch instructions; new apps require an app-specific README and main README update; all changes must be logged in CHANGELOG.md only (no duplicate changelog elsewhere). CHANGELOG.md restructured to consistent format (date sections, `- **Topic:** Description. (scope).`). (.cursor/rules, CHANGELOG.md)
- **Docs:** Changelog moved from README to CHANGELOG.md. README and app READMEs updated with accurate run steps (Customer API first for customer-web/shop; Admin API first for admin-web), API base URLs (`/v1`), and setup notes (ensure_tables, ensure_admin, reset_and_seed). (docs, customer-api, admin-api, customer-web, admin-web, shop)
- **Product parent–child (variants/sizes):** Every product has at least one child (ProductChild). Parent has code, content, price; children have code, barcode, size_value ("single_size" or S/M/L), stock. Single-sized products: one child with size_value "single_size" (user provides barcode only in admin/bulk). Cart, order, and stock reservation always reference product_child_id (required). (customer-api, admin-api, admin-web, customer-web, shop)
- **Customer API:** PDP returns children and single_sized; product list aggregates stock from children; cart and order APIs require child_code; reservations on child. (customer-api)
- **Admin API:** Product create with code generation and at least one child (single-size or multi-size); children CRUD; order status updates child stock on shipped/cancelled. (admin-api)
- **Admin-web:** Product form "Sizes" section with single-size option (barcode only) or multiple sizes; list/add/edit/delete children; product table shows code and aggregated stock. (admin-web)
- **Bulk import:** Option A only—same file with optional columns parent_code, size_value, barcode, is_single_size; single-size rows create one child with size_value "single_size"; multi-size rows create parent+child or add child. (admin-api)
- **Seed:** New structure only; every product has code and one child (single_size); order items and seed data use product_child_id. (customer-api)
- **customer-web & shop:** PDP size selector when multiple sizes; add to cart and cart/checkout use child_code; ProductCard uses first child when one variant. (customer-web, shop)
- **Listing and PDP add-to-cart:** Product list shows only products with at least one child in stock. Listing: single-sized products show Add to cart (and qty); multi-sized show "View variants" linking to PDP. PDP: single-sized show Add to cart only; multi-sized show "Select size" (scrolls to sizes) until a size is selected, then "Add to cart"; out-of-stock sizes disabled. (customer-api, customer-web, shop)
- **Loading and transition consistency:** Unified skeleton vs spinner rules; PageLoader, ProductCardSkeleton, PdpSkeleton (customer-web); TableSkeleton (admin-web); FullScreenLoader (shop). Transitions aligned with design_template. (customer-web, admin-web, shop)
- **Design tokens single source:** `packages/design-tokens` with tokens.json, generated theme.css, and JS export. customer-web and admin-web import theme; shop uses package in Colors. Rule: token changes only in packages/design-tokens. (packages/design-tokens, customer-web, admin-web, shop)
- **Taxonomy & Attributes Admin:** Admin-web can create, update, and deactivate taxonomies (Taxonomies page); create, update, and deactivate taxonomy attributes and options (Attributes page). Added `is_active` to Taxonomy, TaxonomyAttribute, TaxonomyAttributeOption. Customer-facing endpoints filter by `is_active`. Run `reset_and_seed.py` to add new columns to existing DB. (admin-api, admin-web, customer-api)

---

## 2025-02-08

- **Cleanup:** Removed unused Address model (use CustomerAddress); removed outdated planning docs (implementation_plan, prompts_plan, walkthrough); updated READMEs and ARCHITECTURE. (customer-api, docs)
- **Monorepo:** Consolidated apps; renamed `frontend`→`customer-web`, `backend`→`customer-api`; moved `admin-api`, `admin-web`, `shop` into repo; added global README. (docs)
- **Docs:** Updated to use `python3` and `python3 -m uvicorn` for macOS/Linux compatibility. (docs)
- **Stock reservation:** Reservations on order, released on shipped/cancelled; stock_net = gross - reserved. (customer-api, admin-api)
- **Taxonomy & attributes:** High-level taxonomy, taxonomy attributes (select with options), Brand table, product attributes; admin brands CRUD; customer filters; 10 sample products. (customer-api, admin-api, admin-web, customer-web)
- **Multi-language:** Languages table, translation tables (products, taxonomies, brands, attributes, UI strings); language resolution; visitor/user preference; customer language switcher. (customer-api, customer-web, shop)
- **Shop app UI:** Product cards redesigned (brand header, product name subheader, 4:5 image, design-template alignment). Full-screen Filters modal (sort, category grid, price range, brand, attributes; "Show Products"). Cart tab restyled (cards, sand border, rounded-full qty, primary CTA). PDP redesigned: image full-width at top, content panel overlaps on scroll with parallax; Specifications section (attributes); delivery row; fixed bottom Add to Cart + qty; "Add to Cart" label. Design-token audit on PDP, Checkout, Login, Signup, Orders, Order detail. (shop)
- **Customer-web PDP:** Specifications section (product attributes grid); delivery block with complimentary_delivery + delivery_expected_uae; "Add to Cart" instead of "Add to Sanctuary"; product_not_found and specs/delivery i18n keys. Mobile content panel shadow/transition. (customer-web)
- **Docs:** Added FRONTEND_REDESIGN_PROMPTS.md, SHOP_APP_UI_PROMPTS.md; design_template.html and design system section in README. (docs)
