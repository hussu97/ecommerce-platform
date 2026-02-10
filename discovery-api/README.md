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

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/v1/products` | List discovered products (query: strategy_id, delivers_to_uae, limit, offset) |
| GET | `/v1/products/{id}` | Single product detail |
| GET | `/v1/strategies` | List registered strategies |
| POST | `/v1/runs` | Trigger a run (body: `{"strategy_id": "mock_trending"}` or `"all"`) |

## Adding a strategy

Implement a class in `app/strategies/` that subclasses `BaseStrategy` and implements `run() -> list[dict]`. Register it in `app/strategies/__init__.py` (STRATEGY_REGISTRY and get_enabled_strategy_ids). Each dict must include at least: `title`, `source_url`; optional: `brand`, `image_url`, `price`, `currency`, `delivers_to_uae`, `raw_payload`.
