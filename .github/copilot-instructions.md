# Copilot instructions — Kakeklar

Guidance for AI agents (and humans) working in this repo. The **Hard-won lessons** section near the
bottom is the important part: it lists the things that cost the most time during the first build so
the next change ships smoothly.

## What this is

A Norwegian kids' birthday party (*barnebursdag*) purchase planner. Two sliders (guests + child's age)
→ an age-aware shopping list (food, drink, tableware, decorations) + a printable checklist. Mobile-first,
no login, Norwegian (Bokmål) UI.

- **Server:** Node.js + Express 4 (ESM), `server/index.js` — serves the built SPA + `/api/health` + a Kassal.app price proxy.
- **Client:** Vite + React 18 + TypeScript in `src/`. All party math runs client-side (`src/lib/engine.ts`).
- **Data, not code:** the goods catalog (`src/lib/catalog.ts`) is generic data; the engine evaluates each item's `mode`. Users edit it live (`ConfigEditor.tsx`), persisted in `localStorage`.
- **Ship:** multi-stage `Dockerfile` → GHCR (public) → Azure Container Apps via `.github/workflows/deploy.yml`.

Full docs in [`/docs`](../docs/README.md).

## Conventions

- **UI text is Norwegian Bokmål.** Keep new strings in nb. Numbers via `Intl.NumberFormat('nb-NO')` (`src/lib/format.ts`).
- **Mobile-first.** Big touch targets (≥40px), sticky bottom action bar, hand-written CSS in `src/styles.css` (no UI framework). Anything that must not print gets the `no-print` class; verify `@media print`.
- **Keep the server stateless.** No DB. State = URL query (`?gjester=…&alder=…`) + optional custom catalog in `localStorage`.
- **Catalog changes:** bump `CATALOG_VERSION` in `catalog.ts` if you change the default catalog's shape (it invalidates stale saved copies). Add new item fields to `ConfigEditor.tsx` so they stay editable.
- **Secrets stay server-side / in platform secrets.** Never log secret values; never commit `.env`.

## Known-good commands

```bash
npm install
npm run dev          # Vite :5173 + API :8080
npm run build        # client → dist/
npm run start:local  # serve dist/ + API with .env on :8080
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

---

## Where things live

| Need | File |
|------|------|
| Calculation logic / modes | `src/lib/engine.ts` |
| Default goods + version | `src/lib/catalog.ts` |
| Editable catalog UI | `src/components/ConfigEditor.tsx` |
| Sliders / toggles | `src/components/Controls.tsx`, `Slider.tsx` |
| Result list + checklist + price lookup | `src/components/Results.tsx` |
| URL state + localStorage + import/export | `src/lib/store.ts` |
| Server (static + health + Kassal proxy) | `server/index.js` |
| CI/CD | `.github/workflows/deploy.yml` |
| Docs | `docs/` |
