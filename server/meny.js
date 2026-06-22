// ---------------------------------------------------------------------------
// meny.no shared-cart mimic (EXPERIMENTAL — behind the FEATURE_MENY_CART flag)
//
// meny.no (NorgesGruppen / MENY, chain 1300) runs on the NGData platform. There
// is no public API, but two endpoints used by their own webshop are reachable
// ANONYMOUSLY (no Trumf login), which is all we need to build and share a cart:
//
//   1. Product search (resolve our list items -> real MENY products + EAN):
//      GET https://platform-rest-prod.ngdata.no/api/products/{chainId}/{gln}/
//          ?search=<term>&page=1&page_size=<n>&fieldset=maximal
//      -> { total, hits: [{ ean, title, subtitle, brand, pricePerUnit,
//                           imagePath, isForSale, isRevoked, isOutOfStock, ... }] }
//
//   2. Create a shared cart ("del handlevogn"):
//      POST https://api.sylinder.no/handlevogn/delehandlevogn/v1/api/
//           body: [{ ean, quantity }]
//      -> { id, cart }
//
//   The shareable link is then  https://meny.no/delt-handlevogn/<id>  — anyone
//   who opens it sees the cart and can add it to their own MENY basket.
//
// This module mimics exactly those calls. The actual logged-in "add to my cart"
// endpoint (PUT /api/client-list-sync/{chainid}/cart) requires a Trumf token and
// is intentionally NOT used — the anonymous shared cart is the shareable artifact.
// ---------------------------------------------------------------------------

const CHAIN_ID = process.env.MENY_CHAIN_ID || '1300'; // MENY
const STORE_GLN = process.env.MENY_STORE_GLN || '7080001150488'; // a MENY online store
const PRODUCTS_BASE = 'https://platform-rest-prod.ngdata.no';
const SHARECART_BASE = 'https://api.sylinder.no';
const SHARE_LINK_BASE = process.env.MENY_SHARE_BASE || 'https://meny.no/delt-handlevogn/';
const UA = 'Mozilla/5.0 (compatible; Kakeklar/1.0; +https://meny.no)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch JSON with a per-attempt timeout and retries with exponential backoff.
 * Retries on HTTP 429, 5xx and network/timeout errors (the upstream NGData/sylinder
 * services are occasionally flaky from datacenter IPs). Non-retryable 4xx throw at once.
 */
async function fetchJson(url, options = {}, { timeoutMs = 10000, retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(Math.min(400 * 2 ** (attempt - 1), 2000));
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        ...options,
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, Accept: 'application/json', ...(options.headers || {}) }
      });
      if (r.status === 429 || r.status >= 500) {
        lastErr = new Error(`HTTP ${r.status}`);
        continue; // transient — retry
      }
      if (!r.ok) {
        const err = new Error(`HTTP ${r.status}`);
        err.status = r.status;
        throw err; // non-retryable client error
      }
      return await r.json();
    } catch (e) {
      if (e?.status && e.status < 500 && e.status !== 429) throw e; // non-retryable
      lastErr = e; // network error / timeout (AbortError) — retry
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr || new Error('Forespørsel feilet.');
}

function normalizeProduct(h) {
  return {
    ean: h.ean,
    title: h.title,
    subtitle: h.subtitle || '',
    brand: h.brand || '',
    price: typeof h.pricePerUnit === 'number' ? h.pricePerUnit : null,
    image: h.imagePath ? `https://bilder.ngdata.no/${h.imagePath}/medium.jpg` : undefined,
    forSale: h.isForSale !== false && !h.isRevoked && !h.isOutOfStock
  };
}

/** Search MENY's product catalog (anonymous). Returns normalized products. */
export async function searchProducts(query, size = 6) {
  const url =
    `${PRODUCTS_BASE}/api/products/${CHAIN_ID}/${STORE_GLN}/` +
    `?search=${encodeURIComponent(query)}&page=1&page_size=${size}&fieldset=maximal`;
  const data = await fetchJson(url);
  return (data.hits || []).map(normalizeProduct).filter((p) => p.ean);
}

/** Pick the best product for a query: prefer in-stock/for-sale, else first hit. */
function pickBest(products) {
  return products.find((p) => p.forSale) || products[0] || null;
}

/** Create an anonymous MENY shared cart and return its id. */
export async function createSharedCart(cartItems) {
  const data = await fetchJson(
    `${SHARECART_BASE}/handlevogn/delehandlevogn/v1/api/`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cartItems) },
    { retries: 4 }
  );
  if (!data || !data.id) throw new Error('MENY delehandlevogn returnerte ingen id.');
  return data.id;
}

/** Run an async mapper over items with a small concurrency pool. */
async function mapPool(items, concurrency, mapper) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await mapper(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Resolve a list of shopping items to MENY products and create a shared cart.
 * @param {{query:string, quantity:number, name?:string}[]} items
 * @returns {Promise<{url:string,id:string,count:number,matched:object[],unmatched:object[]}>}
 */
export async function buildSharedCart(items) {
  const resolved = await mapPool(items, 3, async (item) => {
    try {
      const products = await searchProducts(item.query, 6);
      const best = pickBest(products);
      if (!best) return { item, product: null };
      return { item, product: best };
    } catch {
      return { item, product: null };
    }
  });

  const matched = [];
  const unmatched = [];
  const byEan = new Map(); // ean -> quantity (merge duplicates)

  for (const { item, product } of resolved) {
    const name = item.name || item.query;
    if (!product) {
      unmatched.push({ name, query: item.query });
      continue;
    }
    const quantity = Math.min(Math.max(parseInt(item.quantity, 10) || 1, 1), 50);
    byEan.set(product.ean, (byEan.get(product.ean) || 0) + quantity);
    matched.push({
      name,
      query: item.query,
      ean: product.ean,
      title: product.title,
      subtitle: product.subtitle,
      brand: product.brand,
      price: product.price,
      image: product.image,
      quantity
    });
  }

  if (byEan.size === 0) {
    const err = new Error('Fant ingen av varene på MENY.');
    err.code = 'NO_MATCHES';
    err.unmatched = unmatched;
    throw err;
  }

  const cartItems = [...byEan.entries()].map(([ean, quantity]) => ({ ean, quantity }));
  const id = await createSharedCart(cartItems);

  return { url: `${SHARE_LINK_BASE}${id}`, id, count: matched.length, matched, unmatched };
}
