# Copilot instructions — Kakeklar

Guidance for agents and humans working in this repository. Read the **Hard-won lessons** before
changing deployment or API code.

## What this is

Kakeklar is a Norwegian kids' birthday party purchase planner. A **3-step mobile wizard**
(`src/components/Wizard.tsx`) asks for age/guests/adults, allergies/restrictions, and food choices,
then produces an age-aware shopping list and printable checklist. `Controls.tsx` is advanced mode.

- **Client:** Vite + React 18 + TypeScript. All party math runs in `src/lib/engine.ts`.
- **Production API:** dependency-free Node.js 22 managed Functions under `api/`.
- **Shared API core:** `api/shared/handlers.cjs` and `api/shared/meny.cjs`.
- **Local/E2E adapter:** Express 4 in `server/index.js` serves `dist/` and calls the shared handlers.
- **State:** query string plus optional custom catalog in `localStorage`; no database.
- **Hosting:** Azure Static Web Apps Free via `.github/workflows/deploy.yml`.
- **Compatibility:** the Dockerfile still runs the Express adapter, but production does not deploy a
  container.

Full docs live in [`/docs`](../docs/README.md).

## Conventions

- **UI text is Norwegian Bokmål.** Format numbers with `Intl.NumberFormat('nb-NO')`.
- **Mobile-first.** Touch targets are at least 40px. The tokenised CSS in `src/styles.css` uses a
  warm-paper canvas and one berry accent (`--berry #D7264A`), not a pink/candy theme. Display type is
  Bricolage Grotesque and body type is Hanken Grotesk, both self-hosted through Fontsource. Preserve
  `:focus-visible`, `prefers-reduced-motion`, tabular figures, and `no-print` behavior.
- **Brand signature.** `Garland.tsx` is decorative (`aria-hidden`) and must not carry state or test
  hooks. Keep `#D7264A` consistent across HTML metadata, manifest, icon, and OG assets. After editing
  SVGs, run `npm i sharp png-to-ico --no-save && npm run icons`; do not add those native tools to
  `package.json`.
- **Keep the service stateless.** State is URL query
  (`?gjester=…&alder=…&brod=70`) plus optional local catalog data.
- **Catalog changes:** bump `CATALOG_VERSION` only when default catalog shape/content changes. Add new
  fields to `ConfigEditor.tsx`. Keep `CATALOG_VERSION` at **7** for the current catalog.
- **Two entry modes, one config.** Wizard and advanced controls both write `PartyConfig`, including
  `adults`, `mainDish`, and `breadRatio`. `showIf`, `breadKind`, and `audience` drive catalog behavior.
  Iskake is enabled/home-only; Pinata is a disabled-by-default catalog item.
- **Bread ratio styling:** the wizard's inline bread range uses a solid track. Only the shared
  `Slider` sets `--pct`; do not add a static split gradient.
- **Wizard footer:** render the shared footer inside `.wizard`, above the fixed bottom navigation.
- **MENY cart:** hidden unless `FEATURE_MENY_CART` is enabled by `/api/config` or `?meny=1` is present.
  The managed API resolves products; the browser creates the shared cart. Never move cart creation to
  the server.
- **E2E is a release gate.** CI runs API tests, type checking, Vite build, then Playwright on desktop
  Chromium and Pixel 5. MENY tests mock both our resolver route and the meny.no endpoint.
- **Secrets stay in platform settings.** Never log values or commit `.env` /
  `api/local.settings.json`.

## Known-good commands

```bash
npm install
npm run dev
npm run test:api
npm run typecheck
npm run build
npm run test:e2e
docker build -t barnebursdag:test .   # optional compatibility check
```

CI/CD runs on pushes to `main`; docs-only pushes are skipped.

---

## Hard-won lessons

### 1. Create directories before files

Some file tools do not create parent directories. Create `api/`, nested function folders, `public/`,
and workflow directories before adding files when the editing tool requires it.

### 2. Keep native icon tools out of production

PWA PNG/ICO/OG files are generated locally and committed. `sharp` and `png-to-ico` must remain
one-off `--no-save` tools so the Static Web Apps build stays portable.

### 3. Static Web Apps deploys with its own token

The workflow uses `AZURE_STATIC_WEB_APPS_API_TOKEN`, not GHCR permissions or
`AZURE_CREDENTIALS`. Provision the Free resource with `infra/static-web-app.bicep`, copy its
deployment token to the GitHub secret, and configure API environment variables in the Static Web App.

### 4. Keep managed Functions dependency-free

The API uses the Functions `function.json` model and CommonJS modules, so `skip_api_build: true` can
upload it without installing a second dependency tree. Shared business logic belongs in
`api/shared/`; function entry points stay thin.

### 5. Managed API requests have a 45-second ceiling

The MENY resolver's global deadline is 30 seconds. Keep every upstream timeout below the platform
limit and return explicit partial/timeout responses; never restore unbounded per-item retries.

### 6. Local `.env` loading is intentionally split

`start:local` / `dev:server` use Node's `--env-file=.env`; plain `start` does not. Node throws when an
explicit env file is missing, so the optional container must continue receiving settings from its
runtime.

### 7. Express is an adapter, not production hosting

Express 4 preserves the local SPA wildcard and gives Playwright a single-origin server. API behavior
must be implemented in shared handlers first, then adapted by Express and Azure Functions. Do not let
the two paths drift.

### 8. Vite does not type-check

`npm run build` transpiles only. CI therefore runs `npm run typecheck` explicitly before building and
uploading the artifact.

### 9. Kassal.app contract and secret

The browser calls `/api/kassal/products`; only the managed API sends the upstream authorization
credential from `KASSAL_API_KEY`. The upstream request has a 15-second timeout. Missing configuration
returns 503 and leaves the rest of the app usable.

### 10. PowerShell / Windows specifics

- Use `curl.exe`, not the `curl` alias.
- Pipe deployment tokens directly into `gh secret set`; do not print them.
- Create directories with `New-Item -ItemType Directory -Force`.

### 11. GitHub identity

The account/repository is `webmaxru/barnebursdag-planlegger`. Always target it explicitly in `gh`
commands when repository context is ambiguous.

### 12. Runtime settings belong to the managed API

Configure `KASSAL_API_KEY`, `APPLICATIONINSIGHTS_CONNECTION_STRING`, `FEATURE_MENY_CART`, and optional
MENY overrides as Static Web Apps environment variables. They are available to Functions, not the
static Vite bundle.

### 13. Free-plan boundaries affect architecture

Free provides managed Functions, 100 GB monthly bandwidth, 250 MB per environment, two custom domains,
and no SLA. Linking an existing Container App as a same-origin backend requires Standard; do not
reintroduce that dependency into the Free design.

### 14. Analytics stays cookieless

`/api/config` returns the Application Insights connection string at runtime. The browser SDK disables
cookies, persistent identifiers, session storage buffering, and automatic fetch tracking. With no
setting, analytics disables itself.

### 15. MENY shared-cart split is intentional

`api/shared/meny.cjs` resolves catalog entries through anonymous NGData product search, keeping the
full product object in each cart line. The browser then calls `api.sylinder.no` from the user's IP,
because cart creation is rate-limited per source IP. Completed matches can be returned with
`partial: true` when the 30-second resolver deadline is reached.

### 16. Preserve the public origin during cutover

Keep `https://kakeklar.no` as the custom domain so localStorage, shared links, canonical URLs, and PWA
scope survive. The service-worker cache version must change during hosting migrations, and `/sw.js`
must be served with `Cache-Control: no-cache`.

---

## Where things live

| Need | File |
|------|------|
| Calculation logic / modes | `src/lib/engine.ts` |
| Default goods + version | `src/lib/catalog.ts` |
| Editable catalog UI | `src/components/ConfigEditor.tsx` |
| Wizard | `src/components/Wizard.tsx` |
| Shared footer | `src/components/Footer.tsx` |
| Design system / print / reduced motion | `src/styles.css` |
| Festfane garland | `src/components/Garland.tsx` |
| Advanced mode | `src/components/Controls.tsx`, `Slider.tsx` |
| Result list + price lookup | `src/components/Results.tsx` |
| URL/localStorage state | `src/lib/store.ts` |
| Runtime config client | `src/lib/config.ts` |
| WebMCP tools | `src/lib/webmcp.ts`, `src/webmcp.d.ts` |
| Cookieless analytics | `src/lib/analytics.ts` |
| MENY UI/client | `src/components/MenyCart.tsx`, `src/lib/meny.ts` |
| Shared HTTP behavior | `api/shared/handlers.cjs` |
| MENY resolver | `api/shared/meny.cjs` |
| Managed Function routes | `api/config/`, `api/health/`, `api/kassal-products/`, `api/meny-cart/` |
| Local/E2E server | `server/index.js` |
| Static Web Apps config | `public/staticwebapp.config.json` |
| Static Web App IaC | `infra/static-web-app.bicep` |
| CI/CD | `.github/workflows/deploy.yml` |
| E2E tests | `e2e/`, `playwright.config.ts` |
| Docs | `docs/` |
