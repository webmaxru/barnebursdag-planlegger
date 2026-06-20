import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 8080;
const KASSAL_API_KEY = process.env.KASSAL_API_KEY || '';
const DIST = path.join(__dirname, '..', 'dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// --- Health probe (used by Azure Container Apps) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', kassal: Boolean(KASSAL_API_KEY), time: new Date().toISOString() });
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

// --- Static SPA ---
app.use(express.static(DIST, { maxAge: '1h', index: false }));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => {
  console.log(`🎂 Barnebursdag-planlegger kjører på http://0.0.0.0:${PORT}  (kassal: ${KASSAL_API_KEY ? 'på' : 'av'})`);
});
