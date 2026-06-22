# API reference

The server (`server/index.js`) exposes a handful of JSON endpoints plus static hosting of the SPA. It
is an Express 4 app, ESM, listening on `PORT` (default `8080`).

## `GET /api/health`

Liveness probe used by Azure Container Apps.

**200 OK**
```json
{ "status": "ok", "kassal": true, "analytics": false, "menyCart": false, "time": "2026-06-20T23:03:48.153Z" }
```
- `kassal` — whether a `KASSAL_API_KEY` is configured (price lookups available).
- `analytics` — whether an Application Insights connection string is configured.
- `menyCart` — whether the experimental MENY shared-cart feature is enabled (`FEATURE_MENY_CART`).

## `GET /api/config`

Runtime client config (cookieless Application Insights connection string + feature flags). Sent with
`Cache-Control: no-store`.

**200 OK**
```json
{
  "appInsights": { "connectionString": "InstrumentationKey=…" },
  "features": { "menyCart": false }
}
```
`appInsights` is `null` when no connection string is configured. `features.menyCart` mirrors
`FEATURE_MENY_CART`. The client (`src/lib/config.ts`) fetches this once and memoizes it.

## `GET /api/kassal/products`

Server-side proxy to the [Kassal.app](https://kassal.app) product search. The API key is read from
`process.env.KASSAL_API_KEY` and sent as `Authorization: Bearer …` — it never reaches the browser.

**Query params**
| Param | Required | Notes |
|-------|----------|-------|
| `search` | yes | search term, trimmed to ≤ 100 chars |
| `size` | no | results, clamped 1–20 (default 5) |

**200 OK**
```json
{
  "search": "ballonger",
  "count": 1,
  "products": [
    {
      "id": 14441,
      "name": "Ballonger Metallic 10stk Unik",
      "brand": "Unik",
      "store": "SPAR",
      "price": 27.5,
      "unitPrice": 27.5,
      "image": "https://…",
      "url": "https://spar.no/…",
      "weight": 1,
      "weightUnit": "piece"
    }
  ]
}
```
Responses are sent with `Cache-Control: public, max-age=3600`.

**Error responses**
| Status | When |
|--------|------|
| `400` | missing `search` |
| `503` | `KASSAL_API_KEY` not configured (app still works; price button just shows the message) |
| `502` | Kassal.app unreachable |
| `4xx/5xx` | propagated from Kassal (`Kassal svarte <code>.`) |

### Upstream contract (for reference)

```
GET https://kassal.app/api/v1/products?search=<term>&size=<n>
Authorization: Bearer <40-char key>
```
Verified working before the client was written; the key length is 40 characters.

## `POST /api/meny/cart`  (experimental)

Resolves the computed list to real **meny.no** products and returns the cart items. The browser then
creates the shared cart directly against meny.no's anonymous endpoint (see why below). Gated by
`FEATURE_MENY_CART` in the UI, but the route itself is always available (it only proxies meny.no's
anonymous product search — no secrets). See [meny-cart.md](meny-cart.md) for the full protocol.

**Request body**
```json
{
  "items": [
    { "query": "grillpølse", "quantity": 3, "name": "Pølser" },
    { "query": "lomper", "quantity": 3, "name": "Lomper" }
  ]
}
```
- `query` — grocery search term (the catalog's `kassalSearch`), trimmed to ≤ 100 chars.
- `quantity` — clamped 1–50.
- `name` — display label echoed back, ≤ 80 chars.
- The array is capped at 40 items.

**200 OK**
```json
{
  "cartItems": [ { "ean": "7039610025205", "quantity": 3 }, { "ean": "7311041043356", "quantity": 3 } ],
  "count": 2,
  "matched": [
    { "name": "Pølser", "query": "grillpølse", "ean": "7039610025205", "title": "Grillpølser",
      "subtitle": "Kylling/Kalkun 600g Prior", "brand": "Prior", "price": 56.9, "image": "https://…", "quantity": 3 }
  ],
  "unmatched": [ { "name": "Bursdagskrone", "query": "krone" } ]
}
```
The client POSTs `cartItems` to meny.no and builds `https://meny.no/delt-handlevogn/<id>`.

**Error responses**
| Status | When |
|--------|------|
| `400` | no usable items in the body |
| `422` | none of the items matched a MENY product (`{ error, unmatched }`) |
| `502` | meny.no/NGData product search unreachable |

### Upstream contract (for reference)

```
GET  https://platform-rest-prod.ngdata.no/api/products/1300/<gln>/?search=<term>&page=1&page_size=<n>&fieldset=maximal   (server-side)
POST https://api.sylinder.no/handlevogn/delehandlevogn/v1/api/   body: [{ "ean": "…", "quantity": 2 }]  -> { "id": "…" }   (browser-side)
```
Both are anonymous (no Trumf login). `1300` is the MENY chain id; `gln` is a MENY store
(`MENY_STORE_GLN`, default `7080001150488`). The shared link is `https://meny.no/delt-handlevogn/<id>`.
**The create call is made from the browser** because that endpoint rate-limits **per source IP** (~1/min)
— routing every user through one server egress IP would throttle it; the browser uses each user's own IP
(`Access-Control-Allow-Origin: *`, so the cross-origin POST is allowed).

## Static hosting / SPA fallback

```js
app.use(express.static(DIST, { maxAge: '1h', index: false }));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
```
> The `'*'` catch-all relies on **Express 4** path syntax. Do not bump to Express 5 without changing
> this route (Express 5 changed wildcard matching).
