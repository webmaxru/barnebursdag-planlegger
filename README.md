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

## 🧱 Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React + TypeScript (mobile-first) |
| Backend | Node.js + Express (serves the SPA + `/api`) |
| Prices | Kassal.app API via server-side proxy (`/api/kassal/products`) |
| Container | Multi-stage Dockerfile → **GHCR** (public) |
| Hosting | **Azure Container Apps** (CI/CD via GitHub Actions) |

## 🚀 Quick start (local)

```bash
npm install
cp .env.example .env        # add your KASSAL_API_KEY (optional)
npm run dev                 # Vite (5173) + API server (8080) with hot reload
```

Open http://localhost:5173. The app works without a Kassal key — only live price lookups are disabled.

### Production build & run

```bash
npm run build               # builds the client into dist/
npm run start:local         # serves dist/ + API on http://localhost:8080 (reads .env)
```

### Regenerate PWA icons (optional, dev only)

```bash
npm i sharp --no-save && npm run icons   # rasterizes public/icon.svg → PNGs
```

## 🐳 Docker

```bash
docker build -t barnebursdag:latest .
docker run -p 8080:8080 -e KASSAL_API_KEY=xxxx barnebursdag:latest
```

## ☁️ Deployment (Azure Container Apps + GHCR)

Pushing to `main` runs `.github/workflows/deploy.yml`, which:

1. Builds the image and pushes it to `ghcr.io/<owner>/barnebursdag-planlegger` (public).
2. Logs in to Azure and creates/updates the Container App from that image.

**Required repository secrets:**

| Secret | What |
|--------|------|
| `AZURE_CREDENTIALS` | Service-principal JSON (`az ad sp create-for-rbac --sdk-auth`). |
| `KASSAL_API_KEY` | Your Kassal.app API key (stored as an ACA secret). |

Azure resources (created once): resource group `rg-barnebursdag`, Container Apps env `cae-barnebursdag`,
app `barnebursdag` (ingress on port **8080**).

## 🔌 API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health probe — `{ status, kassal, time }`. |
| `GET /api/kassal/products?search=pølser&size=5` | Proxied Kassal.app price lookup (key stays server-side). |

## ⚙️ Configuring the goods list

Tap **Tilpass** in the app to edit the catalog: per-age quantities, calculation mode
(`perChild` / `perGuest` / `perTable` / `ageCount` / `fixed`), pack size, price range, Kassal search
term and allergy tags. Changes are saved in `localStorage`; export/import as JSON to share or back up.
Defaults live in [`src/lib/catalog.ts`](src/lib/catalog.ts).

## 📁 Structure

```
server/index.js          Express server (static + /api proxy + health)
index.html               SPA entry (meta, OG, JSON-LD, PWA)
src/lib/                 types · catalog (default goods) · engine · checklist · store · kassal · format
src/components/          Slider · Controls · Results · ConfigEditor
public/                  manifest, service worker, icons
Dockerfile               multi-stage build → Node runtime
.github/workflows/       build → GHCR → Azure Container Apps
```

---

Laget for norske foreldre. Mengdene er anbefalinger – juster fritt. 🇳🇴
