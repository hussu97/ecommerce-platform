# Admin Web

Desktop-only admin dashboard (React + Vite + Tailwind). Manages products, orders, taxonomies, taxonomy attributes, and brands.

## Setup

```bash
npm install
```

**Environment:** Optional. Create a `.env` file in the `admin-web/` directory. Set `VITE_API_URL` if needed (default: dev server proxies `/api` to `http://127.0.0.1:8001/v1`). Restart the dev server after changing `.env`.

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

## Environment (reference)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` (proxied in dev) | API base path or full Admin API URL. |

Set in `.env`; restart the dev server after changes.
