# Running with Docker Compose

Run the full stack (APIs, frontends, bulk-import worker) in containers with a shared SQLite DB and uploads volume. **Host ports are chosen so local dev and Docker can run in parallel** (see [ARCHITECTURE.md](../ARCHITECTURE.md) “Ports”).

## Prerequisites

- Docker and Docker Compose (v2+)

## Quick start

```bash
# From repo root
docker compose up --build
```

- **Customer Web**: http://127.0.0.1:3002 (proxies `/api` to customer-api)
- **Admin Web**: http://127.0.0.1:5174 (proxies `/api` to admin-api)
- **Discovery Web**: http://127.0.0.1:5176 (proxies `/api` to discovery-api)
- **Customer BFF**: http://127.0.0.1:8012 (optional; proxy + rate limit + aggregation in front of customer-api)
- **Customer API**: http://127.0.0.1:8002 (docs: http://127.0.0.1:8002/docs)
- **Admin API**: http://127.0.0.1:8003 (docs: http://127.0.0.1:8003/docs)
- **Discovery API**: http://127.0.0.1:8006 (docs: http://127.0.0.1:8006/docs)

## Ports (Docker published)

| Service | Host port | Container port | Notes |
|---------|-----------|----------------|-------|
| customer-bff | 8012 | 8010 | Optional; local dev uses 8010 |
| customer-api | 8002 | 8000 | Local dev uses 8000 |
| admin-api | 8003 | 8001 | Local dev uses 8001 |
| customer-web | 3002 | 3000 | Local dev uses 3000 |
| admin-web | 5174 | 5173 | Local dev uses 5173 |
| discovery-api | 8006 | 8004 | Local dev uses 8004 |
| discovery-web | 5176 | 5175 | Local dev uses 5175 |
| redis | 6379 | 6379 | Optional (profile `with-redis`) |

## Services

| Service | Image | Description |
|---------|--------|-------------|
| customer-bff | build ./customer-bff | Proxy to customer-api, rate limiting, GET /v1/checkout-context aggregation |
| customer-api | build ./customer-api | Customer-facing API |
| admin-api | build ./admin-api | Admin API (products, orders, taxonomies, bulk upload) |
| bulk-import-worker | same as admin-api | Polls for bulk uploads, processes xlsx/csv/tsv |
| init | same as customer-api | One-time: seeds DB (admin + sample data); exits |
| customer-web | build ./customer-web | Next.js customer app |
| admin-web | build ./admin-web | Vite admin dashboard |
| discovery-api | build ./discovery-api | Product discovery pipeline (own DB) |
| discovery-web | build ./discovery-web | Discovery dashboard (view products, trigger runs) |
| redis | redis:7-alpine | Optional (profile `with-redis`) |

## Database and volumes

- **dbdata**: SQLite file at `/data/ecommerce.db` inside containers. Shared by customer-api, admin-api, bulk-import-worker, and init.
- **uploaddata**: Bulk upload files at `/app/uploads`. Shared by admin-api and bulk-import-worker.
- **discoverydata**: Discovery API’s SQLite at `/data/discovery.db`. Used only by discovery-api.

The **init** service runs after customer-api is healthy: it runs `ensure_admin.py` and `reset_and_seed.py` once, then creates `/data/.seeded` so it skips on future restarts. To re-seed, remove the volume and start again:

```bash
docker compose down -v
docker compose up --build
```

## Optional: Redis

For future caching, start Redis with the profile:

```bash
docker compose --profile with-redis up --build
```

Redis will be at `redis:6379` from other services. No app code uses it yet.

## Shop app

The **Shop** (React Native + Expo) app is not in Docker. Run it on the host:

```bash
cd shop
npm install
npm start
```

Point `EXPO_PUBLIC_API_URL` to `http://127.0.0.1:8002/v1` (customer-api) or `http://127.0.0.1:8012/v1` (customer-bff) so it talks to the API or BFF running in Docker.

## Environment overrides

For customer-web in Docker, the "Admin" link points to the default admin URL (port 5173). If you use only the Docker stack, set `NEXT_PUBLIC_ADMIN_URL=http://127.0.0.1:5174` so the link opens the Docker admin-web (host port 5174).

Copy `.env.docker.example` to `.env` and set any overrides. Then:

```bash
docker compose --env-file .env up --build
```

## Troubleshooting

- **Frontend can’t reach API**: Open the app at http://127.0.0.1:3002 (customer-web) or http://127.0.0.1:5174 (admin-web). The Next/Vite servers inside the container proxy `/api` to the backend. If requests fail when using localhost, use `127.0.0.1` in env vars and in the browser (macOS may resolve localhost to IPv6).
- **Port already in use**: Docker uses host ports 8002, 8003, 3002, 5174 so local dev (8000, 8001, 3000, 5173) can run at the same time. If you see “address already in use”, another process is using that port; stop it or see ARCHITECTURE.md “Ports”.
- **Init fails**: Check logs with `docker compose logs init`. Ensure customer-api is healthy first (`docker compose ps`).
- **Re-seed**: Run `docker compose down -v` to remove volumes, then `docker compose up --build` to start fresh and run init again.
- **"Cannot find native binding" / ERR_CONNECTION_REFUSED on admin-web**: The frontend images use `node:20-slim` (Debian) so optional native deps (e.g. Next.js sharp) install correctly. Rebuild: `docker compose build --no-cache customer-web admin-web && docker compose up -d`. If you see the native binding error when running **locally** (not Docker), from the repo root run: `rm -rf node_modules customer-web/node_modules admin-web/node_modules shop/node_modules packages/*/node_modules` then `npm install` (see [npm#4828](https://github.com/npm/cli/issues/4828)).
