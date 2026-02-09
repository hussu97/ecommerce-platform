# Running with Docker Compose

Run the full stack (APIs, frontends, bulk-import worker) in containers with a shared SQLite DB and uploads volume.

## Prerequisites

- Docker and Docker Compose (v2+)

## Quick start

```bash
# From repo root
docker compose up --build
```

- **Customer Web**: http://localhost:3000 (proxies `/api` to customer-api)
- **Admin Web**: http://localhost:5173 (proxies `/api` to admin-api)
- **Customer API**: http://localhost:8000 (docs: http://localhost:8000/docs)
- **Admin API**: http://localhost:8001 (docs: http://localhost:8001/docs)

## Services

| Service | Image | Port | Description |
|---------|--------|------|-------------|
| customer-api | build ./customer-api | 8000 | Customer-facing API |
| admin-api | build ./admin-api | 8001 | Admin API (products, orders, taxonomies, bulk upload) |
| bulk-import-worker | same as admin-api | - | Polls for bulk uploads, processes xlsx/csv/tsv |
| init | same as customer-api | - | One-time: seeds DB (admin + sample data); exits |
| customer-web | build ./customer-web | 3000 | Next.js customer app |
| admin-web | build ./admin-web | 5173 | Vite admin dashboard |
| redis | redis:7-alpine | 6379 | Optional (profile `with-redis`) |

## Database and volumes

- **dbdata**: SQLite file at `/data/ecommerce.db` inside containers. Shared by customer-api, admin-api, bulk-import-worker, and init.
- **uploaddata**: Bulk upload files at `/app/uploads`. Shared by admin-api and bulk-import-worker.

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

Point `EXPO_PUBLIC_API_URL` to `http://localhost:8000/v1` so it talks to the customer-api running in Docker.

## Environment overrides

Copy `.env.docker.example` to `.env` and set any overrides. Then:

```bash
docker compose --env-file .env up --build
```

## Troubleshooting

- **Frontend can’t reach API**: Ensure you open the app at http://localhost:3000 (customer-web) or http://localhost:5173 (admin-web). The browser sends requests to those origins; the Next/Vite servers inside the container proxy `/api` to the backend service.
- **Init fails**: Check logs with `docker compose logs init`. Ensure customer-api is healthy first (`docker compose ps`).
- **Re-seed**: Run `docker compose down -v` to remove volumes, then `docker compose up --build` to start fresh and run init again.
