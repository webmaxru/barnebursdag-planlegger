const PRODUCTS_BASE = 'https://platform-rest-prod.ngdata.no';
const ORIGIN = 'https://meny.no';
const DEFAULT_RESOLVE_TIMEOUT_MS = 30_000;
const MAX_RESOLVE_TIMEOUT_MS = 32_000;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BROWSERISH_HEADERS = {
  'User-Agent': UA,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,en;q=0.7',
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function deadlineError() {
  const error = new Error('MENY-oppslaget brukte for lang tid.');
  error.code = 'DEADLINE_EXCEEDED';
  return error;
}

async function waitForRetry(ms, deadlineAt) {
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) throw deadlineError();
  await sleep(Math.min(ms, remaining));
  if (Date.now() >= deadlineAt) throw deadlineError();
}

async function fetchJson(
  url,
  options = {},
  {
    timeoutMs = 7_000,
    retries = 2,
    label = 'request',
    deadlineAt = Date.now() + DEFAULT_RESOLVE_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    logger = console
  } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) {
      await waitForRetry(Math.min(400 * 2 ** (attempt - 1), 2_000), deadlineAt);
    }

    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) throw deadlineError();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1, Math.min(timeoutMs, remaining)));

    try {
      const response = await fetchImpl(url, {
        ...options,
        signal: controller.signal,
        headers: { ...BROWSERISH_HEADERS, ...(options.headers || {}) }
      });

      if (response.status === 429 || response.status >= 500) {
        const body = await response.text().catch(() => '');
        lastError = new Error(`HTTP ${response.status} ${body.slice(0, 160)}`);
        lastError.status = response.status;
        continue;
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const error = new Error(`HTTP ${response.status} ${body.slice(0, 160)}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error?.status && error.status < 500 && error.status !== 429) throw error;
      lastError = Date.now() >= deadlineAt ? deadlineError() : error;
      if (lastError.code === 'DEADLINE_EXCEEDED') break;
    } finally {
      clearTimeout(timer);
    }
  }

  logger.error(
    `[meny] ${label} failed:`,
    lastError?.status || '',
    lastError?.message || String(lastError)
  );
  throw lastError || new Error('Forespørsel feilet.');
}

function normalizeProduct(hit) {
  return {
    ean: hit.ean,
    title: hit.title,
    subtitle: hit.subtitle || '',
    brand: hit.brand || '',
    price: typeof hit.pricePerUnit === 'number' ? hit.pricePerUnit : null,
    image: hit.imagePath ? `https://bilder.ngdata.no/${hit.imagePath}/medium.jpg` : undefined,
    forSale: hit.isForSale !== false && !hit.isRevoked && !hit.isOutOfStock,
    raw: hit
  };
}

function toCartItem(product, quantity) {
  const pricePerUnit = typeof product.pricePerUnit === 'number' ? product.pricePerUnit : 0;
  return {
    ean: product.ean,
    quantity,
    product,
    pricePerUnit,
    linePrice: Math.round(pricePerUnit * quantity * 100) / 100,
    comparePricePerUnit: product.comparePricePerUnit ?? null
  };
}

async function searchProducts(
  query,
  size = 6,
  { deadlineAt, fetchImpl = globalThis.fetch, logger = console, env = process.env } = {}
) {
  const chainId = env.MENY_CHAIN_ID || '1300';
  const storeGln = env.MENY_STORE_GLN || '7080001150488';
  const url =
    `${PRODUCTS_BASE}/api/products/${chainId}/${storeGln}/` +
    `?search=${encodeURIComponent(query)}&page=1&page_size=${size}&fieldset=maximal`;
  const data = await fetchJson(url, {}, { deadlineAt, fetchImpl, logger, label: `search:${query}` });
  return (Array.isArray(data?.hits) ? data.hits : []).map(normalizeProduct).filter((product) => product.ean);
}

function pickBest(products) {
  return products.find((product) => product.forSale) || products[0] || null;
}

async function resolveItems(
  items,
  {
    timeoutMs = DEFAULT_RESOLVE_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    logger = console,
    env = process.env
  } = {}
) {
  const boundedTimeout = Math.min(Math.max(Number(timeoutMs) || DEFAULT_RESOLVE_TIMEOUT_MS, 10), MAX_RESOLVE_TIMEOUT_MS);
  const deadlineAt = Date.now() + boundedTimeout;
  const results = items.map((item) => ({ item, product: null }));
  let nextIndex = 0;
  let timedOut = false;

  const workers = Array.from({ length: Math.min(3, items.length) }, async () => {
    while (nextIndex < items.length) {
      if (Date.now() >= deadlineAt) {
        timedOut = true;
        return;
      }

      const index = nextIndex;
      nextIndex += 1;

      try {
        const products = await searchProducts(items[index].query, 6, {
          deadlineAt,
          fetchImpl,
          logger,
          env
        });
        results[index] = { item: items[index], product: pickBest(products) };
      } catch (error) {
        if (error?.code === 'DEADLINE_EXCEEDED' || error?.name === 'AbortError') timedOut = true;
      }
    }
  });

  await Promise.all(workers);
  if (Date.now() >= deadlineAt && nextIndex < items.length) timedOut = true;

  const matched = [];
  const unmatched = [];
  const byEan = new Map();

  for (const { item, product } of results) {
    const name = item.name || item.query;
    if (!product) {
      unmatched.push({ name, query: item.query });
      continue;
    }

    const quantity = Math.min(Math.max(parseInt(item.quantity, 10) || 1, 1), 50);
    const existing = byEan.get(product.ean);
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, 50);
    else byEan.set(product.ean, { product: product.raw, quantity });

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
    const error = new Error('Fant ingen av varene på MENY.');
    error.code = 'NO_MATCHES';
    error.unmatched = unmatched;
    error.partial = timedOut;
    throw error;
  }

  const cartItems = [...byEan.values()].map(({ product, quantity }) => toCartItem(product, quantity));
  return {
    cartItems,
    count: matched.length,
    matched,
    unmatched,
    partial: timedOut
  };
}

module.exports = {
  DEFAULT_RESOLVE_TIMEOUT_MS,
  resolveItems,
  searchProducts
};
