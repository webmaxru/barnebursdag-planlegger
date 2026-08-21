const { DEFAULT_RESOLVE_TIMEOUT_MS, resolveItems } = require('./meny.cjs');

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function response(status, body, headers = {}) {
  return {
    status,
    headers: { ...JSON_HEADERS, ...headers },
    body
  };
}

function getHealthResponse({ env = process.env, now = () => new Date() } = {}) {
  return response(200, {
    status: 'ok',
    kassal: Boolean(env.KASSAL_API_KEY),
    time: now().toISOString()
  });
}

async function getKassalProductsResponse(
  query,
  { env = process.env, fetchImpl = globalThis.fetch, timeoutMs = 15_000 } = {}
) {
  const apiKey = env.KASSAL_API_KEY || '';
  if (!apiKey) {
    return response(503, { error: 'Prisoppslag er ikke konfigurert (mangler KASSAL_API_KEY).' });
  }

  const search = String(query?.search || '').trim().slice(0, 100);
  const size = Math.min(Math.max(parseInt(String(query?.size || '5'), 10) || 5, 1), 20);
  if (!search) return response(400, { error: 'Mangler søkeord (?search).' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://kassal.app/api/v1/products?search=${encodeURIComponent(search)}&size=${size}`;
    const upstream = await fetchImpl(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}` }
    });

    if (!upstream.ok) {
      return response(upstream.status, { error: `Kassal svarte ${upstream.status}.` });
    }

    const data = await upstream.json();
    const products = (Array.isArray(data?.data) ? data.data : []).map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      store: product.store?.name,
      price: product.current_price,
      unitPrice: product.current_unit_price,
      image: product.image,
      url: product.url,
      weight: product.weight,
      weightUnit: product.weight_unit
    }));

    return response(
      200,
      { search, count: products.length, products },
      { 'Cache-Control': 'public, max-age=3600' }
    );
  } catch {
    return response(502, { error: 'Kunne ikke nå Kassal.app.' });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeMenyItems(body) {
  const raw = Array.isArray(body?.items) ? body.items : [];
  return raw
    .map((item) => ({
      query: String(item?.query || '').trim().slice(0, 100),
      quantity: Math.min(Math.max(parseInt(item?.quantity, 10) || 1, 1), 50),
      name: String(item?.name || '').trim().slice(0, 80)
    }))
    .filter((item) => item.query)
    .slice(0, 40);
}

async function getMenyCartResponse(
  body,
  {
    resolver = resolveItems,
    env = process.env,
    fetchImpl = globalThis.fetch,
    logger = console,
    timeoutMs = DEFAULT_RESOLVE_TIMEOUT_MS
  } = {}
) {
  const items = normalizeMenyItems(body);
  if (!items.length) return response(400, { error: 'Ingen varer å legge i handlevognen.' });

  try {
    const result = await resolver(items, { env, fetchImpl, logger, timeoutMs });
    return response(200, result, { 'Cache-Control': 'no-store' });
  } catch (error) {
    if (error?.code === 'NO_MATCHES') {
      const partial = Boolean(error.partial);
      return response(partial ? 504 : 422, {
        error: partial ? 'MENY-oppslaget tok for lang tid. Prøv igjen.' : 'Fant ingen av varene på MENY.',
        unmatched: error.unmatched || [],
        partial
      });
    }

    logger.error('[meny] /api/meny/cart failed:', error?.status || '', error?.message || error);
    return response(502, { error: 'Kunne ikke finne varene på MENY akkurat nå.' });
  }
}

module.exports = {
  getHealthResponse,
  getKassalProductsResponse,
  getMenyCartResponse,
  normalizeMenyItems
};
