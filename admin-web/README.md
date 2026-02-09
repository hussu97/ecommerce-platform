# Admin Web

Desktop-only admin dashboard (React + Vite + Tailwind). Manages products, orders, taxonomies, taxonomy attributes, and brands.

## Setup

```bash
npm install
```

Optional: set `VITE_API_URL` in `.env`. When running locally, the dev server proxies `/api` to `http://127.0.0.1:8001/v1` by default (see `vite.config.ts`).

## Run

1. Start **Admin API** first (and ensure it uses the same database as customer-api):

   ```bash
   cd admin-api
   source venv/bin/activate   # or venv\Scripts\activate on Windows
   # Set DATABASE_URL in .env to the same DB as customer-api
   python3 -m uvicorn app.main:app --reload --port 8001
   ```

2. Start the app:

   ```bash
   cd admin-web
   npm install
   npm run dev
   ```

3. Open http://127.0.0.1:5173 and log in with admin credentials (e.g. `admin@example.com` / `admin123`).
