# Copilot instructions — Kakeklar

Guidance for AI agents (and humans) working in this repo. The **Hard-won lessons** section near the
bottom is the important part: it lists the things that cost the most time during the first build so
the next change ships smoothly.

## What this is

A Norwegian kids' birthday party (*barnebursdag*) purchase planner. A **3-step mobile wizard**
(`src/components/Wizard.tsx`) — age/guests/adults (with a note that restrictions come next) →
allergies and food restrictions → food choices —
produces an age-aware shopping list (food, drink, tableware, decorations) + a printable checklist. The slider screen
(`Controls.tsx`) is the **advanced mode** (reached via "Hopp over"); after the wizard the app **leads
with the result** (Handleliste). Mobile-first, no login, Norwegian (Bokmål) UI, with a shared footer on
every page (including the wizard) saying "Kakeklar er gratis…" plus crediting Maxim Salnikov and linking to LinkedIn + GitHub.

- **Server:** Node.js + Express 4 (ESM), `server/index.js` — serves the built SPA + `/api/health` + a Kassal.app price proxy.
- **Client:** Vite + React 18 + TypeScript in `src/`. Wizard-first (`Wizard.tsx`) + advanced `Controls.tsx`. All party math runs client-side (`src/lib/engine.ts`).
- **Data, not code:** the goods catalog (`src/lib/catalog.ts`) is generic data; the engine evaluates each item's `mode`. Users edit it live (`ConfigEditor.tsx`), persisted in `localStorage`.
- **Ship:** multi-stage `Dockerfile` → GHCR (public) → Azure Container Apps via `.github/workflows/deploy.yml`.

Full docs in [`/docs`](../docs/README.md).

## Conventions

- **UI text is Norwegian Bokmål.** Keep new strings in nb. Numbers via `Intl.NumberFormat('nb-NO')` (`src/lib/format.ts`).
- **Mobile-first.** Big touch targets (≥40px), sticky bottom action bar, hand-written CSS in `src/styles.css` — a **tokenised design system** (CSS custom properties in `:root`): a warm-paper canvas with a single **berry** accent (`--berry #D7264A`), **not** a pink/candy kids theme. Display type is **Bricolage Grotesque**, body is **Hanken Grotesk**, both **self-hosted via `@fontsource-variable/*`** (devDependencies, imported in `main.tsx`) with tabular figures on quantities/prices. The result view's "✨ Veiviser" button is intentionally larger, and the summary guest/age values are inline `.inline-num` number inputs (`inputMode="numeric"`) that recompute immediately. `:focus-visible` and `prefers-reduced-motion` are wired up — keep them. Anything that must not print gets the `no-print` class; verify `@media print`.
- **Brand & signature.** The signature is a **festfane garland** (`Garland.tsx`) — decorative only, `aria-hidden`, rendered in the hero and wizard header; never attach state or test hooks to it. Keep the palette consistent across brand assets: `index.html` `theme-color`, `manifest.webmanifest`, `public/icon.svg` and `public/og-image.svg` all use `#D7264A`. After editing an SVG, regenerate the committed PNG/ICO/OG with `npm i sharp png-to-ico --no-save && npm run icons` (sharp stays out of `package.json`).
- **Keep the server stateless.** No DB. State = URL query (`?gjester=…&alder=…&brod=70`) + optional custom catalog in `localStorage`.
- **Catalog changes:** bump `CATALOG_VERSION` in `catalog.ts` if you change the default catalog's shape or content (it invalidates stale saved copies). Add new item fields to `ConfigEditor.tsx` so they stay editable. Default `kassalSearch` terms are validated against Kassal.app so **Sjekk pris** returns the right popular Norwegian product; omit `kassalSearch` when there is no useful grocery match.
- **Two entry modes, one config:** the wizard (`Wizard.tsx`, default) and advanced (`Controls.tsx`) both write the same `PartyConfig` — which now includes `adults`, `mainDish`, and `breadRatio` (0–100 percent lompe). Keep them in sync. Catalog items are gated by `showIf` (`mainDish` only), `breadKind` splits lomper/pølsebrød, and `audience: 'all'|'kids'` decides whether accompanying adults are counted. Iskake is an enabled, home-only mat item; Pinata is a catalog item with `enabled: false` (no `showIf`), enabled in **Tilpass varelisten**; `PartyConfig.pinata` and `pinata=1` are gone. Keep `CATALOG_VERSION` at **7** for this catalog shape/content.
- **Bread-ratio styling:** the wizard's "Brød: lompe og pølsebrød" inline range input uses a solid track background. Do not add a static value-split gradient there; the `--pct` fill variable is only set by the shared `Slider` component.
- **Wizard footer placement:** the shared `Footer` renders on the wizard too, inside `.wizard` above the fixed bottom nav so it stays visible on first load.
- **E2E is a release gate.** Keep the Playwright specs in `e2e/` green and add tests for new flows — `build-and-deploy` `needs: e2e`, so a red suite blocks the deploy. Run locally with `npm run build && npm run test:e2e`. Stable selectors use `data-testid` (wizard steps, `bread-ratio`) + `.row-name` for result items; inline summary inputs use labels "Antall gjester" and "Barnets alder". There is no `toggle-pinata` test.
- **Secrets stay server-side / in platform secrets.** Never log secret values; never commit `.env`.

## Known-good commands

```bash
npm install
npm run dev          # Vite :5173 + API :8080
npm run build        # client → dist/
npm run start:local  # serve dist/ + API with .env on :8080
npm run build && npm run test:e2e   # Playwright e2e gate (desktop + Pixel 5 mobile)
docker build -t barnebursdag:test .
```

CI/CD is push-to-`main` (docs-only pushes are skipped via `paths-ignore`).

---

## Hard-won lessons (read before building or deploying)

These are the exact things that ate time the first round. Follow them and the next pass is smooth.

### 1. Create directories before creating files
The file-creation tooling **does not create parent directories** ("Parent directory does not exist").
When scaffolding, `mkdir` the folders first (`server/`, `src/lib/`, `src/components/`, `public/`,
`scripts/`, `.github/workflows/`) before writing files into them.

### 2. Keep `sharp` out of Docker — pre-generate icons locally
PWA PNG icons are generated from `public/icon.svg` by `scripts/gen-icons.mjs` (uses `sharp`) and the
PNGs are **committed**. `sharp` is intentionally **not** in `package.json`, so the `node:22-alpine`
build never compiles native modules. To regenerate: `npm i sharp --no-save && npm run icons`. Don't
add `sharp` (or other native deps) to `dependencies`/`devDependencies` just for a build-time asset.

### 3. You usually can't push to GHCR from the local machine
The local `gh`/Git token typically lacks the `write:packages` scope (it had `gist, read:org, repo,
workflow` only). So **build & push the image in GitHub Actions**, where `GITHUB_TOKEN` has
`packages: write`. Don't waste time trying `docker push ghcr.io/...` locally or `gh auth refresh`
(interactive, won't work headless).

### 4. Make the GHCR package public so ACA can pull anonymously
Azure Container Apps pulls the image on cold start / node moves. If the package is private with only an
ephemeral token, those pulls eventually fail. The workflow handles this with a **three-part safety net**:
1. best-effort `gh api PATCH /user/packages/container/<name>/visibility -f visibility=public`,
2. passes GHCR pull credentials to ACA at deploy (works during the run regardless), and
3. `--min-replicas 1` so it stays warm.
The PATCH worked here (the package is public). If it ever doesn't, set the package public once in
GitHub → Packages settings.

### 5. Pre-provision the Azure environment and wait for it
`az containerapp env create` takes **several minutes** (it provisions a Log Analytics workspace) and
needs `Microsoft.OperationalInsights` + `Microsoft.App` registered. Create the resource group + env
**before** the first push and wait for `provisioningState: Succeeded`, so the workflow's deploy step
(which references the env by name) doesn't race ahead and fail. The deploy step itself is idempotent
(`az containerapp show` → create-or-update).

### 6. Node `--env-file` throws if the file is missing — split the scripts
Local dev/run uses Node 22's native `--env-file=.env` (no `dotenv` dependency). But the container has
**no** `.env`. So:
- `start` = `node server/index.js` (no `--env-file`) → used by Docker/ACA (env comes from the platform).
- `start:local` / `dev:server` = `node --env-file=.env …` → local only.
Don't put `--env-file=.env` in the script Docker runs, or the container crashes on boot.

### 7. Express is pinned to v4 for the SPA fallback
`app.get('*', …)` (SPA catch-all) uses Express 4 path syntax. **Do not** upgrade to Express 5 without
rewriting that route — v5 changed wildcard matching.

### 8. The Vite build does not type-check
`npm run build` (esbuild) transpiles only; TypeScript errors **won't** fail the build. Bugs surface at
runtime, not build time. Keep types correct; run `tsc --noEmit` yourself if you want a strict gate.

### 9. Kassal.app contract — and keep the key server-side
`GET https://kassal.app/api/v1/products?search=<term>&size=<n>` with `Authorization: Bearer <40-char key>`.
The browser must call our proxy `/api/kassal/products`; the key is read from `process.env.KASSAL_API_KEY`
in `server/index.js` and never sent to the client. The app degrades gracefully without a key (503 on the
proxy, price button shows a message).

### 10. PowerShell / Windows specifics
- Use **`curl.exe`** (not the `curl` alias, which is `Invoke-WebRequest`).
- Read `.env` without echoing values; pipe the service-principal JSON straight into `gh secret set …` (don't print it).
- Create dirs with `New-Item -ItemType Directory -Force`.

### 11. GitHub identity
The account is **`webmaxru`** (the request said "webmax", which doesn't exist). Two accounts may be
logged into `gh` (`webmaxru` active + another) — always target the repo explicitly with
`-R webmaxru/barnebursdag-planlegger` for `gh` package/secret/run commands.

### 12. ACA env vars vs. secrets
The Kassal key is an ACA **secret** (`kassal-api-key`) referenced by the env var as
`KASSAL_API_KEY=secretref:kassal-api-key`. Update the secret with `az containerapp secret set` and the
env var with `--set-env-vars` / `--env-vars`. Ingress target port is **8080** (matches `PORT`).

### 13. GHCR is public → do NOT store registry creds on the Container App
The image is a **public** GHCR package, so ACA should pull it **anonymously**. Do not configure
`--registry-server/--registry-username/--registry-password` on the app: those store an **ephemeral
`GITHUB_TOKEN`** that expires, and once a registry credential is present ACA stops pulling anonymously —
so the next cold start / new revision fails with `Pending:ImagePullBackOff`. If you ever see that:
`az containerapp registry remove -n barnebursdag -g rg-barnebursdag --server ghcr.io` (no `--yes` flag —
it's not supported), then force a fresh revision (`az containerapp update --image …:latest
--revision-suffix x`). The workflow deliberately does **not** set registry creds.

Also: issuing several `az containerapp` writes back-to-back can hit
`ConflictingConcurrentWriteNotAllowed` — the deploy serialises (secret set → sleep → retry update).

### 14. Analytics is cookieless on purpose (no consent banner)
Application Insights is configured cookieless (`disableCookiesUsage`, no session-storage buffer, no
persistent id) so **no cookie banner is legally required** (EU ePrivacy / ekomloven §3-15). The
connection string is delivered at runtime via `GET /api/config` (ACA secret
`appinsights-connection-string`), never bundled, and the SDK is lazy-loaded as a separate chunk. With
no connection string the app disables analytics gracefully. See `docs/analytics.md`.

---

## Where things live

| Need | File |
|------|------|
| Calculation logic / modes | `src/lib/engine.ts` |
| Default goods + version | `src/lib/catalog.ts` |
| Editable catalog UI | `src/components/ConfigEditor.tsx` |
| Wizard (3-step onboarding) | `src/components/Wizard.tsx` |
| Shared footer | `src/components/Footer.tsx` |
| Design system + tokens + print/reduced-motion | `src/styles.css` |
| Festfane signature garland (decorative) | `src/components/Garland.tsx` |
| Advanced mode (sliders, food/adults choices) | `src/components/Controls.tsx`, `Slider.tsx` |
| Result list + checklist + price lookup | `src/components/Results.tsx` |
| URL state + localStorage + import/export | `src/lib/store.ts` |
| Server (static + health + Kassal proxy) | `server/index.js` |
| CI/CD (e2e gate → build → deploy) | `.github/workflows/deploy.yml` |
| E2E tests | `e2e/`, `playwright.config.ts` |
| Engagement workbook (IaC) | `infra/` |
| Docs | `docs/` |
