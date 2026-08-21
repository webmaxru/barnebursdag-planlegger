# Development

## Prerequisites

- **Node.js 22** (the managed API runtime used in production).
- npm.
- Chromium for end-to-end tests (`npx playwright install chromium`).
- Optional: Docker for the compatibility image; Azure CLI and GitHub CLI for deployment setup.

## Install

```bash
npm install
cp .env.example .env
```

The application works without optional service credentials. Price lookup and analytics disable
themselves, and the MENY action is hidden unless enabled.

## Run in development

```bash
npm run dev
```

This starts:

- `dev:server` — the Express adapter on `:8080`, watching shared API code and loading `.env`;
- `dev:client` — Vite on `:5173`, proxying `/api` to `:8080`.

Open `http://localhost:5173`.

## Production build and local preview

```bash
npm run build
npm run start:local
```

Vite writes the production site to `dist/`. `start:local` serves that output with the same shared API
handlers used by the managed Functions. Production itself deploys `dist/` and `api/` to Azure Static
Web Apps; Express is not in the production request path.

## Scripts

| Script | Does |
|--------|------|
| `npm run dev` | Express adapter + Vite client |
| `npm run dev:client` | Vite only (`:5173`) |
| `npm run dev:server` | Express only (`:8080`), watch + `.env` |
| `npm run build` | Vite production build → `dist/` |
| `npm run test:api` | Node unit tests for shared API behavior |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run test:e2e` | Playwright desktop + Pixel 5 suite |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm start` | Express adapter without loading `.env` |
| `npm run start:local` | Express adapter with `.env` |
| `npm run icons` | Regenerate committed PWA/social assets |

## Release-gate tests

```bash
npm run test:api
npm run typecheck
npm run build
npm run test:e2e
```

Playwright's `webServer` starts `node server/index.js` on `:8080` against the prebuilt `dist/`. Because
Express imports `api/shared/handlers.cjs`, browser tests exercise the same request validation,
responses, and upstream adapters deployed to managed Functions.

The MENY tests mock both `/api/meny/cart` and the browser-side shared-cart endpoint. No live MENY
network call is made in the release gate.

## Environment variables

| Variable | Used by | Notes |
|----------|---------|-------|
| `KASSAL_API_KEY` | managed API + local adapter | Optional Kassal.app credential. |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | managed API + local adapter | Runtime config for cookieless browser analytics. |
| `FEATURE_MENY_CART` | managed API + local adapter | `1`/`true` enables the MENY action. |
| `MENY_CHAIN_ID` | managed API + local adapter | Optional; defaults to `1300`. |
| `MENY_STORE_GLN` | managed API + local adapter | Optional; defaults to `7080001150488`. |
| `PORT` | local adapter | Defaults to `8080`. |

`.env` and `api/local.settings.json` are git-ignored. Production values are encrypted Static Web Apps
environment variables and are available only to the managed API.

## Ports

| Port | What |
|------|------|
| 5173 | Vite development client |
| 8080 | Express development/E2E adapter |

## Regenerating PWA icons

The PNG/ICO/OG images in `public/` are generated from `public/icon.svg` and
`public/og-image.svg`, then committed:

```bash
npm i sharp png-to-ico --no-save
npm run icons
```

`sharp` and `png-to-ico` must not be added to the project dependencies.

## Build notes

- Vite transpiles TypeScript but does not type-check it; CI runs `npm run typecheck` separately.
- `public/staticwebapp.config.json` is copied into `dist/`; CI verifies the file before upload.
- The self-hosted Bricolage Grotesque and Hanken Grotesk fonts are emitted under `dist/assets/`.
- Application Insights remains a lazy-loaded client chunk and is not downloaded when runtime config
  disables analytics.
