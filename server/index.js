import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveItems } from './meny.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 8080;
const KASSAL_API_KEY = process.env.KASSAL_API_KEY || '';
const APPINSIGHTS_CONNECTION_STRING = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || '';
// Experimental "Handle på MENY" (shared cart) feature — hidden unless enabled.
const FEATURE_MENY_CART = /^(1|true|on|yes)$/i.test(process.env.FEATURE_MENY_CART || '');
const DIST = path.join(__dirname, '..', 'dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// --- Health probe (used by Azure Container Apps) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', kassal: Boolean(KASSAL_API_KEY), analytics: Boolean(APPINSIGHTS_CONNECTION_STRING), menyCart: FEATURE_MENY_CART, time: new Date().toISOString() });
});

// --- Runtime client config (cookieless Application Insights connection string + feature flags) ---
app.get('/api/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    appInsights: APPINSIGHTS_CONNECTION_STRING ? { connectionString: APPINSIGHTS_CONNECTION_STRING } : null,
    features: { menyCart: FEATURE_MENY_CART }
  });
});

// --- Kassal.app price proxy (keeps the API key server-side) ---
app.get('/api/kassal/products', async (req, res) => {
  if (!KASSAL_API_KEY) {
    return res.status(503).json({ error: 'Prisoppslag er ikke konfigurert (mangler KASSAL_API_KEY).' });
  }
  const search = String(req.query.search || '').trim().slice(0, 100);
  const size = Math.min(Math.max(parseInt(String(req.query.size || '5'), 10) || 5, 1), 20);
  if (!search) return res.status(400).json({ error: 'Mangler søkeord (?search).' });

  try {
    const url = `https://kassal.app/api/v1/products?search=${encodeURIComponent(search)}&size=${size}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${KASSAL_API_KEY}` } });
    if (!r.ok) return res.status(r.status).json({ error: `Kassal svarte ${r.status}.` });
    const data = await r.json();
    const products = (data.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      store: p.store?.name,
      price: p.current_price,
      unitPrice: p.current_unit_price,
      image: p.image,
      url: p.url,
      weight: p.weight,
      weightUnit: p.weight_unit
    }));
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ search, count: products.length, products });
  } catch {
    res.status(502).json({ error: 'Kunne ikke nå Kassal.app.' });
  }
});

// --- MENY shared-cart builder (EXPERIMENTAL, see server/meny.js) ---
// Resolves a shopping list to real MENY products and returns the cart items.
// The browser then creates the shared cart from the user's own IP (the create
// endpoint rate-limits per IP, so it must NOT be funnelled through the server).
app.post('/api/meny/cart', async (req, res) => {
  const raw = Array.isArray(req.body?.items) ? req.body.items : [];
  const items = raw
    .map((it) => ({
      query: String(it?.query || '').trim().slice(0, 100),
      quantity: Math.min(Math.max(parseInt(it?.quantity, 10) || 1, 1), 50),
      name: String(it?.name || '').trim().slice(0, 80)
    }))
    .filter((it) => it.query)
    .slice(0, 40);

  if (!items.length) return res.status(400).json({ error: 'Ingen varer å legge i handlevognen.' });

  try {
    const result = await resolveItems(items);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  } catch (e) {
    if (e?.code === 'NO_MATCHES') {
      return res.status(422).json({ error: 'Fant ingen av varene på MENY.', unmatched: e.unmatched || [] });
    }
    console.error('[meny] /api/meny/cart failed:', e?.status || '', e?.message || e);
    res.status(502).json({ error: 'Kunne ikke finne varene på MENY akkurat nå.' });
  }
});

// --- Static SPA ---
app.use(express.static(DIST, { maxAge: '1h', index: false }));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => {
  console.log(`🎂 Kakeklar kjører på http://0.0.0.0:${PORT}  (kassal: ${KASSAL_API_KEY ? 'på' : 'av'})`);
});
