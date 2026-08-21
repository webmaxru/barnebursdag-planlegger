import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiHandlers from '../api/shared/handlers.cjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, '..', 'dist');
const {
  getHealthResponse,
  getKassalProductsResponse,
  getMenyCartResponse
} = apiHandlers;

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

function sendApiResponse(res, result) {
  res.set(result.headers);
  return res.status(result.status).json(result.body);
}

// Local development and E2E adapter for the same handlers deployed as managed Functions.
app.get('/api/health', (_req, res) => {
  sendApiResponse(res, getHealthResponse());
});

app.get('/api/kassal/products', async (req, res) => {
  sendApiResponse(res, await getKassalProductsResponse(req.query));
});

app.post('/api/meny/cart', async (req, res) => {
  sendApiResponse(res, await getMenyCartResponse(req.body));
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Fant ikke API-endepunktet.' });
});

// --- Static SPA ---
app.use(express.static(DIST, { maxAge: '1h', index: false }));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => {
  console.log(`🎂 Kakeklar kjører på http://0.0.0.0:${PORT}  (kassal: ${process.env.KASSAL_API_KEY ? 'på' : 'av'})`);
});
