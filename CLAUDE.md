# Project Rules

## 1. Architecture Review
When implementing functionality that changes how the system is built or deployed (new services, databases, auth strategies, API versioning, monorepo layout, etc.), review and update **ARCHITECTURE.md** so it stays accurate.

## 2. Changelog Updates
After every feature, fix, or notable change, add an entry to **CHANGELOG.md**. Format: date section `## YYYY-MM-DD`, entries as `- **Topic:** Short description. (scope)`. Keep entries concise but descriptive.

## 3. Production Plan Maintenance
Keep **PRODUCTION.md** up to date with three deployment plans:
1. **Docker** – Docker Compose / container images
2. **Free online services** – Vercel (customer-web), Render (APIs), free Postgres
3. **GCP** – Cloud Run, Cloud SQL, Secret Manager, Cloud Storage

Update the relevant plan(s) when adding new env vars, services, DB migrations, or build commands.

## 4. Git Commit After Feature Changes
After any feature change (or coherent set of changes), commit the work with a clear, descriptive message. One logical change per commit where practical. Do not leave implemented work uncommitted.

Every commit **must** be authored by Hussain Abbasi. Always pass `--author` explicitly:
```
git commit --author="Hussain Abbasi <h_abbasi97@hotmail.com>" -m "..."
```
The `Co-Authored-By` trailer for Claude should still be included in the commit body.

## 5. README Maintenance
Keep READMEs accurate and up to date. After any change that affects setup, structure, endpoints, env vars, or screens, update the relevant README(s) **before committing**.

- **README.md** – Monorepo overview, structure (all services), prerequisites, local setup, env vars, docs links
- **customer-api/README.md** – FastAPI backend: setup, run, env vars, API routes, seed scripts
- **admin-api/README.md** – Admin FastAPI backend: setup, run, env vars, API routes, bulk import
- **discovery-api/README.md** – Discovery pipeline: setup, env vars, strategies, API routes
- **customer-web/README.md** – Next.js: install, run, env, directory structure, parity reference
- **admin-web/README.md** – Admin dashboard (Vite + React): install, run, env, pages, API surface
- **discovery-web/README.md** – Discovery dashboard (Vite + React): install, run, env
- **shop/README.md** – Expo / React Native: install, run, env, iOS/Android build, parity reference

**Triggers — update READMEs when you:**
- Add, rename, or remove an API endpoint
- Add, rename, or remove a screen/page
- Add a new env var
- Change the directory structure of a service
- Add or change test commands
- Add a new service or major dependency

## 6. Internationalization (i18n)
All customer-facing strings must come from the backend translation API — never hardcode UI copy.
- **Supported languages:** English (default), Arabic
- **Backend endpoints:** `GET /v1/i18n/languages`, `GET /v1/i18n/ui-strings?lang=en|ar`
- **Fallback:** English when a key is missing for the requested language
- **RTL:** Enable RTL layout when locale is Arabic (`ar`)
- When adding/changing UI copy, update translation keys in the backend seed (`customer-api/reset_and_seed.py` UI_STRINGS) and the DEFAULT_STRINGS fallback in both `customer-web/stores/useI18nStore.ts` and `shop/stores/useI18nStore.ts`.

## 7. Identifiers: Codes and Slugs, Not DB IDs
Prefer stable identifiers in API contracts: language **code** (e.g. `en`, `ar`), taxonomy **slug**, brand **slug**, product **slug**. Avoid exposing or requiring auto-generated DB IDs where a code/slug exists. Cart uses `product_slug`; product URLs are slug-based.

## 8. Frontend Replication (Customer Web <-> Shop)
`customer-web` (Next.js) and `shop` (Expo / React Native) must stay in **feature parity**. There are no shared packages — replicate code in both apps, do not create shared imports.

After every frontend task, verify:
- [ ] Same screen/route exists in the other app?
- [ ] Same API client methods (endpoints and request/response shapes)?
- [ ] Same navigation/route names and params?
- [ ] Same i18n keys in both apps' `useI18nStore.ts` DEFAULT_STRINGS?

**What may differ:** React DOM + Tailwind vs React Native + Expo primitives, app-specific config, env variable loading, and build/deployment scripts.

## 9. Design Tokens — Keep in Sync
Design tokens (colors, radius, typography) are defined in two theme files that **must** be kept identical:
- `customer-web/app/theme.css`
- `admin-web/src/theme.css`

**shop** uses the same values in `shop/constants/Colors.ts`. When changing any token, update all three files. Do not create a shared package — the theme files and shop constants are the source.

See `.cursor/rules/design-tokens-sync.mdc` for the full rule.

## 10. Frontend Design — Design Template
When making frontend changes (customer-web, admin-web, or shop UI), take inspiration from `design_template.html` and `DESIGN_TEMPLATE.md` for layout, tokens, and patterns so the app stays aligned with the design system.

**Loading and transitions:** Use skeleton for known layouts (product grid, PDP, admin tables); use spinner for full-page or inline actions. Follow design_template transition patterns (active:scale, duration-200/500, transition-colors).

## 11. Shared Database
`customer-api` and `admin-api` share the same SQLite database (PostgreSQL in production). Set `admin-api`'s `DATABASE_URL` to the same path as `customer-api`.

`discovery-api` uses its own separate database (`discovery.db`).

## 12. Ports — Local vs Docker
Local dev and Docker use separate host ports so they can run in parallel:

| Service | Local dev | Docker (published) |
|---------|-----------|-------------------|
| Customer BFF | 8010 | 8012 |
| Customer API | 8000 | 8002 |
| Admin API | 8001 | 8003 |
| Discovery API | 8004 | 8006 |
| Customer Web | 3000 | 3002 |
| Admin Web | 5173 | 5174 |
| Discovery Web | 5175 | 5176 |

When adding a new service, assign the next free port in both columns and update ARCHITECTURE.md, docker-compose.yml, and docs/DOCKER.md.

## 13. Testing and Verification
When testing or verifying changes to backend services:
- **Follow the README:** Use the exact setup and run commands from the respective README
- **Virtual environment:** Always activate the venv before running or testing
- **Install dependencies:** `pip install -r requirements.txt`
- **Use 127.0.0.1:** When testing endpoints with curl or requests, use `127.0.0.1` instead of `localhost` for consistency
- **Example:** `curl -s http://127.0.0.1:8000/v1/products` (not `localhost:8000`)
- **Python version:** 3.11+ required, 3.13 recommended (see `.python-version` in each service)

## 14. Environment Variable Documentation
`.env.example` in each service directory is the local-dev template. When adding, renaming, removing, or changing any env var:
1. Update the corresponding `.env.example` in the service directory
2. Update the root `.env.docker.example` if the var is used in Docker Compose
3. Update the relevant README env vars section

**Key env vars across services:**
- `DATABASE_URL` — SQLite (dev) or PostgreSQL (prod) connection string
- `SECRET_KEY` — JWT signing key, shared between customer-api and admin-api
- `BACKEND_CORS_ORIGINS` / `ADMIN_CORS_ORIGINS` — CORS allowed origins per API
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Optional Stripe integration (customer-api only)
- Frontend apps use `NEXT_PUBLIC_API_URL`, `VITE_API_URL`, or `EXPO_PUBLIC_API_URL` with `/v1` suffix

## 15. API Versioning
All API routes are mounted under the `/v1` prefix. Frontend API URLs must include `/v1`:
- Customer Web: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1`
- Admin Web: `VITE_API_URL=http://127.0.0.1:8001/v1`
- Shop: `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/v1`

## 16. Stock Model
Stock lives on **ProductChild** (variant/size), not the parent Product. Every product has at least one child (even single-size products use `size_value: "single_size"`).

- **Cart** and **OrderItem** always reference a `product_child_id`
- **StockReservation** targets a child
- **Formula:** `stock_net = stock_quantity - stock_reserved`
- **Flow:** Order paid -> reservation created, `stock_reserved++`. Shipped -> deactivate reservation, decrement both. Cancelled -> deactivate, decrement `stock_reserved` only.

## 17. NEXT_TODO.md Maintenance
When changes implement or partially implement a feature listed in **NEXT_TODO.md**, update that task's status: set to completed or partial with a note describing what exists.

## 18. Products API — Use Filters Response
Both customer-web and shop use `GET /v1/products/` which returns `{ products, filters }` (categories, brands, attributes with counts). Do NOT call `/taxonomies/` or `/brands/` separately for product listing filters — use the filters from the `/products/` response.
