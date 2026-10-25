// Shared content model for Kakeklar's static pages (guides, recipes, trust pages).
// Used by scripts/build-content.mjs (→ public/content.json for the SPA / dev server)
// and scripts/prerender.mjs (→ dist/<path>/index.html, sitemap.xml, 404.html, SWA routes).
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import { REDIRECTS } from './content-routes.mjs';

export { REDIRECTS };

export const SITE = 'https://kakeklar.no';
export const SITE_NAME = 'Kakeklar';
export const AUTHOR = {
  name: 'Maxim Salnikov',
  path: '/om-utvikleren',
  url: 'https://kakeklar.no/om-utvikleren',
  sameAs: ['https://www.linkedin.com/in/webmax/', 'https://github.com/webmaxru'],
  bio: 'Maxim Salnikov er forelder, utvikler i Oslo og laget Kakeklar for å slippe hoderegning før barnebursdager. Han skriver og vedlikeholder guidene og kalkulatoren.'
};
// agentprose (https://agentprose.cloud): makes the guides and recipes readable for AI agents through WebMCP
// (read-only tools: search, list, get article) and powers hosted search for this site. The key is the public
// site key from the agentprose.cloud dashboard. Injected once into every page's <head> by scripts/prerender.mjs.
// /v/0/ is the evergreen 0.x channel: it always serves the latest compatible 0.x release (cached ~1 h), so fixes
// arrive without a code change. To pin instead, use an exact version, e.g. https://agentprose.cloud/v/0.1.0/agentprose.min.js.
export const AGENTPROSE_KEY = 'pk_fJJtZLOFInWKFuyN';
export const AGENTPROSE_SNIPPET = `<script src="https://agentprose.cloud/v/0/agentprose.min.js" data-cloud="https://agentprose.cloud" data-key="${AGENTPROSE_KEY}" defer></script>`;
export const CONTENT_DIR = path.resolve('content');

export const CATEGORIES = {
  mengder: 'Mengder',
  planlegging: 'Planlegging',
  barnehage: 'Barnehage',
  allergier: 'Allergier',
  aktiviteter: 'Leker og aktiviteter',
  oppskrifter: 'Oppskrifter'
};
export const CATEGORY_ORDER = ['mengder', 'planlegging', 'barnehage', 'allergier', 'aktiviteter', 'oppskrifter'];

marked.setOptions({ gfm: true, breaks: false });

function parseFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`Missing front matter: ${file}`);
  let meta;
  try { meta = JSON.parse(m[1]); } catch (e) { throw new Error(`Invalid JSON front matter in ${file}: ${e.message}`); }
  const section = meta.section || path.basename(path.dirname(file));
  const slug = meta.slug || path.basename(file, '.md');
  const urlPath = section === 'sider' ? `/${slug}` : `/${section}/${slug}`;
  const body = m[2].replace(/<!--[\s\S]*?-->/g, '').trim();
  const words = body.replace(/\{\{recipe\}\}/g, '').split(/\s+/).filter(Boolean).length
    + (meta.recipe ? (meta.recipe.ingredients || []).length * 3 + (meta.recipe.instructions || []).reduce((n, s) => n + (s.text || '').split(/\s+/).length, 0) : 0);
  return { ...meta, section, slug, path: urlPath, body, words, readMinutes: Math.max(1, Math.round(words / 200)), file };
}

export function loadPages() {
  const files = [];
  for (const dir of fs.readdirSync(CONTENT_DIR)) {
    const full = path.join(CONTENT_DIR, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) if (f.endsWith('.md')) files.push(path.join(full, f));
  }
  const pages = files.map(parseFile);
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  // Validate internal links and related slugs so a typo never ships as a 404.
  const errors = [];
  for (const p of pages) {
    for (const s of p.related || []) if (!bySlug.has(s)) errors.push(`${p.file}: related slug not found: ${s}`);
    for (const m of p.body.matchAll(/\]\((\/[^)\s#]*)/g)) {
      const href = m[1].replace(/\/$/, '') || '/';
      if (href !== '/' && !byPath.has(href) && !REDIRECTS[href] && !['/guider', '/oppskrifter'].includes(href)) errors.push(`${p.file}: link to unknown page ${href}`);
    }
  }
  if (errors.length) {
    if (process.env.CONTENT_LENIENT) console.warn(`content: ${errors.length} link warnings (CONTENT_LENIENT set)`);
    else throw new Error('Content validation failed:\n' + errors.join('\n'));
  }
  pages.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, 'nb'));
  return { pages, byPath, bySlug };
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

function recipeCard(r) {
  if (!r) return '';
  const ing = (r.ingredients || []).map((i) => `<li>${esc(i)}</li>`).join('');
  const steps = (r.instructions || []).map((s) => `<li>${s.name ? `<strong>${esc(s.name)}.</strong> ` : ''}${esc(s.text)}</li>`).join('');
  const meta = [
    r.yield && `<span><b>Gir</b> ${esc(r.yield)}</span>`,
    r.prepTime && `<span><b>Forberedelse</b> ${esc(humanDuration(r.prepTime))}</span>`,
    r.cookTime && `<span><b>Steketid</b> ${esc(humanDuration(r.cookTime))}</span>`,
    r.totalTime && `<span><b>Totalt</b> ${esc(humanDuration(r.totalTime))}</span>`
  ].filter(Boolean).join('');
  const allergens = (r.allergens || []).length ? `<p class="recipe-allergens">Inneholder: ${r.allergens.map(esc).join(', ')}. Sjekk alltid emballasjen på varene du bruker.</p>` : '';
  return `<section class="recipe-card" aria-label="Oppskrift">
<div class="recipe-meta">${meta}</div>
<h2>Ingredienser</h2><ul class="recipe-ingredients">${ing}</ul>
<h2>Slik gjør du</h2><ol class="recipe-steps">${steps}</ol>
${allergens}</section>`;
}

export function humanDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso || '');
  if (!m) return iso || '';
  const h = Number(m[1] || 0), min = Number(m[2] || 0);
  return [h ? `${h} t` : '', min ? `${min} min` : ''].filter(Boolean).join(' ');
}

function faqHtml(faq) {
  if (!faq?.length) return '';
  return `<section class="content-faq" aria-labelledby="faq-h"><h2 id="faq-h">Ofte stilte spørsmål</h2>${faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>`;
}

function sourcesHtml(sources) {
  if (!sources?.length) return '';
  return `<section class="content-sources"><h2>Kilder</h2><ul>${sources
    .map((s) => `<li><a href="${esc(s.url)}" rel="noopener noreferrer nofollow" target="_blank">${esc(s.title || s.url)}</a></li>`).join('')}</ul></section>`;
}

function relatedHtml(page, bySlug) {
  const rel = (page.related || []).map((s) => bySlug.get(s)).filter(Boolean);
  if (!rel.length) return '';
  return `<aside class="content-related" aria-labelledby="rel-h"><h2 id="rel-h">Les også</h2><div class="content-links">${rel
    .map((p) => `<a class="content-link" href="${p.path}"><strong>${esc(p.title)}</strong><span>${esc(p.description)}</span></a>`).join('')}</div></aside>`;
}


/** Calculator links with a matching preset, so a reader lands on a list that fits the article. */
const CALC_PRESETS = {
  'pizza-til-barnebursdag': { q: '?gjester=12&alder=7&rett=pizza', text: 'Se hvor mange pizzaer, hvor mye drikke og hva mer du trenger – regnet ut for antall barn og alder.' },
  'polsefest-barnebursdag': { q: '?gjester=12&alder=6', text: 'Kalkulatoren regner ut pølser, lomper og pølsebrød for antall barn og alder, og runder opp til hele pakker.' },
  'barnehagebursdag': { q: '?gjester=16&alder=4&type=barnehage', text: 'Velg barnehage i kalkulatoren, så tilpasses listen til en kort feiring i barnehagen.' },
  'fruktspyd-og-sunn-bursdagsmat': { q: '?gjester=16&alder=4&type=barnehage', text: 'Skal du ha med noe til barnehagen? Kalkulatoren regner ut mengder for hele gruppen.' },
  'hvor-mye-drikke-til-barnebursdag': { q: '', text: 'Kalkulatoren regner ut saft og brus ut fra antall gjester og barnas alder, rundet opp til hele pakninger. Vann og kaffe planlegger du selv.' },
  'hvor-stor-bursdagskake': { q: '', text: 'Kalkulatoren foreslår kake, muffins og resten av handlelisten ut fra antall gjester og alder.' }
};
export function calcCtaHtml(page) {
  if (page.section !== 'guider' && page.section !== 'oppskrifter') return '';
  if (page.slug === 'slik-beregner-kakeklar') return '';
  const preset = CALC_PRESETS[page.slug] || { q: '', text: 'Dra to glidere – antall gjester og alder – og få en handleliste med mat, drikke, servise og pynt, rundet opp til hele pakker.' };
  return `<aside class="calc-cta" aria-label="Kalkulator"><p class="calc-cta-title">Regn ut handlelisten for din fest</p><p>${esc(preset.text)}</p><a class="calc-cta-btn" href="/${preset.q}">Åpne kalkulatoren →</a></aside>`;
}

export function authorBoxHtml(page) {
  if (page.section !== 'guider' && page.section !== 'oppskrifter') return '';
  return `<aside class="author-box" aria-label="Om utvikleren"><p class="author-box-name">Skrevet av <a href="${AUTHOR.path}" rel="author">${esc(AUTHOR.name)}</a></p><p>${esc(AUTHOR.bio)} <a href="${AUTHOR.path}">Les mer om utvikleren</a> eller se <a href="/guider/slik-beregner-kakeklar">hvordan mengdene beregnes</a>.</p></aside>`;
}

/** Recipe illustration (own SVG, no third-party licence needed). Width/height set to avoid layout shift. */
export function figureHtml(page) {
  const img = page.image;
  if (!img?.src) return '';
  return `<figure class="content-figure"><img src="${esc(img.src)}" width="${img.width || 1200}" height="${img.height || 800}" alt="${esc(img.alt || '')}" decoding="async" fetchpriority="high" />${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>`;
}

/** Inserts the calculator box after the article's first paragraph. */
function withCalcCta(page, html) {
  const box = calcCtaHtml(page);
  if (!box) return html;
  const i = html.indexOf('</p>');
  return i === -1 ? box + html : html.slice(0, i + 4) + box + html.slice(i + 4);
}

/** Renders the inner article HTML (shared by the prerendered page and the SPA fallback). */
export function renderBody(page, bySlug, contactEmail = process.env.VITE_CONTACT_EMAIL || '') {
  let html = marked.parse(page.body);
  if (page.path === '/kontakt') {
    const contact = contactEmail.trim();
    const paragraph = contact
      ? `<p>Send gjerne en e-post til <a href="mailto:${esc(contact)}">${esc(contact)}</a>. Vi svarer normalt innen noen dager.</p>`
      : `<p>Den raskeste veien er <a href="https://github.com/webmaxru/barnebursdag-planlegger/issues">GitHub Issues</a>, eller en melding til utvikleren på <a href="https://www.linkedin.com/in/webmax/" rel="noopener noreferrer">LinkedIn</a>.</p>`;
    html = html.replace(/<p>\{\{contact_email\}\}<\/p>|\{\{contact_email\}\}/g, paragraph);
  }
  const card = recipeCard(page.recipe);
  if (html.includes('{{recipe}}')) html = html.replace(/<p>\{\{recipe\}\}<\/p>|\{\{recipe\}\}/, card);
  else if (card) html += card;
  html = withCalcCta(page, html);
  const photo = page.photo?.src ? `<img class="author-photo" src="${esc(page.photo.src)}" width="160" height="160" alt="${esc(page.photo.alt || '')}" decoding="async" />` : '';
  return `${photo}${figureHtml(page)}${html}${faqHtml(page.faq)}${sourcesHtml(page.sources)}${authorBoxHtml(page)}${relatedHtml(page, bySlug)}`;
}

export const HUB_FEATURED = ['planlegg-barnebursdag-steg-for-steg', 'hvor-mye-mat-til-barnebursdag', 'slik-beregner-kakeklar'];
export const RECIPE_GROUPS = [
  { id: 'kaker', title: 'Kaker og muffins', match: (p) => (p.recipe?.category || '') === 'Kake' },
  { id: 'sunt', title: 'Sunn bursdagsmat og snacks', match: (p) => (p.recipe?.category || '') !== 'Kake' }
];
const latest = (items) => items.reduce((m, p) => ((p.updated || p.date || '') > m ? (p.updated || p.date) : m), '2026-10-17');

export function hubPages(pages) {
  const guides = pages.filter((p) => p.section === 'guider');
  const recipes = pages.filter((p) => p.section === 'oppskrifter');
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const card = (p) => `<a class="content-link${p.image?.src ? ' content-link--img' : ''}" href="${p.path}">${p.image?.src ? `<img src="${esc(p.image.src)}" width="120" height="80" alt="" loading="lazy" decoding="async" />` : ''}<strong>${esc(p.title)}</strong><span>${esc(p.description)}</span><small>${p.readMinutes} min lesetid · oppdatert ${fmtDate(p.updated || p.date)}</small></a>`;
  const list = (items) => `<div class="content-links">${items.map(card).join('')}</div>`;
  const chips = (entries) => `<nav class="hub-chips" aria-label="Kategorier">${entries.map(([id, label, n]) => `<a href="#hub-${id}">${esc(label)} <span>${n}</span></a>`).join('')}</nav>`;
  const calcBox = `<aside class="calc-cta" aria-label="Kalkulator"><p class="calc-cta-title">Vet du antall gjester og alder?</p><p>Da kan du hoppe rett til kalkulatoren og få en ferdig handleliste – med avkrysning, utskrift og nedlasting.</p><a class="calc-cta-btn" href="/">Åpne kalkulatoren →</a></aside>`;

  const guideCats = CATEGORY_ORDER.filter((c) => c !== 'oppskrifter').map((c) => [c, CATEGORIES[c], guides.filter((p) => p.category === c)]).filter(([, , items]) => items.length);
  const featured = HUB_FEATURED.map((s) => bySlug.get(s)).filter(Boolean);
  const guiderBody = chips([...guideCats.map(([c, label, items]) => [c, label, items.length]), ['opp', 'Oppskrifter', recipes.length]])
    + (featured.length ? `<section class="hub-section hub-start" aria-labelledby="hub-start"><h2 id="hub-start">Start her</h2><p>Planlegger du din første barnebursdag? Disse tre gir deg oversikten: en plan uke for uke, hvor mye mat som faktisk går med, og hvordan kalkulatoren regner.</p>${list(featured)}</section>` : '')
    + calcBox
    + guideCats.map(([c, label, items]) => `<section class="hub-section" aria-labelledby="hub-${c}"><h2 id="hub-${c}">${esc(label)}</h2>${list(items)}</section>`).join('')
    + (recipes.length ? `<section class="hub-section" aria-labelledby="hub-opp"><h2 id="hub-opp">Oppskrifter til bursdagen</h2>${list(recipes.slice(0, 4))}<p><a href="/oppskrifter">Alle oppskrifter →</a></p></section>` : '');

  const recipeGroups = RECIPE_GROUPS.map((g) => [g.id, g.title, recipes.filter(g.match)]).filter(([, , items]) => items.length);
  const relatedGuides = ['hvor-stor-bursdagskake', 'allergier-i-barnebursdag', 'barnehagebursdag'].map((s) => bySlug.get(s)).filter(Boolean);
  const oppskrifterBody = chips(recipeGroups.map(([id, title, items]) => [id, title, items.length]))
    + recipeGroups.map(([id, title, items]) => `<section class="hub-section" aria-labelledby="hub-${id}"><h2 id="hub-${id}">${esc(title)}</h2>${list(items)}</section>`).join('')
    + calcBox
    + (relatedGuides.length ? `<section class="hub-section" aria-labelledby="hub-guider"><h2 id="hub-guider">Nyttige guider til kakebordet</h2>${list(relatedGuides)}<p><a href="/guider">Alle guider →</a></p></section>` : '');

  return [
    {
      path: '/guider', slug: 'guider', section: 'hub', title: 'Guider til barnebursdag',
      description: 'Praktiske guider om matmengder, drikke, kake, planlegging, barnehagebursdag, allergier, leker og budsjett – skrevet for norske foreldre.',
      eyebrow: 'Kakeklar · guider', date: '2026-10-17', updated: latest(guides),
      lead: 'Alt du trenger for å planlegge en barnebursdag for barn mellom 3 og 9 år: hvor mye du skal kjøpe, hva du bør huske, og hvordan du får det til uten stress.',
      html: guiderBody, words: 0, items: [...guides, ...recipes.slice(0, 4)]
    },
    {
      path: '/oppskrifter', slug: 'oppskrifter', section: 'hub', title: 'Oppskrifter til barnebursdag',
      description: 'Enkle oppskrifter på bursdagskake, bløtkake, muffins og sunn bursdagsmat – med mengder som passer antall barn.',
      eyebrow: 'Kakeklar · oppskrifter', date: '2026-10-17', updated: latest(recipes),
      lead: 'Kaker og mat som fungerer i barnebursdag: enkle å lage, lette å dele opp, og med tips til allergivennlige varianter.',
      html: oppskrifterBody, words: 0, items: recipes
    }
  ];
}

export function jsonLd(page, bySlug) {
  const url = SITE + page.path;
  const crumbs = [{ name: 'Hjem', item: SITE + '/' }];
  if (page.section === 'guider') crumbs.push({ name: 'Guider', item: SITE + '/guider' });
  if (page.section === 'oppskrifter') crumbs.push({ name: 'Oppskrifter', item: SITE + '/oppskrifter' });
  crumbs.push({ name: page.title, item: url });
  const graph = [{
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item }))
  }];
  const publisher = { '@type': 'Organization', name: SITE_NAME, url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png' } };
  const author = { '@type': 'Person', '@id': AUTHOR.url + '#person', name: AUTHOR.name, url: AUTHOR.url, sameAs: AUTHOR.sameAs };
  const pageImage = page.image?.png ? SITE + page.image.png : SITE + '/og-image.png';
  if (page.section === 'guider') {
    graph.push({ '@type': 'Article', '@id': url + '#article', headline: page.title, description: page.description, inLanguage: 'nb',
      mainEntityOfPage: url, datePublished: page.date, dateModified: page.updated || page.date, author, publisher,
      image: pageImage, wordCount: page.words, articleSection: CATEGORIES[page.category] || page.category });
  } else if (page.section === 'oppskrifter' && page.recipe) {
    const r = page.recipe;
    graph.push({ '@type': 'Recipe', '@id': url + '#recipe', name: r.name || page.title, description: page.description, inLanguage: 'nb',
      mainEntityOfPage: url, datePublished: page.date, dateModified: page.updated || page.date, author, publisher,
      image: page.image?.png ? [SITE + page.image.png] : SITE + '/og-image.png',
      recipeYield: r.yield, prepTime: r.prepTime, cookTime: r.cookTime, totalTime: r.totalTime,
      recipeCategory: r.category, recipeCuisine: r.cuisine, keywords: r.keywords,
      recipeIngredient: r.ingredients, recipeInstructions: (r.instructions || []).map((s) => ({ '@type': 'HowToStep', name: s.name, text: s.text })) });
  } else if (page.section === 'hub') {
    graph.push({ '@type': 'CollectionPage', name: page.title, description: page.description, url, inLanguage: 'nb', dateModified: page.updated, isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' },
      mainEntity: { '@type': 'ItemList', itemListElement: (page.items || []).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + p.path, name: p.title })) } });
  } else if (page.path === AUTHOR.path) {
    graph.push({ '@type': 'ProfilePage', name: page.title, description: page.description, url, inLanguage: 'nb', dateModified: page.updated || page.date,
      mainEntity: { ...author, description: AUTHOR.bio, homeLocation: { '@type': 'Place', name: 'Oslo' } }, isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' } });
  } else {
    graph.push({ '@type': 'WebPage', name: page.title, description: page.description, url, inLanguage: 'nb', dateModified: page.updated || page.date, isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE + '/' } });
  }
  if (page.faq?.length) graph.push({ '@type': 'FAQPage', mainEntity: page.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
  return { '@context': 'https://schema.org', '@graph': graph };
}

export function breadcrumbsHtml(page) {
  const items = [`<li><a href="/">Hjem</a></li>`];
  if (page.section === 'guider') items.push(`<li><a href="/guider">Guider</a></li>`);
  if (page.section === 'oppskrifter') items.push(`<li><a href="/oppskrifter">Oppskrifter</a></li>`);
  items.push(`<li aria-current="page">${esc(page.title)}</li>`);
  return `<nav class="breadcrumbs" aria-label="Brødsmuler"><ol>${items.join('')}</ol></nav>`;
}

export function pageMeta(page) {
  const eyebrow = page.eyebrow || (page.section === 'guider' ? `Kakeklar · guider · ${CATEGORIES[page.category] || ''}` : page.section === 'oppskrifter' ? 'Kakeklar · oppskrifter' : 'Kakeklar');
  const updated = page.updated || page.date;
  const article = page.section === 'guider' || page.section === 'oppskrifter';
  const dates = article
    ? `Sist oppdatert ${fmtDate(updated)}${page.date && page.date !== updated ? ` · Publisert ${fmtDate(page.date)}` : ''} · ${page.readMinutes} min lesetid · Av ${AUTHOR.name}`
    : updated ? `Sist oppdatert ${fmtDate(updated)}` : '';
  return { eyebrow, dates };
}

/** The visible date + byline line under the h1 (prerendered pages). */
export function metaHtml(page) {
  const updated = page.updated || page.date;
  if (!updated) return '';
  const time = (iso) => `<time datetime="${esc(iso)}">${esc(fmtDate(iso))}</time>`;
  const article = page.section === 'guider' || page.section === 'oppskrifter';
  if (!article) return `<p class="content-meta">Sist oppdatert ${time(updated)}</p>`;
  const cat = page.section === 'guider' && CATEGORIES[page.category] ? ` · <a href="/guider#hub-${esc(page.category)}">${esc(CATEGORIES[page.category])}</a>` : '';
  return `<p class="content-meta">Sist oppdatert ${time(updated)}${page.date && page.date !== updated ? ` · Publisert ${time(page.date)}` : ''} · ${page.readMinutes} min lesetid${cat}</p>
        <p class="content-byline">Av <a href="${AUTHOR.path}" rel="author">${esc(AUTHOR.name)}</a>, forelder og utvikleren bak Kakeklar</p>`;
}

export { esc };
