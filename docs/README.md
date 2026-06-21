# Kakeklar — Documentation

Detailed documentation for the Norwegian kids' birthday party purchase planner.

| Doc | What's inside |
|-----|----------------|
| [architecture.md](architecture.md) | System design, request flow, components, directory map, design decisions |
| [calculation-engine.md](calculation-engine.md) | How quantities are computed: modes, age bands, pack rounding, worked examples |
| [configuration.md](configuration.md) | The fully-configurable goods list: `GoodItem` schema, editor, import/export, persistence |
| [api.md](api.md) | Server API reference: `/api/health`, `/api/kassal/products` |
| [development.md](development.md) | Local setup, scripts, env vars, ports, icon generation |
| [deployment.md](deployment.md) | Docker, GHCR, Azure Container Apps, CI/CD, secrets, troubleshooting |
| [analytics.md](analytics.md) | Cookieless Application Insights, the no-cookie-banner rationale, event catalog, engagement workbook |

## At a glance

- **Live:** https://barnebursdag.redbay-75e0a43a.norwayeast.azurecontainerapps.io
- **Repo:** https://github.com/webmaxru/barnebursdag-planlegger
- **Image:** `ghcr.io/webmaxru/barnebursdag-planlegger` (public)
- **Stack:** Node.js + Express (server) · Vite + React + TypeScript (client) · Kassal.app (prices)
- **Hosting:** Azure Container Apps (Norway East), CI/CD via GitHub Actions

## The product in one paragraph

A parent opens the app, drags **two sliders** — number of guests and the child's age — and instantly
gets an age-aware shopping list (food, drink, tableware, decorations) with quantities rounded up to
real Norwegian pack sizes, plus a printable checklist and timeline. A **home vs. kindergarten** toggle
adjusts for Helsedirektoratet sugar guidance, allergy toggles add swap hints, and the entire goods
catalog is **user-editable**. State lives in the URL so a plan can be shared with a co-parent or the
class chat. No login, no cookies, Norwegian-first.

> If you are an AI agent working on this repo, also read
> [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — it captures the build/deploy
> gotchas that cost the most time.
