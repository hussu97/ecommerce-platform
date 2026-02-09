# Shop

Cross-platform shopping app (Web, iOS, Android) built with React Native + Expo.

## Setup

```bash
npm install
```

Set `EXPO_PUBLIC_API_URL` in `.env` if Customer API runs elsewhere (default: `http://localhost:8000`).

## Run

Start Customer API first:

```bash
cd ../customer-api && python3 -m uvicorn app.main:app --reload
```

Then:

```bash
npm start         # Expo dev server
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
