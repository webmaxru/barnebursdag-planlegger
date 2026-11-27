# Content: guides, recipes and trust pages

All editorial pages live as Markdown in `content/`:

| Folder | URL | Used for |
|---|---|---|
| `content/guider/<slug>.md` | `/guider/<slug>` | Guides (Article JSON-LD) |
| `content/oppskrifter/<slug>.md` | `/oppskrifter/<slug>` | Recipes (Recipe JSON-LD) |
| `content/sider/<slug>.md` | `/<slug>` | Trust pages: om-kakeklar, nytt, kontakt, personvern, vilkar |

The hubs `/guider` and `/oppskrifter` are generated from the lists.

The monthly party-basket price index is the guide `content/guider/prisindeks-bursdagskurv.md`. How to publish the next month is in [prisindeks.md](prisindeks.md).

## File format

JSON front matter between two `---` lines, then Markdown (GFM tables and lists are fine):

```md
---
{
  "title": "≤ 65 chars",
  "description": "120–155 chars, written for the search snippet",
  "slug": "same-as-filename",
  "section": "guider",
  "category": "mengder | planlegging | barnehage | allergier | aktiviteter | oppskrifter",
  "date": "2026-10-17",
  "updated": "2026-10-17",
  "related": ["other-slug", "another-slug"],
  "faq": [{ "q": "…", "a": "…" }],
  "sources": [{ "title": "…", "url": "https://…" }],
  "recipe": { "name": "…", "yield": "…", "prepTime": "PT20M", "cookTime": "PT30M", "totalTime": "PT50M",
              "category": "Kake", "cuisine": "Norsk", "keywords": "…",
              "ingredients": ["…"], "instructions": [{ "name": "…", "text": "…" }], "allergens": ["gluten"] }
}
---
Lead paragraph …

## Section
```

- `{{recipe}}` on its own line marks where the ingredient/step card is rendered from the `recipe` object.
- `{{contact_email}}` (kontakt page only) becomes a mailto paragraph. The address defaults to
  `salnikov@gmail.com` so the prerendered HTML does not depend on an environment variable.
  `VITE_CONTACT_EMAIL` (production: the Actions variable `CONTACT_EMAIL`) overrides it when set.
  The shared renderer resolves it for both static HTML and `content.json`. `@` is written as `&#64;`.
- Internal links (`/guider/...`, `/oppskrifter/...`) and `related` slugs are validated at build time; an unknown
  target fails the build (set `CONTENT_LENIENT=1` to warn instead while drafting).

## Build pipeline

```
npm run content      # content/**/*.md → public/content.json (dev server + SPA fallback renderer)
npm run build        # prebuild: content → vite build → postbuild: scripts/prerender.mjs
npm run test:content # contact rendering and service-worker cache regression tests
```

`scripts/prerender.mjs` writes one static HTML document per page into `dist/<path>/index.html` with its own
`<title>`, meta description, canonical, Open Graph tags, JSON-LD (Article/Recipe/WebPage + BreadcrumbList +
FAQPage), breadcrumbs and footer, plus `dist/sitemap.xml`, `dist/404.html`, `dist/llms.txt` and the
`staticwebapp.config.json` routes (one rewrite per page, 301s for moved URLs, a real 404, no SPA catch-all).

Why: the SPA used to serve the same `index.html` (same title, canonical → `/`) for every URL, so crawlers saw
the whole site as one page — the direct cause of the AdSense "low value content" rejection.

Optional build-time env:

- `VITE_ADSENSE_CLIENT` — AdSense publisher; defaults to `ca-pub-6118980043742623` (set `off` to build without ads).
  Injects the account meta into every page, but the loader (`adsbygoogle.js`, once per page) only into guides and recipes, with
  the in-article (4250080584) + multiplex (3563684870) units into guides and recipes (`withAds` in
  `scripts/prerender.mjs`). Publish the AdSense consent message (CMP) before deploying.
- `VITE_CONTACT_EMAIL=…` — optional override for the address on `/kontakt`. When it is unset, the build
  uses `salnikov@gmail.com`. Production builds still pass the Actions variable `CONTACT_EMAIL` when it is set.

The privacy page's consent button loads Google's consent manager on demand through `public/consent.js`,
independently of the ad loader. The same helper supports the React fallback. It queues revocation until
`CONSENT_DATA_READY`, reports load failures/timeouts, and never adds ad units to the privacy page.
Withdrawal remains available when ads are disabled, since earlier consent cookies may still exist.

Legacy guide redirects are shared in `scripts/content-routes.mjs` so Static Web Apps and Express/Docker
return the same 301 responses before serving content.

The Docker build context must include `scripts/` and `content/**/*.md` for prerendering. Its runtime
copies only the dependency-free redirect module alongside the Express adapter. CI builds and
smoke-tests the compatibility container (health, content, redirect and 404) before deploying to Static Web Apps.

## Round 2 additions

- `image` (recipes): `{ "src": "/img/...svg", "png": "/img/...png", "width": 1200, "height": 800, "alt": "...", "caption": "..." }` —
  `src` is shown on the page, `png` goes into the Recipe/Article JSON-LD and `og:image`. Use only your own images or
  images whose licence you have checked; the current ones are Kakeklar's own SVG illustrations.
- `photo` (author page): `{ "src": "/img/maxim.jpg", "alt": "Portrett av Maxim Salnikov", "width": 400, "height": 400 }`.
- HTML comments (`<!-- ... -->`) in markdown are editor notes and are stripped from the build.
- Every guide and recipe gets: «Sist oppdatert» date line, byline linked to `/om-utvikleren`, a calculator box after the
  first paragraph (presets per slug in `CALC_PRESETS`, `scripts/content.mjs`) and an author box before «Les også».
- Bump `updated` whenever you change a page's substance; the date shows on the page, in JSON-LD and in the sitemap.

Shopping-list TXT/copy and CSV exports preserve item notes, including allergy warnings. CSV uses semicolons,
a BOM, whole-kroner numeric prices and a `Merknad` column. Formula-leading catalog strings are prefixed with
an apostrophe before CSV escaping. Checklist storage failures leave the in-memory list usable and show a warning.
