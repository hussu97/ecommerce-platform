# Discovery API

FastAPI backend for the product discovery pipeline: pluggable strategies, runs, and list/filter discovered products. Uses its **own SQLite database** (separate from the main ecommerce DB).

## Setup

**Python:** 3.11+ (3.14 recommended). See `.python-version` in this directory.

```bash
cd discovery-api
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Database:** Tables are created on startup. The `strategies` table is seeded from the code registry (mock_trending, serpapi_google_shopping_uae, aliexpress_trending_uae, amazon_bestseller_sellermagnet) so GET `/v1/strategies` returns all available strategies. Default DB file: `./discovery.db`. Override with `DATABASE_URL` (e.g. `sqlite+aiosqlite:///./discovery.db`).

## Run

**Start from the `discovery-api/` directory** so that the `.env` file in that folder is loaded:

```bash
cd discovery-api
source venv/bin/activate   # or venv\Scripts\activate on Windows
python3 -m uvicorn app.main:app --reload --port 8004
```

API: http://127.0.0.1:8004 (docs: http://127.0.0.1:8004/docs).

## Environment

**How to set variables:** Create a `.env` file in the `discovery-api/` directory (same folder as `requirements.txt`). Add one line per variable, e.g.:

```bash
SERPAPI_API_KEY=your_key_here
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_ALIEXPRESS_HOST=aliexpress-true-api.p.rapidapi.com
DISCOVERY_MAX_ASP_AED=500
```

The app loads `.env` from the **current working directory** when uvicorn starts—so always run uvicorn from inside `discovery-api/` (as in the Run section above). You can also export variables in your shell before running uvicorn. Restart the server after changing `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./discovery.db` | SQLite path (or PostgreSQL with asyncpg for production) |
| `DEBUG` | `True` | Enable SQL echo and debug mode |
| `SERPAPI_API_KEY` | — | SerpApi key for Google Shopping (UAE) and Google Trends. Get one at [serpapi.com](https://serpapi.com). Optional; strategies that need it return no results if unset. |
| `RAPIDAPI_KEY` | — | RapidAPI key for AliExpress strategy. Get one at [rapidapi.com](https://rapidapi.com). Optional. |
| `RAPIDAPI_ALIEXPRESS_HOST` | `aliexpress-true-api.p.rapidapi.com` | Aliexpress True API v2.1.0 host. The AliExpress strategy uses **GET /hot-products** (trending, high-commission products) with UAE targeting. |
| `DISCOVERY_ALIEXPRESS_SHIP_COUNTRY` | `AE` | Destination country for AliExpress (ISO 3166-1 alpha-2; AE = UAE). |
| `DISCOVERY_ALIEXPRESS_LANGUAGE` | `EN` | Language for product content (e.g. EN, AR). |
| `DISCOVERY_MAX_ASP_AED` | `500` | Max product price (AED) for inclusion; products above this are filtered out. |
| `DISCOVERY_QUERY_LIST` | — | Comma-separated search queries (e.g. `wireless earbuds, yoga mat`) or path to a file with one query per line. If unset, a small default list is used. |
| `DISCOVERY_TRENDS_GEO` | `ae` | Default geo for Google Trends (e.g. `ae` for UAE). |
| `DISCOVERY_QUERY_SOURCE` | `static` | Query source for SerpApi/AliExpress: `static` = DISCOVERY_QUERY_LIST or file or default; `trending` = Google Trends; `reddit` = hot posts from REDDIT_SUBREDDITS; `tokinsight` = TokInsight TikTok trending (RapidAPI). |
| `USD_TO_AED` | `3.67` | Conversion factor for AliExpress (USD) to AED when applying DISCOVERY_MAX_ASP_AED. |
| **Phase 2 – Amazon best-seller** | | |
| `SELLERMAGNET_API_KEY` | — | SellerMagnet API key for Amazon best-seller strategy. Optional; strategy returns no results if unset. |
| `AMAZON_MARKETPLACE_ID` | `ATVPDKIKX0DER` | Amazon marketplace ID (e.g. US). |
| `AMAZON_CATEGORY_IDS` | — | Comma-separated category IDs for best-seller fetch (e.g. `172282,2335752011`). If unset, a small default set is used. |
| `AMAZON_DOMAIN` | `amazon.com` | Domain for product links (e.g. `amazon.ae`, `amazon.com`). |
| **Phase 2 – Reddit query source** | | |
| `REDDIT_CLIENT_ID` | — | Reddit OAuth app client ID (for `DISCOVERY_QUERY_SOURCE=reddit`). Optional. |
| `REDDIT_CLIENT_SECRET` | — | Reddit OAuth app client secret. Optional. |
| `REDDIT_SUBREDDITS` | `BuyItForLife,Frugal,GiftIdeas` | Comma-separated subreddits to fetch hot posts from. |
| **Phase 2 – TokInsight (TikTok) query source** | | |
| `TOKINSIGHT_API_KEY` | — | TokInsight API key (if using direct API). Optional. |
| `RAPIDAPI_TOKINSIGHT_HOST` | — | RapidAPI host for TokInsight TikTok (e.g. from RapidAPI TikTok APIs). Used with `RAPIDAPI_KEY` when `DISCOVERY_QUERY_SOURCE=tokinsight`. Optional. |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/products` | List discovered products (query: strategy_id, delivers_to_uae, limit, offset) |
| GET | `/v1/products/{id}` | Single product detail |
| GET | `/v1/strategies` | List registered strategies |
| POST | `/v1/runs` | Trigger a run (body: `{"strategy_id": "mock_trending"}` or `"serpapi_google_shopping_uae"` or `"aliexpress_trending_uae"` or `"amazon_bestseller_sellermagnet"` or `"all"`) |
| GET | `/v1/trends/trending-searches` | Google Trends trending searches (query: geo, hours, category_id, hl). Requires SERPAPI_API_KEY. |
| GET | `/v1/trends/interest-by-region` | Google Trends interest by region (query: q, geo, region, date, hl). Requires SERPAPI_API_KEY. |

## Phase 1: Query source (static / category-based)

Discovery uses a **query list** to drive product search (e.g. SerpApi Google Shopping runs one request per query). The default is **static** (no Google Trends).

**Ways to set queries:**

1. **Comma-separated in env:** `DISCOVERY_QUERY_LIST=wireless earbuds,yoga mat,phone stand`
2. **File (one query per line):** `DISCOVERY_QUERY_LIST=data/queries_example.txt`  
   - Use a path relative to the directory you start uvicorn from (e.g. `discovery-api/`).  
   - Lines starting with `#` and blank lines are ignored.  
   - Example file: [data/queries_example.txt](data/queries_example.txt).
3. **Default:** If unset, a built-in category-based list is used (see `app/services/query_source.py`).

**Google Trends** is available for manual research via GET `/v1/trends/trending-searches` and GET `/v1/trends/interest-by-region`. You can set `DISCOVERY_QUERY_SOURCE` to:

- `static` (default) – use DISCOVERY_QUERY_LIST, file, or built-in list.
- `trending` – use Google Trends as the query list for SerpApi/AliExpress runs.
- `reddit` – use hot post titles from `REDDIT_SUBREDDITS` as queries (requires Reddit OAuth credentials).
- `tokinsight` – use TokInsight TikTok trending terms as queries (requires `RAPIDAPI_KEY` and `RAPIDAPI_TOKINSIGHT_HOST`).

### Bootstrap query list from open datasets (optional)

You can build a query file from a CSV (e.g. from [Kaggle](https://www.kaggle.com/datasets) or [OpenDataBay](https://www.opendatabay.com/)):

```bash
cd discovery-api
python scripts/bootstrap_query_list_from_csv.py path/to/downloaded.csv "product_name" > data/my_queries.txt
# Optional: limit to 50 lines
python scripts/bootstrap_query_list_from_csv.py path/to/file.csv "title" --limit 50 > data/my_queries.txt
```

Then set `DISCOVERY_QUERY_LIST=data/my_queries.txt` in `.env`. Use the column that contains product names or search terms (e.g. `product_name`, `title`, `name`, `keyword`).

## Adding a strategy

Implement a class in `app/strategies/` that subclasses `BaseStrategy` and implements `run() -> list[dict]`. Register it in `app/strategies/__init__.py` (STRATEGY_REGISTRY and get_enabled_strategy_ids). Each dict must include at least: `title`, `source_url`; optional: `brand`, `image_url`, `price`, `currency`, `delivers_to_uae`, `raw_payload`.
