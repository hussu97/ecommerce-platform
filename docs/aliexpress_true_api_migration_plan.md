# Migrate AliExpress strategy to Aliexpress True API (v2.1.0) – /hot-products

## Source: Official API documentation

This plan is based on the provided Aliexpress True API documentation (Base URL `https://aliexpress-true-api.p.rapidapi.com/api/v3/`, host `aliexpress-true-api.p.rapidapi.com`). The strategy will use **GET /hot-products** for trending, high-commission products instead of a generic search endpoint.

---

## API contract (from docs)

| Item | Value |
|------|--------|
| **Base URL** | `https://aliexpress-true-api.p.rapidapi.com/api/v3/` |
| **Host** | `aliexpress-true-api.p.rapidapi.com` |
| **Auth** | Headers: `X-RapidAPI-Key`, `X-RapidAPI-Host: aliexpress-true-api.p.rapidapi.com` |
| **Endpoint** | **GET** `/hot-products` (same params as Search Products) |

### /hot-products parameters (from docs)

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|--------|
| `keywords` | string | No | — | Search terms (one per request; we iterate over query list) |
| `category_ids` | string | No | — | Comma-separated category IDs |
| `min_sale_price` | float | No | — | Min price in target currency |
| `max_sale_price` | float | No | — | Max price (derive from DISCOVERY_MAX_ASP_AED / USD_TO_AED if desired) |
| `page_no` | integer | No | 1 | Page number |
| `page_size` | integer | No | 50 | Max 50 |
| `sort` | string | No | — | SALE_PRICE_ASC, SALE_PRICE_DESC, LAST_VOLUME_ASC, **LAST_VOLUME_DESC** (most popular) |
| `target_currency` | string | No | USD | |
| `target_language` | string | No | EN | |
| `ship_to_country` | string | No | TH | Use **AE** for UAE |
| `delivery_days` | integer | No | — | Optional filter |
| `fields` | string | No | — | Optional |

### /hot-products response shape (from docs)

```json
{
  "current_page_no": 1,
  "current_record_count": 20,
  "total_page_no": 100,
  "total_record_count": 4892,
  "products": {
    "product": [
      {
        "product_id": 1005006079931969,
        "product_title": "Wireless Bluetooth Earbuds TWS",
        "product_main_image_url": "https://ae01.alicdn.com/kf/...",
        "target_sale_price": "29.99",
        "target_original_price": "59.99",
        "discount": "50%",
        "commission_rate": "7%",
        "evaluate_rate": "4.8",
        "lastest_volume": 15420,
        "promotion_link": "https://s.click.aliexpress.com/e/_ABC123"
      }
    ]
  }
}
```

- **Product list path:** `response["products"]["product"]` (array).
- **Field mapping to discovery schema:**  
  - title ← `product_title`  
  - source_url ← `promotion_link` (affiliate); fallback `https://www.aliexpress.com/item/{product_id}.html`  
  - image_url ← `product_main_image_url`  
  - price ← `target_sale_price` (string; parse to float)  
  - currency ← request’s `target_currency` (USD); not per-item in response  

---

## 1. Config changes

**File:** [discovery-api/app/core/config.py](discovery-api/app/core/config.py)

- **RAPIDAPI_ALIEXPRESS_HOST:** Default to `aliexpress-true-api.p.rapidapi.com` so the strategy works out-of-the-box with the new API. Keep optional override via env for flexibility.
- **Optional new:** `DISCOVERY_ALIEXPRESS_SHIP_COUNTRY` (default `AE` for UAE) and `DISCOVERY_ALIEXPRESS_LANGUAGE` (default `EN`). If not added, hardcode `ship_to_country=AE` and `target_language=EN` in the strategy.

Recommendation: add the two optional settings so UAE/language are explicit and configurable without code change.

---

## 2. Strategy implementation

**File:** [discovery-api/app/strategies/aliexpress_rapidapi.py](discovery-api/app/strategies/aliexpress_rapidapi.py)

### 2.1 URL and request

- **Base URL:** Build from host: `https://{host}/api/v3` (docs use path prefix `/api/v3/`).  
  If `RAPIDAPI_ALIEXPRESS_HOST` is set (e.g. `aliexpress-true-api.p.rapidapi.com`), base = `https://aliexpress-true-api.p.rapidapi.com/api/v3`.
- **Path:** `/hot-products` (fixed; no config needed for this endpoint).
- **Method:** GET.
- **Headers:** `X-RapidAPI-Key`, `X-RapidAPI-Host` (from settings).
- **Query params per request:**
  - `keywords` = current query from `get_queries(max_queries=5)`.
  - `page_no` = 1 (single page per keyword is enough; can later add pagination).
  - `page_size` = e.g. 20 or 50 (cap to avoid burning quota).
  - `target_currency` = `USD`.
  - `target_language` = from config or default `EN`.
  - `ship_to_country` = from config or default `AE`.
  - `sort` = `LAST_VOLUME_DESC` (most popular / “trending”).
  - Optionally `max_sale_price` derived from `DISCOVERY_MAX_ASP_AED` and `USD_TO_AED` so the API-side filter aligns with our ASP filter.

### 2.2 Response parsing (True API only)

- Parse JSON; then `items = data.get("products") and data["products"].get("product")`.
- If `items` is not a list (e.g. API returns a single object), wrap in a list or skip.
- For each element in `items`, call a **True-API–specific normalizer** (see below). Do not rely on the old generic key tries for this strategy; the doc response shape is fixed.

### 2.3 Normalizer for True API

- **Input:** One object from `products.product` (fields: `product_id`, `product_title`, `product_main_image_url`, `target_sale_price`, `target_original_price`, `promotion_link`, etc.).
- **Output:** Same discovery schema as today: `title`, `source_url`, `brand`, `image_url`, `price`, `currency`, `delivers_to_uae`, `raw_payload`.
- **Mapping:**
  - `title` ← `product_title` (strip); if missing or empty, skip item. Apply `exclude_keywords_in_title(title)` as today.
  - `source_url` ← `promotion_link` if present and non-empty, else `https://www.aliexpress.com/item/{product_id}.html`.
  - `image_url` ← `product_main_image_url`.
  - `price` ← parse `target_sale_price` with existing `_price_to_float()`.
  - `currency` ← `"USD"` (we send `target_currency=USD`).
  - `delivers_to_uae` ← `True` (we request `ship_to_country=AE`).
  - `raw_payload` ← e.g. `product_id`, `target_original_price`, `discount`, `commission_rate`, `lastest_volume` for debugging/display.
- **ASP filter:** Call `filter_by_max_asp(price, "USD", max_aed)`; exclude item if over limit.
- **Deduplication:** By `source_url` (or `product_id`) across queries, as today.

### 2.4 Unchanged behavior

- Query source: `get_queries(max_queries=5)` (static, trending, reddit, tokinsight).
- Delay between requests (e.g. 0.5s).
- Strategy id `aliexpress_trending_uae`, name/description updated to mention “Aliexpress True API” and “hot products”.
- Return list of discovery items; no change to run contract.

### 2.5 Remove or keep generic fallback

- **Recommendation:** Remove the old generic response parsing (multiple root keys and generic `_normalize_item` for this strategy). Use only the True API response shape and the new normalizer. If a different host is set in the future, we can add a small branch (e.g. by host or a response key) and a second parser later.

---

## 3. Documentation and changelog

- **[discovery-api/README.md](discovery-api/README.md)**  
  - Set `RAPIDAPI_ALIEXPRESS_HOST` example to `aliexpress-true-api.p.rapidapi.com`.  
  - State that the AliExpress strategy uses **Aliexpress True API v2.1.0**, endpoint **/hot-products** (trending, high-commission products), with UAE targeting (`ship_to_country=AE`).  
  - Document optional `DISCOVERY_ALIEXPRESS_SHIP_COUNTRY` and `DISCOVERY_ALIEXPRESS_LANGUAGE` if added.

- **Changelog (project root)**  
  - Under `[Unreleased]`: e.g. “AliExpress discovery: switch to Aliexpress True API; use /hot-products endpoint; UAE targeting; configurable ship country and language.”

- **[ARCHITECTURE.md](ARCHITECTURE.md)**  
  - If it names the AliExpress provider, update to “Aliexpress True API (RapidAPI, /hot-products)”.

---

## 4. Summary

| Area | Action |
|------|--------|
| **API** | Aliexpress True API v2.1.0; host `aliexpress-true-api.p.rapidapi.com`; path `/api/v3/hot-products`. |
| **Params** | `keywords`, `page_no`, `page_size`, `target_currency=USD`, `target_language`, `ship_to_country=AE`, `sort=LAST_VOLUME_DESC`; optional `max_sale_price`. |
| **Response** | `products.product` array; normalizer maps `product_title`, `promotion_link`, `product_main_image_url`, `target_sale_price` to discovery schema. |
| **Config** | Default host for True API; optional ship country and language. |
| **Strategy** | Single parser for True API; no generic fallback for this strategy. |
| **Docs** | README, CHANGELOG, ARCHITECTURE updated. |

No new services or ports; only discovery-api strategy, config, and docs change.
