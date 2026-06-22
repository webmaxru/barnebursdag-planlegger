# Kakeklar — Documentation

Detailed documentation for the Norwegian kids' birthday party purchase planner.

| Doc | What's inside |
|-----|----------------|
| [architecture.md](architecture.md) | System design, request flow, components, directory map, design decisions |
| [calculation-engine.md](calculation-engine.md) | How quantities are computed: modes, age bands, pack rounding, worked examples |
| [configuration.md](configuration.md) | The fully-configurable goods list: `GoodItem` schema, editor, import/export, persistence |
| [api.md](api.md) | Server API reference: `/api/health`, `/api/config`, `/api/kassal/products`, `/api/meny/cart` |
| [meny-cart.md](meny-cart.md) | **Handle på MENY** (experimental): shareable meny.no cart, the reverse-engineered NGData protocol, the feature flag |
| [development.md](development.md) | Local setup, scripts, env vars, ports, icon generation, **e2e tests** |
| [deployment.md](deployment.md) | Docker, GHCR, Azure Container Apps, CI/CD (**e2e gate**), secrets, troubleshooting |
| [analytics.md](analytics.md) | Cookieless Application Insights, the no-cookie-banner rationale, event catalog, engagement workbook |

## At a glance

- **Live:** https://kakeklar.no
- **Repo:** https://github.com/webmaxru/barnebursdag-planlegger
- **Image:** `ghcr.io/webmaxru/barnebursdag-planlegger` (public)
- **Stack:** Node.js + Express (server) · Vite + React + TypeScript (client) · Kassal.app (prices)
- **Hosting:** Azure Container Apps (Norway East), CI/CD via GitHub Actions

## The product in one paragraph

A parent opens the app and is guided by a short **3-step wizard** — who's celebrating (child's age,
number of kids, and accompanying **adults**) → allergies and dietary restrictions → food choices
(pølser vs pizza and lompe/pølsebrød ratio; godteposer are included by default for home parties) — or
taps **"Hopp over"** into **advanced mode** (the full controls). Either way they
instantly get an age-aware shopping list (food, drink, tableware, decorations) with quantities rounded
up to real Norwegian pack sizes, plus a printable checklist and timeline. After the wizard the app
**leads with the Handleliste**; its summary has inline-editable guest/age number inputs for instant
recompute, and the **Veiviser** button is sized as a primary touch target. A **home vs. kindergarten**
toggle adjusts for Helsedirektoratet sugar guidance, allergy/restriction **quantity** sliders count
both kids and accompanying adults, and the entire goods catalog is **user-editable**; Iskake is
included by default for home parties, piñata is a
disabled-by-default catalog item enabled in **Tilpass varelisten**, and **Sjekk pris** uses
Kassal-validated search terms for the default items. State lives in the URL so a plan can be shared
with a co-parent or the class chat. No login, no cookies, Norwegian-first, with the shared footer shown on every page:
"Kakeklar er gratis…" plus Made in Norway by [Maxim Salnikov](https://www.linkedin.com/in/webmax/) and a link to the
[GitHub repo](https://github.com/webmaxru/barnebursdag-planlegger).

> If you are an AI agent working on this repo, also read
> [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — it captures the build/deploy
> gotchas that cost the most time.
