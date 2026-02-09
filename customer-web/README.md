# Customer Web

Next.js customer web app. Browsing, cart, checkout, orders, profile.

## Setup

```bash
npm install
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local` (talks directly to Customer API so auth headers are sent).

## Run

Start Customer API first:

```bash
cd ../customer-api && python3 -m uvicorn app.main:app --reload
```

Then:

```bash
npm run dev
```

Open http://localhost:3000

## Features

- Product listing, filters, and detail
- Cart (guest + logged-in)
- Login / Sign up
- Checkout (address selection, mock payment)
- Orders history and order detail
- Profile and saved addresses (CRUD)
- Multi-language (EN/AR)
- Admin Dashboard link (opens Admin Web in new tab)
