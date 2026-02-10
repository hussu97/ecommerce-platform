# Customer Web

Next.js customer web app. Browsing, cart, checkout, orders, profile.

## Setup

```bash
npm install
```

**Environment:** Optional. Create a `.env.local` file in the `customer-web/` directory and add variables (e.g. `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/v1`). Unset = `/api` (Next.js rewrites to the backend). If you use a full URL, it must include `/v1` or the app will append it. **Use `127.0.0.1` only—not `localhost`** (localhost can resolve to IPv6 on macOS). Restart the dev server after changing `.env.local`.

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

3. Open http://127.0.0.1:3000

## Environment (reference)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | (unset → `/api` rewrites) | Customer API base URL including `/v1` (e.g. `http://127.0.0.1:8000/v1`). |

Set in `.env.local`; restart the dev server after changes.

## Features

- Product listing, filters, and detail
- Cart (guest + logged-in)
- Login / Sign up
- Checkout (address selection, mock payment)
- Orders history and order detail
- Profile and saved addresses (CRUD)
- Multi-language (EN/AR)
