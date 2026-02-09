# Production Deployment Guide

Steps to make the ecommerce platform production-ready and deploy to the cloud on free/cheap tiers for beta testing.

---

## 1. Production Readiness Checklist

### Environment & Secrets
- [ ] Move all secrets (DB URL, JWT secret, API keys) to environment variables
- [ ] Add `.env.example` files (no real secrets) for documentation
- [ ] Ensure `.env` is in `.gitignore`

### Database
- [ ] Switch from SQLite to **PostgreSQL** (required for cloud)
- [ ] Add connection pooling (e.g. `asyncpg`)
- [ ] Update `DATABASE_URL` to PostgreSQL connection string

### API Configuration
- [ ] Set `BACKEND_CORS_ORIGINS` to actual frontend URLs (no `*`)
- [ ] Ensure APIs listen on `0.0.0.0` for container hosting
- [ ] Use HTTPS (platforms handle SSL)

### Frontend
- [ ] Set `NEXT_PUBLIC_API_URL` (customer-web) to production API URL
- [ ] Set admin API URL in admin-web
- [ ] Set `EXPO_PUBLIC_API_URL` in shop for mobile builds

### Security
- [ ] Strong JWT secret, sensible token expiry
- [ ] Rate limiting on auth endpoints
- [ ] No stack traces in error responses

---

## 2. Cloud Deployment (Free Tiers)

### Recommended Architecture

| App           | Platform | URL            | Free tier notes                      |
|---------------|----------|----------------|--------------------------------------|
| customer-web  | Vercel   | vercel.com     | Next.js, static sites                |
| admin-web     | Vercel   | vercel.com     | Static site (Vite)                   |
| customer-api  | Render   | render.com     | Web service (sleeps when idle)       |
| admin-api     | Render   | render.com     | Web service                          |
| PostgreSQL    | Render   | render.com     | Free database tier                   |
| shop (web)    | Vercel   | vercel.com     | Expo web build as static             |

### Platform Links
- **Vercel** – vercel.com (frontend)
- **Render** – render.com (APIs + PostgreSQL)
- **Railway** – railway.app ($5 credit/month alternative)
- **Supabase** – supabase.com (PostgreSQL alternative)
- **EAS Build** – expo.dev/eas (iOS/Android builds)

---

## 3. Step-by-Step Deployment

### 1. Create PostgreSQL database
- On Render: Dashboard → New → PostgreSQL
- Copy the **Internal Database URL** (for same-region API) or External URL

### 2. Migrate from SQLite to PostgreSQL
- Update `DATABASE_URL` in both APIs to PostgreSQL URL
- Run `reset_and_seed.py` against PostgreSQL (or migrate schema manually)
- Install PostgreSQL driver: `pip install asyncpg` (and update SQLAlchemy connection string)

### 3. Deploy customer-api
- Render: New → Web Service
- Connect repo, set build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add env: `DATABASE_URL`, `SECRET_KEY`, `BACKEND_CORS_ORIGINS`

### 4. Deploy admin-api
- Same as customer-api, port 8001 or use same service with different routes
- Same `DATABASE_URL` as customer-api

### 5. Deploy customer-web
- Vercel: Import repo, select `customer-web` as root
- Add env: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`
- Build and deploy

### 6. Deploy admin-web
- Vercel: Import same repo, set root to `admin-web`
- Add env: `VITE_API_URL` (or equivalent) for admin API

### 7. Configure CORS
- Set `BACKEND_CORS_ORIGINS` on both APIs to include:
  - `https://your-customer-web.vercel.app`
  - `https://your-admin-web.vercel.app`
  - `https://your-shop-web.vercel.app` (if applicable)

### 8. Shop (mobile)
- Set `EXPO_PUBLIC_API_URL` to production API
- Use EAS Build for iOS/Android
- Distribute via TestFlight (iOS) / Play Internal Testing (Android)

---

## 4. Beta Caveats

- **Render free web services** sleep after ~15 min idle; first request may be slow
- **PostgreSQL free tier** has connection/storage limits
- **TestFlight / Play internal** have rate limits but are sufficient for beta

---

## 5. Local Production Test

```bash
# Test production builds locally
cd customer-web && npm run build && npm run start
cd admin-web && npm run build && npm run preview
```
