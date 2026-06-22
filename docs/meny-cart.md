# Handle på MENY — shareable meny.no cart (experimental)

A button next to **✨ Veiviser** on the result view turns the computed shopping list into a real,
shareable **[meny.no](https://meny.no)** shopping cart. The user gets a
`https://meny.no/delt-handlevogn/<id>` link they can open or send to a co-parent, who can then add the
whole cart to their own MENY basket.

> **Status: experimental, behind a feature flag.** Hidden unless `FEATURE_MENY_CART` is enabled (or the
> page is opened with `?meny=1`). Off by default.

## Why this works without a login

meny.no is a **Next.js** front-end over the **NGData** platform (chain `1300` = MENY). The logged-in
"add to *my* cart" endpoint (`PUT /api/client-list-sync/1300/cart`) needs a Trumf token and is **not**
used. Instead we use two endpoints that are reachable **anonymously**, which is all that's needed to
build and share a cart:

| Step | Call |
|------|------|
| Resolve list items → real products + EAN | `GET https://platform-rest-prod.ngdata.no/api/products/1300/<gln>/?search=<term>&page=1&page_size=<n>&fieldset=maximal` |
| Create the shared cart | `POST https://api.sylinder.no/handlevogn/delehandlevogn/v1/api/` &nbsp;body `[{ ean, quantity }]` → `{ id, cart }` |
| Read it back (what the share page does) | `GET https://api.sylinder.no/handlevogn/delehandlevogn/v1/api/<id>` → `{ id, cart }` |

The share link is `https://meny.no/delt-handlevogn/<id>` (MENY's `sharedCartBaseUrl` is
`/delt-handlevogn/`). The page fetches the cart by id client-side and resolves each EAN to a product.

The product search returns rich hits — `ean`, `title`, `subtitle`, `brand`, `pricePerUnit`,
`imagePath` (image = `https://bilder.ngdata.no/<imagePath>/medium.jpg`), and the availability flags
`isForSale` / `isRevoked` / `isOutOfStock`.

## How a list becomes a cart

1. The client (`src/lib/meny.ts → planToMenyItems`) takes every plan line that has a `kassalSearch`
   term (the validated Norwegian grocery term) and computes a quantity: number of **packs** if known,
   otherwise `1` for weight/volume units (`g`, `dl`, …) or `ceil(neededQty)` for countable units,
   clamped to 1–50. Items without `kassalSearch` (e.g. Bursdagskrone) are skipped.
2. It POSTs `{ items: [{ query, quantity, name }] }` to our own server (`POST /api/meny/cart`).
3. The server (`server/meny.js`) searches MENY for each term (concurrency 3, retries with backoff),
   picks the best in-stock hit with an `ean`, **merges duplicate EANs**, and returns full MENY
   **cart items** (`{ ean, quantity, product, pricePerUnit, linePrice, comparePricePerUnit }`) plus
   `matched` / `unmatched` lists. **It does not create the cart.** The full `product` object is required:
   the shared-cart page reads `product.title`/`product.ean`/…, so a `product: null` item makes meny.no
   throw `Cannot read properties of null (reading 'title')`.
4. The **browser** POSTs the `cartItems` straight to `https://api.sylinder.no/handlevogn/delehandlevogn/v1/api/`
   (CORS-open, anonymous) → `{ id }`, and builds `https://meny.no/delt-handlevogn/<id>`.
5. `MenyCart.tsx` shows a modal with the shareable link (copy / open / native share) and the matched
   products with images and prices.

### Why the cart is created in the browser, not on the server

The create endpoint **rate-limits per source IP** (~1 cart/minute — it replies
`429 "Rate limit is exceeded. Try again in N seconds."`). If every user were funnelled through our one
Azure egress IP, the whole feature would throttle after a single cart. Creating the cart from the
browser uses **each user's own IP** — exactly how meny.no's own frontend works — and the endpoint sends
`Access-Control-Allow-Origin: *`, so the cross-origin POST is allowed. Product **search** stays
server-side (one round-trip, parallelised) because that endpoint tolerates server traffic.

`server/meny.js` also exports `buildSharedCart` (resolve **and** create in one server-side call) as a
complete protocol reference, but the production route uses `resolveItems` only.

## Enabling it

| Where | How |
|-------|-----|
| Production (Azure Container Apps) | set env var `FEATURE_MENY_CART=1` (no rebuild) |
| Local | `FEATURE_MENY_CART=1` in `.env`, or just open `http://localhost:8080/?meny=1` |
| Preview/share | append `?meny=1` to any URL |

Optional overrides: `MENY_CHAIN_ID` (default `1300`), `MENY_STORE_GLN` (default `7080001150488`),
`MENY_SHARE_BASE` (default `https://meny.no/delt-handlevogn/`).

## Limitations & caveats

- **Fuzzy matching.** Search terms are tuned for Kassal.app, so a few resolve imperfectly or not at all
  (those land in `unmatched`). The modal is honest about what matched.
- **Quantities are pack-count approximations**, not exact grams/decilitres.
- **Private, undocumented endpoints.** NGData can change these at any time; the feature degrades
  gracefully (clear error, the rest of the app is unaffected) and stays off by default.
- The shared cart is anonymous and public-by-id — don't put anything sensitive in it (it's a grocery
  list).

## Where things live

| Need | File |
|------|------|
| Server mimic (search + create shared cart) | `server/meny.js` |
| Server route | `server/index.js` → `POST /api/meny/cart` |
| Feature flag (server) | `server/index.js` → `/api/config` `features.menyCart` |
| Feature flag (client) | `src/lib/meny.ts → isMenyEnabled` + `src/lib/config.ts` |
| List → search items | `src/lib/meny.ts → planToMenyItems` |
| Button + modal UI | `src/components/MenyCart.tsx`, styles in `src/styles.css` |
| E2E | `e2e/meny-cart.spec.ts` |
