# Admin Web

Desktop-only admin dashboard (React + Vite + Tailwind). Manages products, orders, taxonomies, taxonomy attributes, and brands.

## Setup

```bash
npm install
```

Set `VITE_API_URL=http://localhost:8001` in `.env` if Admin API runs elsewhere.

## Run

Start Admin API first:

```bash
cd ../admin-api && python3 -m uvicorn app.main:app --reload --port 8001
```

Then:

```bash
npm run dev
```

Open http://localhost:5173 and log in with admin credentials (e.g. `admin@example.com` / `admin123`).
