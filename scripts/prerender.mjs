// Post-build prerender: writes a real, static HTML document for every content page into dist/,
// plus sitemap.xml, 404.html, llms.txt and the Static Web Apps route config.
// agentprose.json (the AI-agent index) is written after this step by `npm run index:agents`.
// Why: the SPA served the same index.html (same <title>, canonical → "/") for every URL, so to
// crawlers the whole site was one page. Google needs each page's own HTML, title and canonical.
import fs from 'node:fs';
import path from 'node:path';
import { loadPages, renderBody, hubPages, jsonLd, breadcrumbsHtml, pageMeta, metaHtml, esc, SITE, SITE_NAME, REDIRECTS, AUTHOR, AGENTPROSE_SNIPPET } from './content.mjs';

const dist = path.resolve('dist');
const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const cssLinks = [...indexHtml.matchAll(/<link rel="stylesheet"[^>]*>/g)].map((m) => m[0]).join('\n    ');
if (!cssLinks) throw new Error('prerender: no stylesheet link found in dist/index.html');
// AdSense publisher (same account and units as bpmtech.no). Set VITE_ADSENSE_CLIENT=off to build without ads.
const DEFAULT_ADSENSE_CLIENT = 'ca-pub-6118980043742623';
const adsenseEnv = (process.env.VITE_ADSENSE_CLIENT ?? '').trim();
const adsenseClient = /^(off|false|0|none)$/i.test(adsenseEnv) ? '' : adsenseEnv || DEFAULT_ADSENSE_CLIENT;
const AD_SLOTS = { inArticle: '4250080584', multiplex: '3563684870' };
const contactEmail = process.env.VITE_CONTACT_EMAIL || '';
const today = new Date().toISOString().slice(0, 10);
// Affiliate «Hvor kjøpe» boxes: OFF unless VITE_AFFILIATE_LINKS=1, and only entries with a url (content/affiliates.json).
const affiliatesOn = (process.env.VITE_AFFILIATE_LINKS ?? '').trim() === '1';
const affiliates = JSON.parse(fs.readFileSync(path.resolve('content/affiliates.json'), 'utf8'));
// Preload the two latin web fonts so text does not reflow when they arrive (CLS on the home page was 0.117).
const fontFiles = fs.readdirSync(path.join(dist, 'assets')).filter((f) => /^(hanken-grotesk|bricolage-grotesque)-latin-wght-normal-.*\.woff2$/.test(f));
const fontPreloads = fontFiles.map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`).join('\n    ');

const { pages, bySlug } = loadPages();
const all = [...pages.map((p) => ({ ...p, html: renderBody(p, bySlug) })), ...hubPages(pages)];

// The account meta tag goes on every page (site connection/verification, support.google.com/adsense/answer/7584263).
// The loader script only goes on pages that actually carry ad units (guides and recipes), so trust pages, hubs and the
// calculator never get ads, not even Auto ads, and the home page does not pay the loader's main-thread cost.
const adsenseMeta = adsenseClient ? `<meta name="google-adsense-account" content="${esc(adsenseClient)}" />` : '';
const adsenseLoader = adsenseClient
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(adsenseClient)}" crossorigin="anonymous"></script>`
  : '';

// Ad units: only on guides and recipes (never on trust pages, hubs, the 404 or the calculator).
// One in-article unit mid-article, one multiplex unit at the end. Each is labelled «Annonser», has its
// Label «Annonser» is one of the two labels AdSense allows in Norwegian (support.google.com/adsense/answer/1346295?hl=no).
// height reserved in CSS (no layout shift) and is only activated when it nears the viewport.
const AD_SECTIONS = new Set(['guider', 'oppskrifter']);
function adUnit(kind) {
  const attrs = kind === 'inArticle'
    ? `style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid"`
    : `style="display:block" data-ad-format="autorelaxed"`;
  return `<aside class="ad-slot ad-slot--${kind === 'inArticle' ? 'in-article' : 'multiplex'}" aria-label="Annonser"><p class="ad-label">Annonser</p><ins class="adsbygoogle-lazy" ${attrs} data-ad-client="${esc(adsenseClient)}" data-ad-slot="${AD_SLOTS[kind]}"></ins></aside>`;
}
/** Inserts the in-article unit before the h2 nearest the middle of the article prose (outside the recipe card,
 *  FAQ, sources and «Les også»), and the multiplex unit at the very end. Short articles get no in-article unit. */
function withAds(page, html) {
  if (!adsenseClient || !AD_SECTIONS.has(page.section)) return html;
  const tail = html.search(/<section class="content-(faq|sources)"|<aside class="content-related"/);
  const proseEnd = tail === -1 ? html.length : tail;
  const card = html.indexOf('<section class="recipe-card"');
  const cardEnd = card === -1 ? -1 : html.indexOf('</section>', card);
  const h2s = [...html.slice(0, proseEnd).matchAll(/<h2[\s>]/g)].map((m) => m.index)
    .filter((i) => !(card !== -1 && i > card && i < cardEnd) && i > proseEnd * 0.3 && i < proseEnd * 0.8);
  let out = html;
  if (h2s.length) {
    const at = h2s.reduce((best, i) => (Math.abs(i - proseEnd / 2) < Math.abs(best - proseEnd / 2) ? i : best));
    out = out.slice(0, at) + adUnit('inArticle') + out.slice(at);
  }
  return out + adUnit('multiplex');
}
function affiliateBox(page) {
  if (!affiliatesOn) return '';
  const links = (affiliates.guides?.[page.slug] || []).filter((l) => l.url && l.label);
  if (!links.length) return '';
  return `<aside class="affiliate-box" aria-labelledby="aff-h"><p class="affiliate-title" id="aff-h">Hvor kjøpe</p><ul>${links
    .map((l) => `<li><span class="aff-label">Annonselenke</span> <a href="${esc(l.url)}" rel="sponsored nofollow noopener" target="_blank">${esc(l.label)}${l.merchant ? ` hos ${esc(l.merchant)}` : ''}</a></li>`).join('')}</ul><p class="affiliate-note">${esc(affiliates.disclosure || '')}</p></aside>`;
}
/** Affiliate box goes after the article prose, before FAQ/sources (never next to an ad unit). */
function withAffiliates(page, html) {
  const box = affiliateBox(page);
  if (!box) return html;
  const tail = html.search(/<section class="content-(faq|sources)"|<aside class="author-box"|<aside class="content-related"/);
  return tail === -1 ? html + box : html.slice(0, tail) + box + html.slice(tail);
}
const adScript = `<script>
      (function () {
        var slots = [].slice.call(document.querySelectorAll('ins.adsbygoogle-lazy'));
        function fill(el) { el.className = 'adsbygoogle'; (window.adsbygoogle = window.adsbygoogle || []).push({}); }
        if (!('IntersectionObserver' in window)) { slots.forEach(fill); return; }
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fill(e.target); } });
        }, { rootMargin: '300px 0px' });
        slots.forEach(function (el) { io.observe(el); });
        // Loader blocked (ad blocker / offline): collapse the empty slots instead of showing blank boxes.
        window.addEventListener('load', function () {
          setTimeout(function () { if (!(window.adsbygoogle && window.adsbygoogle.loaded)) document.documentElement.classList.add('ads-off'); }, 3000);
        });
      })();
    </script>`;

const footer = `<footer class="foot">
      <p>Kakeklar er gratis · ingen innlogging · for norske foreldre. Mengdene er anbefalinger – juster fritt.</p>
      <nav class="foot-nav" aria-label="Informasjon">
        <a href="/om-kakeklar">Om Kakeklar</a><a href="/om-utvikleren">Om utvikleren</a><a href="/guider">Guider</a><a href="/oppskrifter">Oppskrifter</a><a href="/personvern">Personvern</a><a href="/vilkar">Vilkår</a><a href="/kontakt">Kontakt</a>
      </nav>
      <p class="foot-credit">Made in Norway by <a href="/om-utvikleren">Maxim Salnikov</a> · <a href="https://github.com/webmaxru/barnebursdag-planlegger" target="_blank" rel="noopener noreferrer">GitHub</a></p>
    </footer>`;

function document(page) {
  const url = SITE + page.path;
  const { eyebrow, dates } = pageMeta(page);
  const html = page.html;
  const ld = JSON.stringify(jsonLd(page, bySlug)).replace(/</g, '\\u003c');
  const ogImage = page.image?.png ? SITE + page.image.png : `${SITE}/og-image.png`;
  const hasAds = adsenseClient && AD_SECTIONS.has(page.section);
  const ogType = page.section === 'guider' || page.section === 'oppskrifter' ? 'article' : 'website';
  return `<!doctype html>
<html lang="nb">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(page.title)} · ${SITE_NAME}</title>
    <meta name="description" content="${esc(page.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="theme-color" content="#D7264A" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="nb" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="nb_NO" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:width" content="${page.image?.png ? 1200 : 1200}" />
    <meta property="og:image:height" content="${page.image?.png ? 800 : 630}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(page.title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    ${fontPreloads}
    ${cssLinks}
    <script type="application/ld+json">${ld}</script>
    ${adsenseMeta}
    ${hasAds ? adsenseLoader : ''}
    ${page.path === '/personvern' ? `<script src="/consent.js" data-publisher="${esc((adsenseClient || DEFAULT_ADSENSE_CLIENT).replace(/^ca-/, ''))}"></script>` : ''}
    ${AGENTPROSE_SNIPPET}
  </head>
  <body>
    <div class="content-page">
      <nav class="site-nav" aria-label="Hovedmeny">
        <a class="content-back" href="/">← Til Kakeklar</a>
        <a href="/guider"${page.section === 'guider' || page.path === '/guider' ? ' aria-current="page"' : ''}>Guider</a>
        <a href="/oppskrifter"${page.section === 'oppskrifter' || page.path === '/oppskrifter' ? ' aria-current="page"' : ''}>Oppskrifter</a>
      </nav>
      ${breadcrumbsHtml(page)}
      <header class="content-header">
        <p class="hero-eyebrow">${esc(eyebrow)}</p>
        <h1>${esc(page.title)}</h1>
        <p>${esc(page.lead || page.description)}</p>
        ${metaHtml(page)}
      </header>
      <main class="content-body">${withAds(page, withAffiliates(page, html))}</main>
      ${footer}
    </div>
    ${hasAds ? adScript : ''}
  </body>
</html>
`;
}

let count = 0;
let adPages = 0;
for (const page of all) {
  const dir = path.join(dist, page.path.replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  const doc = document(page);
  fs.writeFileSync(path.join(dir, 'index.html'), doc);
  if (doc.includes('adsbygoogle-lazy')) adPages++;
  count++;
}

// 404 page (real 404 status via staticwebapp.config.json responseOverrides).
fs.writeFileSync(path.join(dist, '404.html'), document({
  path: '/404', section: 'sider', title: 'Fant ikke siden', description: 'Siden du lette etter finnes ikke.',
  lead: 'Siden er flyttet eller har aldri eksistert.', html: `<p>Prøv <a href="/">kalkulatoren på forsiden</a>, eller finn det du leter etter i <a href="/guider">guidene</a> og <a href="/oppskrifter">oppskriftene</a>.</p>`
}).replace('<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />', '<meta name="robots" content="noindex" />').replace(/<link rel="canonical"[^>]*>\n/, ''));

// App shell (dist/index.html).
// App shell: font preloads, the AdSense account meta tag and the agentprose snippet. No ad loader: the calculator carries no ad units.
fs.writeFileSync(path.join(dist, 'index.html'), indexHtml.replace('</head>', `    ${fontPreloads}\n${adsenseMeta ? `    ${adsenseMeta}\n` : ''}    ${AGENTPROSE_SNIPPET}\n  </head>`));

// sitemap.xml: home + every content page, with real lastmod dates.
const urls = [{ loc: SITE + '/', lastmod: all.reduce((m, p) => (p.updated || p.date) > m ? (p.updated || p.date) : m, '2026-08-07'), priority: '1.0' },
  ...all.map((p) => ({ loc: SITE + p.path, lastmod: p.updated || p.date || today, priority: p.section === 'hub' ? '0.8' : p.section === 'sider' ? '0.4' : '0.7' }))];
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`);

// llms.txt: keep the hand-written header, append the page list.
const llms = fs.existsSync(path.join(dist, 'llms.txt')) ? fs.readFileSync(path.join(dist, 'llms.txt'), 'utf8').split('\n## Sider')[0].trimEnd() : `# ${SITE_NAME}`;
fs.writeFileSync(path.join(dist, 'llms.txt'), `${llms}\n\n## Sider\n${all.map((p) => `- [${p.title}](${SITE + p.path}): ${p.description}`).join('\n')}\n`);

// Static Web Apps config: explicit routes for every prerendered page, 301s for moved URLs,
// a real 404, and no catch-all rewrite to index.html (that was the soft-404 / duplicate-content cause).
const base = JSON.parse(fs.readFileSync(path.join(dist, 'staticwebapp.config.json'), 'utf8'));
const routes = [
  ...(base.routes || []).filter((r) => r.route !== '/sw.js' || true),
  ...Object.entries(REDIRECTS).map(([from, to]) => ({ route: from, redirect: to, statusCode: 301 })),
  ...all.map((p) => ({ route: p.path, rewrite: `${p.path}/index.html` }))
];
delete base.navigationFallback;
base.routes = routes;
base.trailingSlash = 'never';
base.responseOverrides = { ...(base.responseOverrides || {}), 404: { rewrite: '/404.html', statusCode: 404 } };
fs.writeFileSync(path.join(dist, 'staticwebapp.config.json'), JSON.stringify(base, null, 2) + '\n');

console.log(`prerender: ${count} pages, sitemap ${urls.length} urls, ${routes.length} routes${adsenseClient ? `, AdSense on (${adsenseClient}), ad units on ${adPages} pages` : ', AdSense off (VITE_ADSENSE_CLIENT=off)'}${contactEmail ? ', contact e-mail on' : ''}`);
