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
   - rebuild with production Vite configuration
   - verify the production bundle contains no `/api/config` reference
   - upload the production `dist/` artifact
2. **`deploy`**
   - downloads the production artifact produced after the test gate
   - deploys `dist/` with `skip_app_build: true`
   - deploys the dependency-free managed Functions in `api/`

The workflow uses these GitHub repository settings:

| Type | Name | Purpose |
|------|------|---------|
| Secret | `AZURE_STATIC_WEB_APPS_API_TOKEN` | Authorizes deployment of the site and managed API. |
| Secret | `APPINSIGHTS_CONNECTION_STRING` | Embedded by Vite for the browser telemetry SDK. |
| Variable | `ANALYTICS_ENABLED` | Explicitly enables/disables analytics at build time. |
| Variable | `FEATURE_MENY_CART` | Enables/disables the MENY UI at build time. |

## Provision the Free resource

The Static Web Apps resource is declared in `infra/static-web-app.bicep`. API secrets are managed
separately so applying the template cannot overwrite a live secret with an empty/default value.

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
| `MENY_CHAIN_ID` | No | Defaults to `1300`. |
| `MENY_STORE_GLN` | No | Defaults to `7080001150488`. |

Copy the deployment token to GitHub without printing it:

```powershell
az staticwebapp secrets list `
  --name kakeklar `
  --resource-group rg-barnebursdag `
  --query properties.apiKey `
  --output tsv |
  gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN -R webmaxru/barnebursdag-planlegger
```

Set build-time frontend configuration:

```powershell
gh secret set APPINSIGHTS_CONNECTION_STRING -R webmaxru/barnebursdag-planlegger
gh variable set ANALYTICS_ENABLED --body 1 -R webmaxru/barnebursdag-planlegger
gh variable set FEATURE_MENY_CART --body 1 -R webmaxru/barnebursdag-planlegger
```

Run the workflow manually once and verify the generated `*.azurestaticapps.net` hostname before
changing public DNS.

## Custom-domain cutover

Keep the browser origin as `https://kakeklar.no`. This preserves saved catalog edits, wizard state,
PWA scope, canonical URLs, and existing shared links.

1. Add and validate `kakeklar.no` on the Static Web App.
2. Verify `/`, all content routes, price lookup, MENY cart creation, analytics, and PWA
   installation on the Azure hostname.
3. Lower DNS TTL before cutover.
4. Point the domain to Static Web Apps and wait for its managed certificate.
5. Re-test on `https://kakeklar.no`.
6. Configure and verify `www.kakeklar.no` as the second custom domain.

`public/sw.js` uses a new cache version for this migration, while the Static Web Apps route explicitly
serves `/sw.js` with `Cache-Control: no-cache`. HTML navigations are network-first so future
build-time configuration changes reach existing PWA clients.

## Retiring the old hosting

The old Container App and Container Apps environment have been deleted. Application Insights and its
linked Log Analytics workspace remain because they provide browser telemetry and dashboards.

## Rollback

If validation fails, redeploy a prior Git commit through the same Static Web Apps workflow.

## Troubleshooting

| Symptom | Cause / fix |
|--------|-------------|
| Deploy action reports an invalid token | Refresh `AZURE_STATIC_WEB_APPS_API_TOKEN` from `az staticwebapp secrets list`. |
| A content URL returns 404 | Confirm `dist/staticwebapp.config.json` exists and contains the `/index.html` navigation fallback. |
| `/api/*` returns 404 | Confirm the workflow uploads `api/` and `apiRuntime` is `node:22`. |
| Applying Bicep changes API settings | It should not: API settings are intentionally outside the template to protect live secrets. |
| Price lookup returns 503 | Add `KASSAL_API_KEY` to the Production environment variables. |
| MENY returns 504 | The resolver exhausted its 30-second budget; retry. Successful partial results are still usable. |
| Feature flag is off | Set repository variable `FEATURE_MENY_CART=1`, then rebuild and deploy. |
| Production build fails | Configure `ANALYTICS_ENABLED`, `FEATURE_MENY_CART`, and the App Insights secret explicitly. |
| Old PWA remains visible | Reload once while online; the new service-worker cache version removes the old shell. |
