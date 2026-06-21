import type { GoodItem, PartyConfig } from './types';
import { DEFAULT_CATALOG, CATALOG_VERSION } from './catalog';

const CATALOG_KEY = 'bb.catalog';
const VERSION_KEY = 'bb.catalog.version';

const clone = <T,>(x: T): T =>
  typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x));

// ---------------- Catalog persistence ----------------
export function loadCatalog(): GoodItem[] {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    const raw = localStorage.getItem(CATALOG_KEY);
    if (v === String(CATALOG_VERSION) && raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed as GoodItem[];
    }
  } catch {
    /* ignore */
  }
  return clone(DEFAULT_CATALOG);
}

export function saveCatalog(cat: GoodItem[]): void {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(cat));
    localStorage.setItem(VERSION_KEY, String(CATALOG_VERSION));
  } catch {
    /* ignore */
  }
}

export function resetCatalog(): GoodItem[] {
  try {
    localStorage.removeItem(CATALOG_KEY);
    localStorage.removeItem(VERSION_KEY);
  } catch {
    /* ignore */
  }
  return clone(DEFAULT_CATALOG);
}

export function exportCatalog(cat: GoodItem[]): string {
  return JSON.stringify({ version: CATALOG_VERSION, items: cat }, null, 2);
}

export function importCatalog(json: string): GoodItem[] {
  const parsed = JSON.parse(json);
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items)) throw new Error('Ugyldig fil: fant ingen varer.');
  return items as GoodItem[];
}

// ---------------- URL / config state ----------------
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function parseConfig(): PartyConfig {
  const p = new URLSearchParams(location.search);
  const num = (k: string, d: number) => {
    const v = parseInt(p.get(k) || '', 10);
    return Number.isFinite(v) ? v : d;
  };
  const allergies: Record<string, number> = {};
  (p.get('allergi') || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((part) => {
    const [id, cnt] = part.split(':');
    const n = parseInt(cnt ?? '1', 10);
    if (id && Number.isFinite(n) && n > 0) allergies[id] = n;
  });
  return {
    age: clamp(num('alder', 6), 1, 14),
    guests: clamp(num('gjester', 12), 1, 40),
    adults: clamp(num('voksne', 0), 0, 20),
    type: p.get('type') === 'barnehage' ? 'barnehage' : 'hjemme',
    duration: clamp(num('varighet', 2), 1, 5),
    allergies,
    mainDish: p.get('rett') === 'pizza' ? 'pizza' : 'polser',
    sausageBread: p.get('brod') === 'polsebrod' ? 'polsebrod' : 'lompe',
    treatBag: p.get('pose') === 'pinata' ? 'pinata' : 'godteposer'
  };
}

function toParams(cfg: PartyConfig): URLSearchParams {
  const p = new URLSearchParams();
  p.set('gjester', String(cfg.guests));
  p.set('alder', String(cfg.age));
  if (cfg.adults > 0) p.set('voksne', String(cfg.adults));
  if (cfg.type !== 'hjemme') p.set('type', cfg.type);
  const allergies = Object.entries(cfg.allergies)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}:${n}`)
    .join(',');
  if (allergies) p.set('allergi', allergies);
  if (cfg.duration !== 2) p.set('varighet', String(cfg.duration));
  if (cfg.mainDish !== 'polser') p.set('rett', cfg.mainDish);
  if (cfg.sausageBread !== 'lompe') p.set('brod', cfg.sausageBread);
  if (cfg.treatBag !== 'godteposer') p.set('pose', cfg.treatBag);
  return p;
}

export function writeConfig(cfg: PartyConfig): void {
  const url = `${location.pathname}?${toParams(cfg).toString()}`;
  history.replaceState({}, '', url);
}

export function shareUrl(cfg: PartyConfig): string {
  return `${location.origin}${location.pathname}?${toParams(cfg).toString()}`;
}
