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

/** Resolve the list to real MENY products and create a shareable cart link. */
export async function createMenyCart(items: MenyCartRequestItem[]): Promise<MenyCartResult> {
  const r = await fetch('/api/meny/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `Feil ${r.status}`);
  }
  return r.json();
}
