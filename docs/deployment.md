# Deployment

The app ships as a Docker image to **GitHub Container Registry (GHCR, public)** and runs on
**Azure Container Apps (ACA)**. Pushing to `main` builds, pushes, and deploys automatically.

## Image

```dockerfile
# multi-stage: build with all deps, run with prod deps only
FROM node:22-alpine AS build   → npm ci → npm run build (dist/)
FROM node:22-alpine AS runtime → npm ci --omit=dev → copy dist/ + server/ → node server/index.js
```

Local build & run:
```bash
docker build -t barnebursdag:latest .
docker run -p 8080:8080 -e KASSAL_API_KEY=xxxx barnebursdag:latest
# verify
curl http://localhost:8080/api/health
```

> `sharp` is deliberately not a dependency, so this Alpine build never has to compile native modules.
> Icons are pre-generated and committed.

## CI/CD — `.github/workflows/deploy.yml`

Trigger: push to `main` (docs/markdown-only changes are ignored via `paths-ignore`) or manual dispatch.

Steps:
1. **Log in to GHCR** with `GITHUB_TOKEN` (the workflow has `packages: write`).
2. **Build & push** `ghcr.io/<owner>/barnebursdag-planlegger:latest` and `:<sha>`.
3. **Make the GHCR package public** (best-effort `gh api PATCH …/visibility`).
4. **Azure login** with the `AZURE_CREDENTIALS` service-principal secret.
5. **Deploy** to ACA: create the app on first run, otherwise update the image. Sets the Kassal secret, registry pull credentials, env vars, and ingress.

The deploy step is **idempotent** (`az containerapp show` → create-or-update).

## Required GitHub secrets

| Secret | How to create |
|--------|---------------|
| `AZURE_CREDENTIALS` | `az ad sp create-for-rbac --name sp-barnebursdag-gh --role Contributor --scopes /subscriptions/<SUB_ID> --sdk-auth` → paste the JSON |
| `KASSAL_API_KEY` | your Kassal.app key (also stored as an ACA secret) |

Set them with the GitHub CLI (avoid printing the values):
```bash
gh secret set AZURE_CREDENTIALS -R <owner>/barnebursdag-planlegger < creds.json
gh secret set KASSAL_API_KEY   -R <owner>/barnebursdag-planlegger
```

## Azure resources (one-time)

Pre-create the resource group and Container Apps environment **before** the first deploy so the
workflow's deploy step doesn't race ahead (env creation takes a few minutes):

```bash
az provider register -n Microsoft.App --wait
az provider register -n Microsoft.OperationalInsights --wait      # ACA needs Log Analytics
az group create -n rg-barnebursdag -l norwayeast
az containerapp env create -n cae-barnebursdag -g rg-barnebursdag -l norwayeast
```

The container app itself (`barnebursdag`) is created by the workflow:
- ingress external, **target port 8080**
- secret `kassal-api-key`, env `KASSAL_API_KEY=secretref:kassal-api-key`, `PORT=8080`
- `--min-replicas 1` (always warm — no cold starts; set to 0 to save cost)
- registry pull credentials provided as a fallback even though the package is public

Get the URL:
```bash
az containerapp show -n barnebursdag -g rg-barnebursdag \
  --query properties.configuration.ingress.fqdn -o tsv
```

## Why the image is built in CI, not locally

A local `gh`/Docker login usually **cannot push to GHCR** because the local token lacks the
`write:packages` scope. The workflow's `GITHUB_TOKEN` has it, so building & pushing in CI is the
reliable path. ACA then pulls the **public** image anonymously (the workflow also stores pull
credentials as a belt-and-braces fallback).

## Troubleshooting

| Symptom | Cause / fix |
|--------|-------------|
| `denied: permission_scope` pushing to GHCR locally | Local token lacks `write:packages`. Push via the Actions workflow instead. |
| ACA can't pull image (`UNAUTHORIZED`) on scale-out | Make sure the GHCR **package is public** (Packages → settings), or keep `--min-replicas 1`. The workflow attempts to set it public automatically. |
| `az containerapp env create` very slow | Normal (several minutes; it provisions a Log Analytics workspace). Pre-create it; wait for `provisioningState: Succeeded`. |
| Deploy step fails: env not found | The Container Apps environment must exist first. Pre-create `cae-barnebursdag`. |
| Health 200 but blank page | Check the JS asset returns 200 (`/assets/index-*.js`); a 404 means the static copy/dist step is off. |
| `Microsoft.OperationalInsights not registered` | `az provider register -n Microsoft.OperationalInsights --wait`. |
| Node 20 deprecation warning in Actions | Harmless; the actions are auto-forced to Node 24. |

## Cost note

`--min-replicas 1` keeps one replica always running (snappy, no cold start) — small but continuous
cost. Set `--min-replicas 0` for scale-to-zero if cost matters more than first-hit latency (the public
image still pulls anonymously).
