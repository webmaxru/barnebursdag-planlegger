# Azure deployment plan

**Status:** Validated

## Goal

Move Kakeklar's public site and stateless HTTP API from an always-on Azure Container App to Azure
Static Web Apps Free. Preserve the existing browser behavior and `/api` contract while removing the
need to build, publish, and run a production container.

The user approved this target by asking to implement the recommended Static Web Apps architecture on
21 August 2026.

## Workload classification

- **Mode:** Modernize an existing application.
- **Availability:** Personal/public utility; the Free plan's lack of an SLA is accepted.
- **Scale:** Current application size is far below the 250 MB per-environment limit. Expected traffic
  is below the 100 GB monthly Free-plan bandwidth allowance.
- **Budget:** Zero cost for static hosting. Managed HTTP Functions remain within the service's free
  allowance at the expected traffic level.
- **Data:** No database or server-side state. Party state remains in the URL and optional catalog
  customizations remain in browser `localStorage`.
- **Secrets:** `KASSAL_API_KEY` and the Application Insights connection string remain server-side
  environment settings and are never included in the Vite bundle.

## Current architecture

- Vite builds the React application to `dist/`.
- Express 4 serves `dist/`, provides the SPA fallback, and implements four `/api` endpoints.
- A Docker image containing both layers is published to GHCR and deployed to Azure Container Apps.
- The production Container App uses 0.5 vCPU, 1 GiB memory, and `--min-replicas 1`, so it can incur
  compute cost even when only static files are being served.
- GitHub Actions runs the Playwright release gate before building and deploying the container.

## Target architecture

- **Frontend:** Azure Static Web Apps Free serves the Vite `dist/` output globally.
- **Routing:** `staticwebapp.config.json` rewrites client-side content routes to `/index.html` and
  selects the Node.js 22 API runtime.
- **API:** Static Web Apps managed Azure Functions preserve:
  - `GET /api/health`
  - `GET /api/config`
  - `GET /api/kassal/products`
  - `POST /api/meny/cart`
- **Shared implementation:** Framework-neutral API handlers are reused by both the managed Functions
  and the local Express server. Express remains a development/E2E adapter, not a production host.
- **MENY safety:** Product resolution gets a global deadline below Static Web Apps' 45-second request
  limit and returns the matches completed within that budget.
- **CI/CD:** GitHub Actions runs API tests, type checking, the Vite build, and Playwright before
  deploying `dist/` plus `api/` with `Azure/static-web-apps-deploy`.
- **Azure region:** West Europe for the managed API; static files remain globally distributed.
- **Custom domain:** Keep `kakeklar.no` through the DNS cutover to preserve the browser origin,
  localStorage, PWA scope, canonical URLs, and shared links.

## Implementation

1. Add a dependency-free Node.js managed Functions project under `api/`.
2. Extract the current API behavior and MENY resolver into reusable modules under `api/shared/`.
3. Adapt `server/index.js` to those shared handlers so local development and Playwright exercise the
   same code deployed to Azure Functions.
4. Add a bounded MENY resolution deadline and a bounded Kassal upstream request timeout.
5. Add `public/staticwebapp.config.json` and increment the service-worker cache version for cutover.
6. Replace the production container workflow with a Static Web Apps deployment gated by tests.
7. Update repository documentation and agent guidance; retain Docker only as an optional local
   compatibility image.
8. Do not delete Azure Container Apps resources automatically. Retire them only after the Static Web
   Apps custom domain, APIs, analytics, and PWA behavior have been verified in production.

## Configuration

Static Web Apps application settings:

- `KASSAL_API_KEY`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `FEATURE_MENY_CART=1`
- Optional: `MENY_CHAIN_ID`, `MENY_STORE_GLN`

GitHub Actions secret:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`

The existing `AZURE_CREDENTIALS` secret is not required by the new deployment workflow.

## Validation

- [ ] All validation checks pass
  - [x] API unit tests cover validation, secret handling, upstream mapping, and MENY deadlines.
  - [x] TypeScript passes with `tsc --noEmit`.
  - [x] Vite builds successfully and copies `staticwebapp.config.json` into `dist/`.
  - [x] Playwright passes on desktop Chromium and Pixel 5.
  - [x] `infra/static-web-app.bicep` compiles successfully.
  - [x] Azure account, resource-group scope, provider registration, and deployment permissions are
        verified.
  - [x] Azure Resource Manager validation/what-if accepts the Free Static Web App template and plans
        only the two expected resource creations.

## Deployment acceptance

- [ ] Configure production environment variables and `AZURE_STATIC_WEB_APPS_API_TOKEN`.
- [ ] Deploy and verify the generated Azure hostname.
- [ ] Verify deep content routes, `/api/config`, price lookup, MENY cart creation, Application Insights
      events, and PWA update behavior.
- [ ] Cut `kakeklar.no` over while retaining the existing Container App for rollback.

## Rollback

Keep the existing Container App running until the custom-domain cutover is verified. DNS can be
returned to the Container App if Static Web Apps validation fails. Deleting the Container App,
Container Apps environment, Log Analytics resources, or GHCR package is explicitly out of scope for
automatic execution because those are destructive operations.

## Preparation results

- Managed Functions, shared handlers, bounded upstream timeouts, SPA configuration, Free-tier Bicep,
  and the deployment workflow are implemented.
- API unit tests: 6 passed.
- TypeScript check: passed.
- Vite production build: passed; deployment configuration is present in `dist/`.
- Playwright: 45 passed, 1 intentionally skipped across desktop Chromium and Pixel 5.
- Bicep compilation: passed.
- Focused code review: no significant findings.

## 7. Validation proof

| Check | Command / evidence | Result |
|-------|--------------------|--------|
| API behavior | `npm run test:api` | 6 passed |
| Type safety | `npm run typecheck` | Passed |
| Static build | `npm run build` | Passed; `dist/staticwebapp.config.json` present |
| Browser release gate | `npm run test:e2e` | 45 passed, 1 intentionally skipped |
| Deployment JSON | Parsed host, route, and Static Web Apps JSON files with Node.js | 7 files valid |
| Bicep syntax/type validation | `az bicep build --file infra/static-web-app.bicep` | Passed |
| Azure context | `az account show`, `az group show`, `az provider show` | Logged in; resource group succeeded; `Microsoft.Web` registered |
| Deployment permission | Role assignment query at resource-group scope | Owner |
| ARM validation | `az deployment group validate ...` | Passed |
| ARM preflight | `az deployment group what-if ...` | Only the Static Web App and its app settings are created; existing resources are ignored |
| Static RBAC review | Reviewed `infra/static-web-app.bicep` | No role assignments required or declared |
| Change review | Focused code-review agent | No significant findings |
