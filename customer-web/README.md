# Customer Web

Next.js customer web app. Browsing, cart, checkout, orders, profile.

## Setup

```bash
npm install
```

Optional: set `NEXT_PUBLIC_API_URL` in `.env.local`. Unset = `/api` (Next.js rewrites to the backend). If you use a full URL (e.g. `http://localhost:8000`), it must include `/v1` or the app will append it. The app talks to the Customer API; auth headers are sent from the same origin.

## Run

1. Start **Customer API** first (from repo root or `customer-api/`):

   ```bash
   cd customer-api
   source venv/bin/activate   # or venv\Scripts\activate on Windows
   python3 -m uvicorn app.main:app --reload
   ```

2. Start the app:

   ```bash
   cd customer-web
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

## Features

- Product listing, filters, and detail
- Cart (guest + logged-in)
- Login / Sign up
- Checkout (address selection, mock payment)
- Orders history and order detail
- Profile and saved addresses (CRUD)
- Multi-language (EN/AR)
- Admin Dashboard link (opens Admin Web in new tab)
