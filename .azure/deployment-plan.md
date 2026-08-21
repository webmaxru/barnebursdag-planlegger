# Azure deployment plan

**Status:** Ready for Validation

## Goal

Replace `GET /api/config` with build-time frontend configuration for Application Insights and the
MENY feature flag. Remove the managed Function route and ensure CI injects the intended production
values into the Vite build.

## Current architecture

- Every browser load calls `GET /api/config`.
- The config Function reads `APPLICATIONINSIGHTS_CONNECTION_STRING` and `FEATURE_MENY_CART` from
  Static Web Apps API environment variables.
- The client memoizes the response, then initializes analytics and resolves the MENY flag.
- The same API settings are echoed by `/api/health`.

## Target architecture

- Vite injects `VITE_ANALYTICS_ENABLED`, `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING`, and
  `VITE_FEATURE_MENY_CART` during the production build.
- Analytics and MENY read `import.meta.env` directly; no runtime config fetch or client config module
  remains.
- `GET /api/config`, its Function folder, handler, and tests are deleted.
- `/api/health` reports only backend state: status, Kassal configuration, and timestamp.
- The production workflow performs a local-default build for E2E, then a second production build with
  build-time configuration before uploading the artifact.
- The Application Insights connection string stays in a GitHub Actions secret. Although a browser
  telemetry connection string is intentionally public in the built JavaScript, it is not committed to
  source control.
- The MENY flag stays in a GitHub Actions repository variable so changing it requires a rebuild and
  deployment.

## Implementation

1. Remove `src/lib/config.ts` and the `/api/config` Function.
2. Read build-time variables in `analytics.ts` and `meny.ts`; make MENY enablement synchronous.
3. Remove frontend mount-time config fetching from `App.tsx`.
4. Remove runtime config/flag logic from shared API handlers and health.
5. Inject production variables in `.github/workflows/deploy.yml` after E2E.
6. Remove obsolete Static Web Apps API settings from Bicep and environment documentation.
7. Update API, architecture, analytics, development, deployment, MENY, README, and agent guidance.
8. After validation, deploy and remove obsolete live API settings.

## Validation

- [ ] All validation checks pass
  - [x] API unit tests pass with the reduced health contract.
  - [x] TypeScript passes.
  - [x] The default build keeps analytics/MENY disabled.
  - [x] `/api/config` returns JSON 404 in desktop and mobile E2E.
  - [x] Enabled and disabled production builds pass environment validation, artifact inspection, and
        browser smoke tests.
  - [x] Full browser behavior passed; one overloaded parallel run timed out once and passed when
        isolated.
  - [x] Bicep compilation, ARM validation, and what-if pass with no resource changes.
  - [x] Two focused reviews completed; all findings were fixed.

## 7. Validation proof

| Check | Result |
|-------|--------|
| `npm run test:api` | 5 passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Default Playwright suite | Functional tests passed; `/api/config` 404 verified on both projects |
| Enabled production build | Build, bundle inspection, analytics-load/MENY smoke test passed |
| Disabled production build | Build, bundle inspection, analytics-off/MENY-off smoke test passed |
| `az bicep build` | Passed |
| `az deployment group validate` | Passed |
| `az deployment group what-if` | No deployment changes |
| Code review | PWA caching, IaC overwrite, API fallback, and flag consistency findings fixed |
