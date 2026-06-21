# API reference

The server (`server/index.js`) exposes two JSON endpoints plus static hosting of the SPA. It is an
Express 4 app, ESM, listening on `PORT` (default `8080`).

## `GET /api/health`

Liveness probe used by Azure Container Apps.

**200 OK**
```json
{ "status": "ok", "kassal": true, "time": "2026-06-20T23:03:48.153Z" }
```
- `kassal` — whether a `KASSAL_API_KEY` is configured (price lookups available).

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

## Static hosting / SPA fallback

```js
app.use(express.static(DIST, { maxAge: '1h', index: false }));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
```
> The `'*'` catch-all relies on **Express 4** path syntax. Do not bump to Express 5 without changing
> this route (Express 5 changed wildcard matching).
