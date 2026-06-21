# Development

## Prerequisites

- **Node.js ≥ 20** (built and tested on **Node 22**). The server uses native `fetch` and `--env-file`, both Node ≥ 20.
- npm (comes with Node).
- Optional for end-to-end tests: Playwright's Chromium browser (`npx playwright install chromium`).
- Optional: Docker, Azure CLI and GitHub CLI for container/deploy work.

## Install

```bash
npm install
cp .env.example .env     # then add KASSAL_API_KEY (optional)
```

## Run in development

```bash
npm run dev
```
This runs **two** processes via `concurrently`:
- `dev:server` — `node --watch --env-file=.env server/index.js` on **:8080**
- `dev:client` — Vite dev server on **:5173** (proxies `/api` → `:8080`)

Open **http://localhost:5173**. The app works without a Kassal key; only the "Sjekk pris" lookups are disabled.

## Production build & run

```bash
npm run build        # Vite builds the client into dist/
npm run start:local  # node --env-file=.env server/index.js  → serves dist/ + API on :8080
```

> `start:local` loads `.env`; the plain `start` script does **not** (it expects env vars from the
> platform, e.g. Azure Container Apps). This split matters because Node's `--env-file` **throws if the
> file is missing**, which would break the container where `.env` is intentionally absent.

## Scripts

| Script | Does |
|--------|------|
| `npm run dev` | server (watch) + Vite client together |
| `npm run dev:client` | Vite only (:5173) |
| `npm run dev:server` | Express only (:8080), watch + `.env` |
| `npm run build` | production client build → `dist/` |
| `npm run test:e2e` | Playwright end-to-end suite |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm start` | `node server/index.js` (no `.env`; used by Docker/ACA) |
| `npm run start:local` | `node --env-file=.env server/index.js` |
| `npm run icons` | regenerate PWA PNG icons from `public/icon.svg` |

## End-to-end tests (Playwright)

Playwright specs live in `e2e/` (`wizard.spec.ts`, `food-choices.spec.ts`,
`allergies-adults.spec.ts`, `basics.spec.ts`) and are configured by `playwright.config.ts`.

Run locally:

```bash
npm run build
npm run test:e2e
```

On the first run, install Chromium with:

```bash
npx playwright install chromium
```

The suite runs against two projects: **desktop chromium** and **mobile (Pixel 5)**. Its
`webServer` starts `node server/index.js` on **:8080** and serves the prebuilt `dist/`, so
build before running the tests. The same suite also runs as a CI gate before deployment; see
[deployment](deployment.md).

Food-choice coverage now exercises the bread ratio slider (`data-testid="bread-ratio"`) with its solid
track background. Pinata is no longer a wizard toggle, so there is no `toggle-pinata` test; it is covered
as a disabled-by-default catalog item enabled through **Tilpass varelisten**. The old `choice-bread-*`
and `choice-treat-*` cards/selectors are no longer part of the wizard flow.

## Environment variables

| Var | Used by | Notes |
|-----|---------|-------|
| `KASSAL_API_KEY` | server | Bearer token for Kassal.app. Optional; app degrades gracefully. |
| `PORT` | server | Listen port (default 8080). |

`.env` is git-ignored and Docker-ignored. `.env.example` documents the keys.

## Ports

| Port | What |
|------|------|
| 5173 | Vite dev client (dev only) |
| 8080 | Express server (dev API target, and prod) |

## Regenerating PWA icons

The PNG icons in `public/` are generated from `public/icon.svg` and **committed**. `sharp` is **not**
a project dependency (so the Docker build never compiles native binaries). To regenerate locally:

```bash
npm i sharp --no-save
npm run icons        # writes icon-192/512/180.png + icon-maskable-512.png
```

## Notes on the build

- `npm run build` uses Vite (esbuild) which **transpiles but does not type-check**. TypeScript errors
  will not fail the build. Use your editor / `tsc --noEmit` if you want strict type checks; keep code
  correct because mistakes surface at runtime, not build time.
- The client bundle is ~166 kB raw / ~54 kB gzip.
