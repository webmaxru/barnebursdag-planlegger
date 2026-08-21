# 🎂 Kakeklar

A dead-simple, mobile-first web app that tells Norwegian parents **exactly how much to buy**
for a child's birthday party (*barnebursdag*). Drag **two sliders** — number of guests and the
child's age — and instantly get a complete, age-aware shopping list (food, drinks, tableware,
decorations) plus a printable checklist and timeline. Everything else is optional. No login.

> Built from deep research into Norwegian barnebursdag traditions, portion data
> (Matvaretabellen) and real party-supply pack sizes. Focus ages: kindergarten → early school (3–9).

## ✨ Features

- **Two-slider UX** — guests + age drive everything; "guests = age + 1" suggested by default.
- **Age-aware quantities** — younger kids eat/drink less; quantities scale by age band (3–4 / 5–6 / 7–9).
- **Smart pack rounding** — needs are rounded up to real Norwegian pack sizes (pølser 8-pk, servietter 20-pk …).
- **Home vs. kindergarten mode** — *barnehage* mode follows Helsedirektoratet guidance (less sugar, more fruit/crown).
- **Allergy toggles** — nøttefri, glutenfri, melkefri, uten svin, eggfri, with swap hints.
- **Fully configurable goods list** — edit quantities, pack sizes and prices, add/remove items, import/export JSON. Saved locally.
- **Live prices (optional)** — "Sjekk pris" looks up real Norwegian grocery prices via the [Kassal.app](https://kassal.app) API (server-side proxy).
- **Built to share** — state lives in the URL (`?gjester=14&alder=7`), native Web Share, print/PDF, installable PWA.
- **Norwegian-first, GDPR-clean** — no cookies, no tracking, no account.
- **Refined, accessible UI** — a calm Scandinavian look (self-hosted type, warm-paper + berry palette) rather than a generic kids theme; keyboard-focusable, `prefers-reduced-motion`-aware, and print-friendly.

## 🧱 Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React + TypeScript (mobile-first) |
| Backend | Azure Static Web Apps managed Node.js Functions (`/api`); Express adapter for local development |
| Prices | Kassal.app API via server-side managed Function (`/api/kassal/products`) |
| Hosting | **Azure Static Web Apps Free** (CI/CD via GitHub Actions) |

## 🚀 Quick start (local)

```bash
npm install
cp .env.example .env        # add your KASSAL_API_KEY (optional)
npm run dev                 # Vite (5173) + API server (8080) with hot reload
```

Open http://localhost:5173. The app works without a Kassal key — only live price lookups are disabled.

### Production build and local preview

```bash
npm run build               # builds the client into dist/
npm run start:local         # serves dist/ + API on http://localhost:8080 (reads .env)
```

### Regenerate PWA icons (optional, dev only)

```bash
npm i sharp --no-save && npm run icons   # rasterizes public/icon.svg → PNGs
```

## 🐳 Optional compatibility container

```bash
docker build -t barnebursdag:latest .
docker run -p 8080:8080 -e KASSAL_API_KEY=xxxx barnebursdag:latest
```

The container runs the same shared API handlers as the managed Functions, but it is no longer used by
the production deployment.

## ☁️ Deployment (Azure Static Web Apps Free)

Pushing to `main` runs `.github/workflows/deploy.yml`, which:

1. Runs API unit tests and TypeScript checking.
2. Builds the default Vite client and runs the desktop/mobile Playwright release gate.
3. Rebuilds with production analytics/MENY configuration injected by Vite.
4. Deploys `dist/` plus the managed Functions in `api/` to Azure Static Web Apps.

**Required GitHub repository secret:**

| Secret | What |
|--------|------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token from the `kakeklar` Static Web App. |
| `APPINSIGHTS_CONNECTION_STRING` | Build-time value embedded for the browser telemetry SDK. |

Repository variables `ANALYTICS_ENABLED` and `FEATURE_MENY_CART` control the production frontend
build. `KASSAL_API_KEY` remains a Static Web Apps API environment variable. The Free resource is defined in
[`infra/static-web-app.bicep`](infra/static-web-app.bicep). See [deployment.md](docs/deployment.md) for
provisioning, custom-domain cutover, and rollback instructions.

## 🔌 API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Backend status, Kassal configuration, and timestamp. |
| `GET /api/kassal/products?search=pølser&size=5` | Proxied Kassal.app price lookup (key stays server-side). |
| `POST /api/meny/cart` | Resolve shopping-list items to MENY products. |

## ⚙️ Configuring the goods list

Tap **Tilpass** in the app to edit the catalog: per-age quantities, calculation mode
(`perChild` / `perGuest` / `perTable` / `ageCount` / `fixed`), pack size, price range, Kassal search
term and allergy tags. Changes are saved in `localStorage`; export/import as JSON to share or back up.
Defaults live in [`src/lib/catalog.ts`](src/lib/catalog.ts).

## 📁 Structure

```
api/                     Managed Functions + shared API handlers
server/index.js          Local/E2E adapter (static dist/ + shared /api handlers)
index.html               SPA entry (meta, OG, JSON-LD, PWA)
src/lib/                 types · catalog (default goods) · engine · checklist · store · kassal · format
src/components/          Slider · Controls · Results · ConfigEditor
public/                  manifest, service worker, icons
infra/static-web-app.bicep  Azure Static Web Apps Free resource + API settings
.github/workflows/       test gate → Azure Static Web Apps
```

---

Laget for norske foreldre. Mengdene er anbefalinger – juster fritt. 🇳🇴
