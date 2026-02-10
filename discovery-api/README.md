# Discovery API

FastAPI backend for the product discovery pipeline: pluggable strategies, runs, and list/filter discovered products. Uses its **own SQLite database** (separate from the main ecommerce DB).

## Setup

```bash
cd discovery-api
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Database:** Tables are created on startup. Default DB file: `./discovery.db`. Override with `DATABASE_URL` (e.g. `sqlite+aiosqlite:///./discovery.db`).

## Run

```bash
python3 -m uvicorn app.main:app --reload --port 8004
```

API: http://127.0.0.1:8004 (docs: http://127.0.0.1:8004/docs).

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./discovery.db` | SQLite path (or PostgreSQL with asyncpg for production) |
| `DEBUG` | `True` | Enable SQL echo and debug mode |
| `SERPAPI_API_KEY` | — | SerpApi key for Google Shopping (UAE) and Google Trends. Get one at [serpapi.com](https://serpapi.com). Optional; strategies that need it return no results if unset. |
| `RAPIDAPI_KEY` | — | RapidAPI key for AliExpress strategy. Get one at [rapidapi.com](https://rapidapi.com). Optional. |
| `RAPIDAPI_ALIEXPRESS_HOST` | — | RapidAPI host for the AliExpress API (e.g. `aliexpress-api2.p.rapidapi.com` from your chosen API’s docs). Required for AliExpress strategy. |
| `DISCOVERY_MAX_ASP_AED` | `500` | Max product price (AED) for inclusion; products above this are filtered out. |
| `DISCOVERY_QUERY_LIST` | — | Comma-separated search queries (e.g. `wireless earbuds, yoga mat`) or path to a file with one query per line. If unset, a small default list is used. |
| `DISCOVERY_TRENDS_GEO` | `ae` | Default geo for Google Trends (e.g. `ae` for UAE). |
| `DISCOVERY_QUERY_SOURCE` | `static` | `static` = use DISCOVERY_QUERY_LIST (or default); `trending` = use Google Trends trending searches as queries for the Google Shopping strategy. |
| `USD_TO_AED` | `3.67` | Conversion factor for AliExpress (USD) to AED when applying DISCOVERY_MAX_ASP_AED. |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/products` | List discovered products (query: strategy_id, delivers_to_uae, limit, offset) |
| GET | `/v1/products/{id}` | Single product detail |
| GET | `/v1/strategies` | List registered strategies |
| POST | `/v1/runs` | Trigger a run (body: `{"strategy_id": "mock_trending"}` or `"serpapi_google_shopping_uae"` or `"aliexpress_trending_uae"` or `"all"`) |
| GET | `/v1/trends/trending-searches` | Google Trends trending searches (query: geo, hours, category_id, hl). Requires SERPAPI_API_KEY. |
| GET | `/v1/trends/interest-by-region` | Google Trends interest by region (query: q, geo, region, date, hl). Requires SERPAPI_API_KEY. |

## Adding a strategy

Implement a class in `app/strategies/` that subclasses `BaseStrategy` and implements `run() -> list[dict]`. Register it in `app/strategies/__init__.py` (STRATEGY_REGISTRY and get_enabled_strategy_ids). Each dict must include at least: `title`, `source_url`; optional: `brand`, `image_url`, `price`, `currency`, `delivers_to_uae`, `raw_payload`.
