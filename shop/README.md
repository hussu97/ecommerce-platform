# Shop

Cross-platform shopping app (Web, iOS, Android) built with React Native + Expo.

## Setup

```bash
npm install
```

Optional: set `EXPO_PUBLIC_API_URL` in `.env` (default: `http://localhost:8000/v1`). Must point at the Customer API base URL including the `/v1` prefix.

## Run

1. Start **Customer API** first (from repo root or `customer-api/`):

   ```bash
   cd customer-api
   source venv/bin/activate   # or venv\Scripts\activate on Windows
   python3 -m uvicorn app.main:app --reload
   ```

2. Start the app:

   ```bash
   cd shop
   npm install
   npm start         # Expo dev server (then choose web / iOS / Android)
   npm run web       # Web only
   npm run ios       # iOS simulator
   npm run android   # Android emulator
   ```

## Features

- Product listing with filters
- Product detail
- Cart (guest + logged-in)
- Login / Sign up
- Checkout
- Orders and order detail
- Saved addresses (CRUD)
- Product reviews (rate after purchase)
- Multi-language (EN/AR)
