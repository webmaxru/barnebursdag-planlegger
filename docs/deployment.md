# Deployment

Production runs on **Azure Static Web Apps Free**:

- Vite's `dist/` output is served as globally distributed static content.
- The HTTP endpoints under `api/` run as managed Azure Functions.
- `staticwebapp.config.json` provides the SPA fallback and selects the Node.js 22 API runtime.
- Pushing to `main` deploys automatically after API, type, build, and Playwright checks pass.

The Express server and Dockerfile remain local compatibility tools. They use the same shared API
handlers, but neither is part of the production deployment.

## Free-plan boundaries

The current app fits comfortably within the Free-plan limits: 250 MB per environment, 100 GB monthly
bandwidth, two custom domains, and three preview environments. The plan has no SLA and bandwidth
overage is unavailable, so traffic should be monitored before it approaches the quota.

Managed API requests have a 45-second maximum duration. The MENY resolver therefore has its own
30-second global deadline and can return a partial set of matched products.

## CI/CD — `.github/workflows/deploy.yml`

Trigger: push to `main` (docs/markdown-only changes are ignored) or manual dispatch.

1. **`e2e` release gate**
   - `npm ci`
   - `npm run test:api`
   - `npm run typecheck`
   - `npm run build`
   - verify `dist/staticwebapp.config.json`
   - run Playwright on desktop Chromium and Pixel 5
   - upload the verified `dist/` artifact
2. **`deploy`**
   - downloads the exact artifact tested by the gate
   - deploys `dist/` with `skip_app_build: true`
   - deploys the dependency-free managed Functions in `api/` with `skip_api_build: true`

The workflow needs one GitHub repository secret:

| Secret | Purpose |
|--------|---------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Authorizes `Azure/static-web-apps-deploy` to upload the site and managed API. |

## Provision the Free resource

The resource and managed-API settings are declared in `infra/static-web-app.bicep`.

```powershell
az provider register --namespace Microsoft.Web --wait
az group create --name rg-barnebursdag --location norwayeast
az deployment group create `
  --resource-group rg-barnebursdag `
  --template-file infra/static-web-app.bicep `
  --parameters staticWebAppName=kakeklar location=westeurope
```

`kakeklar` must be globally unique. Override `staticWebAppName` if Azure reports that it is already in
use.

Configure these values under **Static Web App → Environment variables → Production**:

| Setting | Required | Notes |
|---------|----------|-------|
| `KASSAL_API_KEY` | No | Server-side Kassal.app key; price lookup returns 503 when omitted. |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | No | Returned by `/api/config` to the cookieless browser SDK. |
| `FEATURE_MENY_CART` | Yes in production | Set to `1` to show the MENY action. |
| `MENY_CHAIN_ID` | No | Defaults to `1300`. |
| `MENY_STORE_GLN` | No | Defaults to `7080001150488`. |

The Bicep template also accepts the first three values as parameters. They are marked secure, but do
not put their values in a committed parameter file.

Copy the deployment token to GitHub without printing it:

```powershell
az staticwebapp secrets list `
  --name kakeklar `
  --resource-group rg-barnebursdag `
  --query properties.apiKey `
  --output tsv |
  gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN -R webmaxru/barnebursdag-planlegger
```

Run the workflow manually once and verify the generated `*.azurestaticapps.net` hostname before
changing public DNS.

## Custom-domain cutover

Keep the browser origin as `https://kakeklar.no`. This preserves saved catalog edits, wizard state,
PWA scope, canonical URLs, and existing shared links.

1. Add and validate `kakeklar.no` on the Static Web App.
2. Verify `/`, all content routes, `/api/config`, price lookup, MENY cart creation, analytics, and PWA
   installation on the Azure hostname.
3. Lower DNS TTL before cutover.
4. Point the domain to Static Web Apps and wait for its managed certificate.
5. Re-test on `https://kakeklar.no`.
6. Keep the Container App available during the observation window.

`public/sw.js` uses a new cache version for this migration, while the Static Web Apps route explicitly
serves `/sw.js` with `Cache-Control: no-cache`.

## Retiring the old hosting

Only after the custom-domain deployment is stable:

- stop the old Container App or set its minimum replica count to zero;
- remove the obsolete Container Apps environment and Log Analytics workspace only after confirming
  nothing else uses them;
- archive or remove the old GHCR package if it is no longer needed.

These are intentionally manual, destructive steps and are not performed by the deployment workflow.
Application Insights remains independent and can continue receiving cookieless browser telemetry.

## Rollback

If validation fails, point `kakeklar.no` back to the existing Container App. The local Express adapter
and optional Docker image preserve the same `/api` responses, so rollback does not require a client
build.

## Troubleshooting

| Symptom | Cause / fix |
|--------|-------------|
| Deploy action reports an invalid token | Refresh `AZURE_STATIC_WEB_APPS_API_TOKEN` from `az staticwebapp secrets list`. |
| A content URL returns 404 | Confirm `dist/staticwebapp.config.json` exists and contains the `/index.html` navigation fallback. |
| `/api/*` returns 404 | Confirm the workflow uploads `api/`, `skip_api_build` is true, and `apiRuntime` is `node:22`. |
| Price lookup returns 503 | Add `KASSAL_API_KEY` to the Production environment variables. |
| MENY returns 504 | The resolver exhausted its 30-second budget; retry. Successful partial results are still usable. |
| Feature flag is off | Set `FEATURE_MENY_CART=1`; environment variables are runtime settings and require no frontend rebuild. |
| Old PWA remains visible | Reload once while online; the new service-worker cache version removes the old shell. |
