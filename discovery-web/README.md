# Discovery Web

React + Vite dashboard for the product discovery pipeline: view and filter discovered products, trigger runs.

## Setup

```bash
cd discovery-web
npm install
```

## Run

```bash
npm run dev
```

Open http://127.0.0.1:5175. Start **discovery-api** first (port 8004) so the dev proxy can reach it.

## Environment

**How to set variables:** Create a `.env` file in the `discovery-web/` directory. Add one line per variable, e.g.:

```bash
VITE_DISCOVERY_API_URL=https://discovery-api.example.com
VITE_PROXY_TARGET=http://127.0.0.1:8004
```

Restart the dev server after changing `.env`. For production or when the API is on another host, set `VITE_DISCOVERY_API_URL` to the full discovery-api base URL at **build time**.

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DISCOVERY_API_URL` | (unset) | When unset, the app uses relative `/api` (proxied by Vite to discovery-api in dev). |
| `VITE_PROXY_TARGET` | `http://127.0.0.1:8004` | Proxy target in dev (server-side only). |

## Docker

When running in Docker, set `VITE_PROXY_TARGET=http://discovery-api:8004` so the dev server proxies `/api` to the discovery-api service. The browser still uses `/api` (same origin).
