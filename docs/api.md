# API reference

Production endpoints are Azure Static Web Apps managed Node.js Functions under `api/`. Local
development and Playwright use `server/index.js`, which adapts the same framework-neutral handlers to
Express.

All routes are anonymous and stateless.

## `GET /api/health`

Returns integration status and a current timestamp.

```json
{
  "status": "ok",
  "kassal": true,
  "analytics": false,
  "menyCart": true,
  "time": "2026-08-21T12:00:00.000Z"
}
```

This endpoint is useful for smoke checks but is no longer an Azure Container Apps liveness probe.

## `GET /api/config`

Returns runtime client configuration with `Cache-Control: no-store`.

```json
{
  "appInsights": { "connectionString": "InstrumentationKey=…" },
  "features": { "menyCart": true }
}
```

`appInsights` is `null` when analytics is not configured. Values come from encrypted Static Web Apps
environment variables, so flags and analytics settings can change without rebuilding the frontend.

## `GET /api/kassal/products`

Server-side proxy to Kassal.app. `KASSAL_API_KEY` is read only by the managed API and is never included
in the browser bundle.

| Query | Required | Rules |
|-------|----------|-------|
| `search` | yes | Trimmed and capped at 100 characters. |
| `size` | no | Integer clamped to 1–20; default 5. |

Example response:

```json
{
  "search": "pølser",
  "count": 1,
  "products": [
    {
      "id": 14441,
      "name": "Grillpølser",
      "brand": "Prior",
      "store": "SPAR",
      "price": 56.9,
      "unitPrice": 94.83,
      "image": "https://…",
      "url": "https://…",
      "weight": 600,
      "weightUnit": "g"
    }
  ]
}
```

Successful results use `Cache-Control: public, max-age=3600`.

| Status | Meaning |
|--------|---------|
| `400` | Missing search term. |
| `503` | `KASSAL_API_KEY` is not configured. |
| `502` | Kassal.app was unreachable or exceeded the 15-second upstream timeout. |
| upstream status | Kassal.app returned a non-success status. |

## `POST /api/meny/cart`

Resolves shopping-list entries to real MENY products. The browser then creates the shared cart
directly from the user's IP; the managed API never performs that rate-limited create call.

Request:

```json
{
  "items": [
    { "query": "grillpølse", "quantity": 3, "name": "Pølser" },
    { "query": "lomper", "quantity": 3, "name": "Lomper" }
  ]
}
```

- `query` is trimmed and capped at 100 characters.
- `name` is capped at 80 characters.
- `quantity` is clamped to 1–50.
- At most 40 entries are accepted.

Response:

```json
{
  "cartItems": [
    {
      "ean": "7039610025205",
      "quantity": 3,
      "product": { "title": "Grillpølser", "ean": "7039610025205" },
      "pricePerUnit": 56.9,
      "linePrice": 170.7,
      "comparePricePerUnit": null
    }
  ],
  "count": 1,
  "matched": [
    {
      "name": "Pølser",
      "query": "grillpølse",
      "ean": "7039610025205",
      "title": "Grillpølser",
      "subtitle": "600g",
      "brand": "Prior",
      "price": 56.9,
      "quantity": 3
    }
  ],
  "unmatched": [],
  "partial": false
}
```

The full upstream `product` object is retained in each cart item because MENY's shared-cart page reads
fields from it.

The resolver uses three concurrent workers, bounded retries, and a **30-second global deadline**. This
keeps it below Static Web Apps' 45-second API limit. If some products matched before the deadline, the
endpoint returns them with `partial: true`; the UI tells the user the cart is incomplete.

| Status | Meaning |
|--------|---------|
| `400` | No usable items. |
| `422` | All searches completed but none matched. |
| `504` | The deadline expired before any product matched. |
| `502` | An unexpected resolver/upstream failure occurred. |

Successful responses use `Cache-Control: no-store`.

## Static hosting and SPA fallback

`public/staticwebapp.config.json` is copied to `dist/` and configures:

- navigation fallback to `/index.html` for client-rendered content pages;
- exclusions for `/api`, Vite assets, and static files;
- `Cache-Control: no-cache` for `/sw.js`;
- basic security headers;
- the managed Functions runtime `node:22`.
