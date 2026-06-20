export interface KassalProduct {
  id: number;
  name: string;
  brand?: string;
  store?: string;
  price?: number;
  unitPrice?: number;
  image?: string;
  url?: string;
  weight?: number;
  weightUnit?: string;
}

export interface KassalResponse {
  search: string;
  count: number;
  products: KassalProduct[];
}

/** Fetch live Norwegian grocery prices via the server-side Kassal.app proxy. */
export async function fetchPrices(search: string, size = 5): Promise<KassalResponse> {
  const r = await fetch(`/api/kassal/products?search=${encodeURIComponent(search)}&size=${size}`);
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `Feil ${r.status}`);
  }
  return r.json();
}
