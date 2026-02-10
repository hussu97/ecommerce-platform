# Production Deployment Guide

Steps to make the ecommerce platform production-ready and deploy to a server or cloud. **Docker Compose** is the recommended path for production on a single host (VPS); cloud free-tiers (Vercel + Render) remain an option for beta.

---

## 1. Production Readiness Checklist

### Environment & Secrets
- [ ] Move all secrets to environment variables (no hardcoded keys)
- [ ] **customer-api:** `DATABASE_URL`, `SECRET_KEY`, `BACKEND_CORS_ORIGINS`; Stripe keys if using payments
- [ ] **admin-api:** `DATABASE_URL`, `STORAGE_PATH` (uploads); same DB as customer-api
- [ ] Use `.env.example` files for documentation (repo already has `customer-api/.env.example`, `admin-api/.env.example`, `shop/.env.example`); ensure `.env` is in `.gitignore`

### Database
- [ ] Use **PostgreSQL** for production (SQLite is fine for local/Docker dev only)
- [ ] Both **customer-api** and **admin-api** share the same database; set the same `DATABASE_URL` for both
- [ ] Connection string format: `postgresql+asyncpg://user:password@host:5432/dbname`
- [ ] Add connection pooling / timeouts as needed (APIs already support `DB_CONNECT_TIMEOUT`)

### API Configuration
- [ ] Set `BACKEND_CORS_ORIGINS` to actual frontend origins (no `*` in production)
- [ ] APIs must listen on `0.0.0.0` for container/cloud hosting (uvicorn already does with `--host 0.0.0.0`)
- [ ] Use HTTPS in production (reverse proxy or platform handles SSL)

### Frontend URLs (production)
- [ ] **customer-web:** `NEXT_PUBLIC_API_URL` → production customer-api URL; `NEXT_PUBLIC_ADMIN_URL` → admin-web URL if needed
- [ ] **admin-web:** API base URL (e.g. `VITE_API_URL` or proxy target) → production admin-api URL
- [ ] **shop:** `EXPO_PUBLIC_API_URL` → production customer-api URL (for EAS / web builds)

### Security
- [ ] Strong `SECRET_KEY`, sensible token expiry
- [ ] Rate limiting on auth endpoints (add if not present)
- [ ] No stack traces in API error responses in production

### Discovery (if deploying discovery-api / discovery-web)
- [ ] **discovery-api:** Own DB (SQLite or PostgreSQL) and env (e.g. `RAPIDAPI_KEY`, `RAPIDAPI_ALIEXPRESS_HOST`, `SERPAPI_API_KEY` for strategies). See [discovery-api/README](discovery-api/README.md).

---

## 2. Deployment Options

| Option | Best for | Summary |
|--------|----------|---------|
| **A. Docker Compose** | VPS, single host, full control | Run the full stack in containers; add PostgreSQL for production. Easiest if you already use Docker locally. |
| **B. Cloud (free tiers)** | Beta, minimal cost | Vercel (frontends) + Render (APIs + PostgreSQL) + EAS (shop iOS/Android). Services may sleep when idle. |
| **C. Google Cloud (GCP)** | Production, single cloud | Cloud Run (APIs + frontends), Cloud SQL (PostgreSQL), Secret Manager. Billing enabled; free tier applies to many products. |

### Systems and apps (coverage by path)

| Service | Path A | Path B | Path C | Notes |
|---------|--------|--------|--------|-------|
| customer-api | Yes | Yes | Yes | Shared DB with admin-api |
| admin-api | Yes | Yes | Yes | Same DB as customer-api |
| customer-bff | Yes (optional) | No | Yes (optional) | Proxy in front of customer-api |
| discovery-api | Yes | Optional (Phase 9) | Yes | Own DB; see [discovery-api/README](discovery-api/README.md) for env |
| discovery-web | Yes | Optional (Phase 9) | Yes | Points to discovery-api |
| customer-web | Yes | Yes | Yes | Next.js; build from repo root for design-tokens |
| admin-web | Yes | Yes | Yes | Vite; build from repo root for design-tokens |
| bulk-import-worker | Yes | Optional | Yes (step 13) | Uses admin-api image |
| init | Yes | Phase 4 (seed) | Step 7 (seed) | One-time DB seed |
| shop (iOS/Android) | EAS | EAS | EAS | Not in Docker; set EXPO_PUBLIC_API_URL |
| shop (web) | Optional | Optional (Vercel) | Optional | Add shop web URL to CORS if used |
| redis | Yes (profile) | No | No | Optional caching; `docker compose --profile with-redis` |

Paths below assume the **Section 1 checklist** is done or in progress; each path then gives deployment-specific steps.

---

## 3. Path A: Docker Compose (recommended for production)

Use the existing [docker-compose.yml](docker-compose.yml) and [docs/DOCKER.md](docs/DOCKER.md). For **production**, use PostgreSQL instead of SQLite and inject secrets via env. Complete **Section 1 checklist** (env, DB, CORS, frontend URLs); then follow the steps below.

### Services in the stack

All of these are defined in [docker-compose.yml](docker-compose.yml). To run without discovery, comment out the `discovery-api` and `discovery-web` services (or use a Compose profile).

- **customer-bff** (optional) – Proxy, rate limiting, checkout-context aggregation in front of customer-api
- **customer-api** – Auth, products, cart, orders, addresses, wishlist, i18n
- **admin-api** – Products CRUD, orders, taxonomies, brands, bulk upload
- **bulk-import-worker** – Processes bulk upload jobs (uses admin-api image)
- **init** – One-time DB seed (admin + sample data)
- **customer-web** – Next.js customer app (build from root for design-tokens)
- **admin-web** – Vite admin dashboard (build from root for design-tokens)
- **discovery-api** – Product discovery pipeline (own DB; see [discovery-api/README](discovery-api/README.md) for env such as `RAPIDAPI_KEY`, `SERPAPI_API_KEY`)
- **discovery-web** – Discovery dashboard (proxies to discovery-api)

**Shop** (Expo) is not in Docker; build and distribute via EAS (iOS/Android) or deploy the web build separately.

### Production steps (Docker)

1. **PostgreSQL**  
   - Add a `postgres` service to Compose with a named volume (or use a managed PostgreSQL e.g. Render, Supabase).  
   - Set `DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/ecommerce` (or the managed URL) for **customer-api**, **admin-api**, **bulk-import-worker**, and **init**; all four share the same DB.  
   - **discovery-api** uses its own DB (SQLite on the `discoverydata` volume by default, or a separate PostgreSQL instance if you prefer). See [discovery-api/README](discovery-api/README.md) for its env vars (e.g. `RAPIDAPI_KEY`, `SERPAPI_API_KEY`).

2. **Secrets and env**  
   - Copy `.env.docker.example` to `.env` at repo root (or use a production env file).  
   - **Shared DB services** (customer-api, admin-api, bulk-import-worker, init): `DATABASE_URL`, and for customer-api add `SECRET_KEY`, `BACKEND_CORS_ORIGINS` (comma-separated frontend origins). If using Stripe, add the required keys to customer-api. admin-api: `STORAGE_PATH`.  
   - **discovery-api:** `DATABASE_URL` (its own DB), plus strategy keys (e.g. `RAPIDAPI_KEY`, `RAPIDAPI_ALIEXPRESS_HOST`, `SERPAPI_API_KEY`) per [discovery-api/README](discovery-api/README.md).  
   - **customer-bff** (if used): `CUSTOMER_API_URL` (e.g. `http://customer-api:8000`), `RATE_LIMIT_PER_MIN`.

3. **CORS**  
   Set `BACKEND_CORS_ORIGINS` on **customer-api** to your production frontend origins (e.g. `https://shop.example.com,https://admin.example.com`).

4. **Run**  
   From repo root:
   ```bash
   docker compose --env-file .env up -d --build
   ```
   Ensure init has run (check logs). Frontends proxy to APIs inside the network; expose only what you need (e.g. reverse proxy in front of the ports below, or APIs directly).

5. **Reverse proxy (recommended)**  
   Put Nginx, Caddy, or Traefik in front to terminate HTTPS and route to the services. Ports (see [ARCHITECTURE.md](ARCHITECTURE.md)): **customer-web** 3002, **admin-web** 5174, **discovery-web** 5176, **customer-api** 8002, **admin-api** 8003, **discovery-api** 8006; **customer-bff** 8012 if used.

6. **Shop (mobile)**  
   Set `EXPO_PUBLIC_API_URL` to your production customer-api base URL (e.g. `https://api.example.com/v1`). Use EAS Build for iOS/Android; distribute via TestFlight / Play Internal Testing.

---

## 4. Path B: Cloud (free tiers)

Deploy frontends and APIs to separate platforms. Good for beta; some services sleep when idle. **Ensure Section 1 checklist is done** (PostgreSQL, SECRET_KEY, CORS, frontend URLs); then follow the phases below.

### Suggested architecture

| App | Platform | Notes |
|-----|----------|--------|
| customer-web | Vercel | Next.js; set `NEXT_PUBLIC_API_URL` to Render API URL |
| admin-web | Vercel | Vite static; set `VITE_API_URL` to admin-api on Render |
| customer-api | Render | Web service; same PostgreSQL as admin-api |
| admin-api | Render | Web service; optional background worker or same process |
| PostgreSQL | Render | Single DB for both APIs (free tier) |
| shop (web) | Vercel | Optional: Expo web build as static site |
| shop (iOS/Android) | EAS Build | Set `EXPO_PUBLIC_API_URL` to production customer-api URL |
| discovery-api | Render (optional) | Web service; root `discovery-api`; own DB (SQLite on ephemeral disk or separate DB). See Phase 9. |
| discovery-web | Vercel (optional) | Root `discovery-web`; set `VITE_DISCOVERY_API_URL` to discovery-api URL. See Phase 9. |

### Prerequisites

- Code pushed to a **GitHub** repo (Render and Vercel deploy from Git).
- Production checklist (Section 1) done or in progress: `SECRET_KEY`, PostgreSQL, CORS origins.
- Free accounts: [Render](https://render.com), [Vercel](https://vercel.com), [Expo](https://expo.dev) (for EAS).

---

### Phase 1: Render – PostgreSQL

1. Sign in at [render.com](https://render.com).
2. **Dashboard → New + → PostgreSQL**.
3. **Name:** e.g. `ecommerce-db`. **Region:** choose the same region you will use for your API services (e.g. Oregon).
4. **Plan:** Free. Create.
5. After the database is created, open it and go to the **Info** tab.
6. Copy **Internal Database URL** (use this for APIs in the same Render account; format `postgresql://...`).  
   For our APIs you must use the **asyncpg** driver: when setting `DATABASE_URL`, change the scheme from `postgresql://` to `postgresql+asyncpg://` (e.g. `postgresql+asyncpg://user:pass@host/dbname`).
7. Optionally note **External Database URL** (for running the seed from your machine).

---

### Phase 2: Render – customer-api

1. **Dashboard → New + → Web Service**.
2. Connect **GitHub** (authorize if needed) and select your ecommerce repo.
3. **Name:** e.g. `customer-api`. **Region:** same as the database.
4. **Root Directory:** `customer-api`.
5. **Runtime:** Python 3.
6. **Build Command:** `pip install -r requirements.txt` (default).
7. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Render sets `$PORT`; do not use a fixed port).
8. **Instance type:** Free.
9. **Environment** → Add environment variables (key / value):
   - `DATABASE_URL` = (Internal Database URL with `postgresql+asyncpg://` as the scheme).
   - `SECRET_KEY` = (generate a strong key, e.g. `openssl rand -hex 32`).
   - `BACKEND_CORS_ORIGINS` = leave empty for now; set after Vercel deploys (see Phase 7).
10. **Python version:** The stack uses `asyncpg>=0.31` and `greenlet>=3.0.3,<4`, which provide pre-built wheels for Python 3.13, so Render’s default (Python 3.13) should work. If you see "Failed to build wheels for asyncpg/greenlet", set **Environment** → `PYTHON_VERSION` = `3.11.9` or ensure `customer-api/.python-version` contains `3.11`.
11. **Create Web Service**. Wait for the first deploy to succeed.
12. Note the service URL (e.g. `https://customer-api-xxxx.onrender.com`). Frontends will use this base URL and append `/v1` (e.g. `https://customer-api-xxxx.onrender.com/v1`).

---

### Phase 3: Render – admin-api

1. **Dashboard → New + → Web Service**; same GitHub repo.
2. **Name:** e.g. `admin-api`. **Region:** same as customer-api. **Root Directory:** `admin-api`.
3. **Build Command:** `pip install -r requirements.txt`. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. **Instance type:** Free.
5. **Environment:**
   - `DATABASE_URL` = (same value as customer-api; `postgresql+asyncpg://...`).
   - `STORAGE_PATH` = `/tmp/uploads` (Render’s disk is ephemeral; for beta this is acceptable; for persistent uploads you’d need a volume or external storage).
6. **Python version:** As with customer-api, use Python 3.11 to avoid asyncpg/greenlet wheel build failures. Add `admin-api/.python-version` with `3.11` or set **Environment** → `PYTHON_VERSION` = `3.11.9`.
7. **Create Web Service**. Note the admin-api URL (e.g. `https://admin-api-xxxx.onrender.com`).

---

### Phase 4: Seed the database

Run the seed once so the database has an admin user, sample products, and UI strings.

**Option A – From your machine (recommended)**  
1. Copy Render’s **External Database URL** from the PostgreSQL service (Info tab).  
2. Convert to asyncpg format: `postgresql+asyncpg://...` (replace `postgresql://` with `postgresql+asyncpg://`).  
3. Locally: `cd customer-api`, set `DATABASE_URL` to that value, then run `python3 reset_and_seed.py`.  
4. Ensure `asyncpg` is installed: `pip install asyncpg`.

**Option B – Render Shell**  
If your Render plan includes Shell access: open the **customer-api** service → **Shell** tab → run `python3 reset_and_seed.py` (with `DATABASE_URL` already set in the service env). This uses the Internal Database URL.

---

### Phase 5: Vercel – customer-web

1. Sign in at [vercel.com](https://vercel.com). **Add New → Project**; import your GitHub repo.
2. **Configure Project:**  
   - **Root Directory:** click **Edit** and set to `customer-web` (override root).  
   - **Framework Preset:** Next.js (auto-detected).
3. **Environment Variables** → Add:
   - `NEXT_PUBLIC_API_URL` = `https://customer-api-xxxx.onrender.com/v1` (your Render customer-api URL + `/v1`).
   - `NEXT_PUBLIC_ADMIN_URL` = (admin-web URL; you can add this after deploying admin-web in Phase 6, or leave default).
4. **Deploy**. After success, note the deployment URL (e.g. `https://customer-web-xxx.vercel.app`).

---

### Phase 6: Vercel – admin-web

1. **Add New → Project**; same repo.
2. **Root Directory:** set to `admin-web`. **Framework:** Vite (Vercel usually detects it).
3. **Build:** Vercel runs `npm run build` from the root directory. This repo uses a monorepo with `packages/design-tokens`. If your admin-web build expects the repo root (so it can resolve `@ecommerce/design-tokens`), set the project’s root to the **repository root** and set **Root Directory** to `admin-web` so the build context includes the workspace. If admin-web builds without the workspace in your setup, keep root directory as `admin-web` only.
4. **Environment variable:** `VITE_API_URL` = `https://admin-api-xxxx.onrender.com/v1` (full admin-api base URL; the built app uses this for API calls).
5. **Deploy**. Note the admin-web URL (e.g. `https://admin-web-xxx.vercel.app`).

---

### Phase 7: CORS and final env

1. In Render, open **customer-api** → **Environment**.
2. Set `BACKEND_CORS_ORIGINS` to a comma-separated list of your frontend origins (no spaces). Example:
   - `https://customer-web-xxx.vercel.app,https://admin-web-xxx.vercel.app`
   - If you deploy Expo web to Vercel, add that URL too (e.g. `https://your-expo-web.vercel.app`).
3. **Save**. Render will redeploy. If your admin-web calls admin-api from the browser and admin-api enforces CORS, add the same list to **admin-api**’s environment and redeploy.

---

### Phase 8: Shop – EAS Build (iOS/Android)

1. **Expo account:** Sign in at [expo.dev](https://expo.dev). Install EAS CLI: `npm i -g eas-cli`, then `eas login`.
2. **In the repo:** From the `shop/` directory run `eas build:configure` if you don’t have `eas.json` yet (this creates it).
3. **Production API URL:** Set `EXPO_PUBLIC_API_URL` for production builds. Either:
   - In **EAS Dashboard** → your project → **Environment variables** (production), add `EXPO_PUBLIC_API_URL` = `https://customer-api-xxxx.onrender.com/v1`, or  
   - In `shop/eas.json`, under the production profile, add an `env` block with `EXPO_PUBLIC_API_URL`.
4. **Build:** `eas build --platform all --profile production` (or `--platform ios` / `--platform android`).
5. **Submit to stores:** After the build completes, use `eas submit` to send the build to TestFlight (iOS) or Play Internal Testing (Android). See [Expo Submit](https://docs.expo.dev/submit/introduction/).

**Expo web (optional):** To deploy the shop web build to Vercel, build the web bundle, deploy the output to a Vercel project, then add that site’s URL to `BACKEND_CORS_ORIGINS` on customer-api.

---

### Optional: Bulk-import worker on Render

To process bulk uploads in the background: **Dashboard → New + → Background Worker**. Same repo; **Root Directory:** `admin-api`. **Command:** `python -m app.workers.bulk_import`. Set the same `DATABASE_URL` and `STORAGE_PATH` as admin-api. Note: on the free tier, worker and web service share ephemeral storage limits; for production you’d use a persistent volume or external storage.

---

### Phase 9: Discovery (optional)

If you want the discovery pipeline and dashboard on Path B:

1. **discovery-api on Render:** **Dashboard → New + → Web Service**. Same repo; **Root Directory:** `discovery-api`. **Build:** `pip install -r requirements.txt`. **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. **Environment:** `DATABASE_URL` (e.g. SQLite on ephemeral disk: leave default or set a path; or use a second Render PostgreSQL for discovery), plus `RAPIDAPI_KEY`, `RAPIDAPI_ALIEXPRESS_HOST`, `SERPAPI_API_KEY` (and any other strategy keys) per [discovery-api/README](discovery-api/README.md). Note the service URL (e.g. `https://discovery-api-xxxx.onrender.com`).

2. **discovery-web on Vercel:** **Add New → Project**; same repo. **Root Directory:** `discovery-web`. Set `VITE_DISCOVERY_API_URL` (or the proxy target in Vite config) to the discovery-api URL (e.g. `https://discovery-api-xxxx.onrender.com`). Deploy.

---

## 5. Path C: Google Cloud (GCP)

Host the full stack on Google Cloud using managed services: Cloud Run (APIs and optionally frontends), Cloud SQL (PostgreSQL), Secret Manager. Good for production; billing must be enabled (free tier still applies to many products). **Complete Section 1**; then follow the steps below.

### Architecture overview

- **APIs:** Deploy as **Cloud Run** services (customer-api, admin-api). Each uses the same **Cloud SQL** PostgreSQL instance and reads secrets (e.g. `DATABASE_URL`, `SECRET_KEY`) from **Secret Manager** or Cloud Run env vars.
- **customer-bff (optional):** Cloud Run service in front of customer-api; set `CUSTOMER_API_URL`, `RATE_LIMIT_PER_MIN`.
- **discovery-api:** Cloud Run; own DB (separate Cloud SQL database or SQLite on ephemeral storage). Secrets for `RAPIDAPI_KEY`, `SERPAPI_API_KEY` etc. per [discovery-api/README](discovery-api/README.md).
- **discovery-web:** Static on Cloud Storage + Load Balancer or Firebase Hosting, or Cloud Run; set API URL to discovery-api.
- **Frontends:** customer-web (Next.js) can run on Cloud Run as a Node server or as a static export on Cloud Storage + CDN; admin-web (Vite) as static files on Cloud Storage + Load Balancer or Firebase Hosting.
- **Shop:** Build and distribute via **EAS** (iOS/Android); set `EXPO_PUBLIC_API_URL` to your customer-api Cloud Run URL. Expo web can be hosted on Firebase Hosting or elsewhere.

### Step-by-step (GCP)

1. **Create GCP project and enable APIs**  
   Create a project in [Cloud Console](https://console.cloud.google.com) (or `gcloud projects create`). Enable billing. Enable APIs: **Cloud Run**, **Cloud SQL Admin API**, **Secret Manager API**, **Artifact Registry API**, **Cloud Build API** (e.g. via Console → APIs & Services → Enable APIs).

2. **Cloud SQL PostgreSQL**  
   Create a **Cloud SQL for PostgreSQL** instance (second-generation, small size). Create a database (e.g. `ecommerce`) and a user with a password. Note the **connection name** (for private IP) or use the instance’s public IP with SSL. Build the connection string: `postgresql+asyncpg://user:password@/cloudsql/PROJECT:REGION:INSTANCE/ecommerce` (Unix socket from Cloud Run) or `postgresql+asyncpg://user:password@PUBLIC_IP:5432/ecommerce`. Store this in Secret Manager (next step).

3. **Secret Manager**  
   Create secrets for `DATABASE_URL`, `SECRET_KEY`, and (if used) Stripe keys. Grant the Cloud Run service account (e.g. default compute service account) permission to access these secrets (`Secret Manager Secret Accessor`). In Cloud Run you can reference secrets as environment variables or mounted volumes.

4. **Build and push container images**  
   - (a) Build customer-api and admin-api images using [customer-api/Dockerfile](customer-api/Dockerfile) and [admin-api/Dockerfile](admin-api/Dockerfile). Ensure `asyncpg` is in admin-api requirements when using PostgreSQL.  
   - (b) Build customer-web and admin-web with **repo root** as build context (for `packages/design-tokens`) using [customer-web/Dockerfile](customer-web/Dockerfile) and [admin-web/Dockerfile](admin-web/Dockerfile).  
   - (c) Push all images to **Artifact Registry** (or Container Registry). Use a Cloud Build trigger from your repo or run builds manually.

5. **Deploy customer-api to Cloud Run**  
   Deploy the customer-api image to Cloud Run. Set env vars or mount Secret Manager: `DATABASE_URL`, `SECRET_KEY`, `BACKEND_CORS_ORIGINS` (your production frontend origins). If the DB is Cloud SQL, use the Cloud SQL connection (add the Cloud SQL connection to the Cloud Run service). Allow unauthenticated invocations if the API is public. Set minimum instances to 0 for cost savings; set max instances as needed.

   **5a. (Optional) Deploy customer-bff:** Deploy the customer-bff image (build from `customer-bff/`) to Cloud Run. Set `CUSTOMER_API_URL` to your customer-api Cloud Run URL (e.g. `https://customer-api-xxxx.run.app`), and `RATE_LIMIT_PER_MIN`. Route client traffic to the BFF URL instead of customer-api directly if you use it.

6. **Deploy admin-api to Cloud Run**  
   Same pattern: deploy admin-api image; same `DATABASE_URL`; set `STORAGE_PATH` to `/tmp` for ephemeral storage (acceptable for beta) or configure a Cloud Storage bucket (e.g. GCS FUSE or upload directly to a bucket from the app) for persistent uploads.

7. **Run database migrations / seed**  
   One-time: run `reset_and_seed.py` against the production DB.  
   - (a) Run from your machine using **Cloud SQL Proxy** and the DB connection string; or  
   - (b) Run as a **Cloud Run Job** (same customer-api image, command override to run the seed script) with `DATABASE_URL` from Secret Manager; or  
   - (c) A Cloud Build step that runs the seed with the DB URL from Secret Manager.

8. **Deploy customer-web**  
   - (a) **Option A:** Build a Next.js standalone Docker image and deploy it to Cloud Run (Node server).  
   - (b) **Option B:** If using static export (`next export`), upload the output to a **Cloud Storage** bucket and serve via **Load Balancer** or **Firebase Hosting**.  
   Set CORS and env (e.g. `NEXT_PUBLIC_API_URL`) at build time for the chosen approach.

9. **Deploy admin-web**  
   - (a) Run `npm run build` from repo root (with admin-web and design-tokens). Set `VITE_API_URL` to the admin-api Cloud Run URL when building.  
   - (b) Upload the built static files to a **Cloud Storage** bucket. Configure the bucket for static website hosting, or put a **Load Balancer** or **Firebase Hosting** in front.

10. **CORS and frontend env**  
    Set `BACKEND_CORS_ORIGINS` on customer-api (and admin-api if needed) to your Cloud Run or custom frontend URLs. Rebuild frontends with `NEXT_PUBLIC_API_URL` and `VITE_API_URL` pointing to the deployed API URLs.

   **10a. (Optional) Deploy discovery-api and discovery-web:** Build and deploy discovery-api (from `discovery-api/`) to Cloud Run with its own `DATABASE_URL` (e.g. a second Cloud SQL database or SQLite on ephemeral storage). Store `RAPIDAPI_KEY`, `SERPAPI_API_KEY`, and other strategy keys in Secret Manager and attach to the service (see [discovery-api/README](discovery-api/README.md)). Deploy discovery-web as static files (e.g. Cloud Storage + Load Balancer) or Cloud Run; set the discovery-api URL so the dashboard can call it.

11. **Custom domains and HTTPS (optional)**  
    Map custom domains to your Cloud Run services or to a Load Balancer; use **Google-managed SSL certificates** for HTTPS.

12. **Shop (mobile and optional web)**  
    Set `EXPO_PUBLIC_API_URL` to the customer-api Cloud Run URL. Use **EAS Build** and **EAS Submit** for iOS/Android. Optionally deploy Expo web to **Firebase Hosting** or another host and add that URL to CORS.

13. **Bulk-import worker**  
    Deploy as a **Cloud Run Job** (or a separate Cloud Run service) using the admin-api image with command `python -m app.workers.bulk_import`. Trigger on a schedule (Cloud Scheduler) or from admin-api (e.g. **Cloud Tasks**). For beta you can skip this and run imports in-process or on-demand.

### Cost and free tier (GCP)

GCP’s free tier includes monthly free egress and a generous number of Cloud Run invocations. **Cloud SQL** does not have a permanent free tier; a small instance is low cost. Billing must be enabled on the project. Monitor usage in the Cloud Console Billing section.

---

## 6. Beta Caveats

- **Render free web services** sleep after ~15 min idle; first request can be slow.
- **PostgreSQL free tier** has connection and storage limits.
- **TestFlight / Play internal** have rate limits but are sufficient for beta.
- **Docker on a VPS** avoids cold starts but you manage the host and updates.
- **Discovery APIs** (e.g. AliExpress, SerpApi) may have rate limits from third-party providers; check each strategy’s API tier.

---

## 7. Local Production Test

```bash
# Production-style builds (no Docker)
cd customer-web && npm run build && npm run start
cd admin-web && npm run build && npm run preview
```

To test the full stack with Docker (SQLite):

```bash
docker compose up --build
# Customer Web: http://127.0.0.1:3002, Admin Web: http://127.0.0.1:5174, Discovery Web: http://127.0.0.1:5176
# APIs: http://127.0.0.1:8002, http://127.0.0.1:8003, Discovery API: http://127.0.0.1:8006
# Customer BFF (optional): http://127.0.0.1:8012
```

The full stack includes discovery-api, discovery-web, and optionally customer-bff; see [docs/DOCKER.md](docs/DOCKER.md) and [ARCHITECTURE.md](ARCHITECTURE.md) for ports and details.
