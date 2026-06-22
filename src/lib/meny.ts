import type { PlanResult } from './engine';
import { getAppConfig } from './config';

export interface MenyMatchedItem {
  name: string;
  query: string;
  ean: string;
  title: string;
  subtitle: string;
  brand: string;
  price: number | null;
  image?: string;
  quantity: number;
}

export interface MenyUnmatchedItem {
  name: string;
  query: string;
}

export interface MenyCartResult {
  url: string;
  id: string;
  count: number;
  matched: MenyMatchedItem[];
  unmatched: MenyUnmatchedItem[];
}

export interface MenyCartRequestItem {
  query: string;
  quantity: number;
  name: string;
}

interface MenyResolveResult {
  cartItems: { ean: string; quantity: number }[];
  count: number;
  matched: MenyMatchedItem[];
  unmatched: MenyUnmatchedItem[];
}

// meny.no's own (anonymous, CORS-open) shared-cart endpoint. We create the cart
// straight from the browser so it uses the user's own IP — the endpoint rate-limits
// per source IP, which would otherwise throttle a shared server egress IP.
const SYLINDER_CREATE_URL = 'https://api.sylinder.no/handlevogn/delehandlevogn/v1/api/';
const SHARE_LINK_BASE = 'https://meny.no/delt-handlevogn/';

const CONTINUOUS = new Set(['g', 'dl', 'ml', 'l', 'kg']);

// Capture the ?meny preview flag at module load — before the app rewrites the
// URL with config params (which would otherwise drop it).
const PREVIEW = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('meny');

/** Whether the experimental "Handle på MENY" feature is enabled (server flag or ?meny preview). */
export async function isMenyEnabled(): Promise<boolean> {
  if (PREVIEW) return true;
  const cfg = await getAppConfig();
  return Boolean(cfg?.features?.menyCart);
}

/** Turn the computed plan into MENY search requests (only items with a grocery search term). */
export function planToMenyItems(plan: PlanResult): MenyCartRequestItem[] {
  const items: MenyCartRequestItem[] = [];
  for (const group of plan.groups) {
    for (const it of group.items) {
      if (!it.kassalSearch) continue; // no useful grocery match -> skip
      const continuous = CONTINUOUS.has(it.unit.toLowerCase());
      const quantity = Math.min(Math.max(it.packs ?? (continuous ? 1 : Math.ceil(it.neededQty)), 1), 50);
      items.push({ query: it.kassalSearch, quantity, name: it.name });
    }
  }
  return items;
}

/**
 * Resolve the list to real MENY products (via our server) and create a shareable
 * cart link directly against meny.no's anonymous endpoint from the browser.
 */
export async function createMenyCart(items: MenyCartRequestItem[]): Promise<MenyCartResult> {
  // 1) Resolve catalog items -> real MENY products/EANs on our server.
  const r = await fetch('/api/meny/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `Feil ${r.status}`);
  }
  const resolved: MenyResolveResult = await r.json();

  // 2) Create the shared cart from the browser (user's own IP) -> { id }.
  const cr = await fetch(SYLINDER_CREATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolved.cartItems)
  });
  if (cr.status === 429) {
    const info = await cr.json().catch(() => ({} as { message?: string }));
    const secs = /(\d+)\s*second/i.exec(info?.message || '')?.[1];
    throw new Error(secs ? `MENY har en grense – prøv igjen om ~${secs} sekunder.` : 'MENY har en grense – prøv igjen om litt.');
  }
  if (!cr.ok) throw new Error('Kunne ikke lage MENY-handlevogn akkurat nå.');
  const created = await cr.json().catch(() => ({} as { id?: string }));
  if (!created?.id) throw new Error('MENY returnerte ingen handlevogn.');

  return {
    url: `${SHARE_LINK_BASE}${created.id}`,
    id: created.id,
    count: resolved.count,
    matched: resolved.matched,
    unmatched: resolved.unmatched
  };
}
