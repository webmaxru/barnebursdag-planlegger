import type { AgeBand, Category, GoodItem, LineItem, PartyConfig } from './types';

const BREAD_MARGIN = 0.15; // extra buffer added to BOTH lompe and pølsebrød so neither runs out

export const CATEGORY_ORDER: Category[] = ['mat', 'drikke', 'servise', 'pynt', 'godteri'];

export const CATEGORY_LABEL: Record<Category, string> = {
  mat: 'Mat',
  drikke: 'Drikke',
  servise: 'Servise & utstyr',
  pynt: 'Pynt',
  godteri: 'Godteri & poser'
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  mat: '🍽️', drikke: '🥤', servise: '🍴', pynt: '🎈', godteri: '🍬'
};

export const ALLERGY_LABEL: Record<string, string> = {
  gluten: 'glutenallergi',
  melk: 'melkeallergi',
  egg: 'eggallergi',
  nott: 'nøtteallergi',
  svin: 'uten svin'
};

export function bandForAge(age: number): AgeBand {
  if (age <= 4) return '3-4';
  if (age <= 6) return '5-6';
  return '7-9';
}

const CONTINUOUS = new Set(['dl', 'g', 'ml', 'l', 'kg']);

/** Compute a single shopping line item from an item definition + party config. */
export function computeLineItem(item: GoodItem, cfg: PartyConfig): LineItem | null {
  if (!item.enabled) return null;
  if (cfg.type === 'barnehage' && item.homeOnly) return null;

  if (item.showIf) {
    for (const k of Object.keys(item.showIf)) {
      if ((cfg as any)[k] !== (item.showIf as any)[k]) return null;
    }
  }

  const kids = item.allergyScope ? (cfg.allergies[item.allergyScope] ?? 0) : cfg.guests;
  if (item.allergyScope && kids <= 0) return null;
  const adults = item.allergyScope ? 0 : (item.audience === 'kids' ? 0 : cfg.adults);

  const band = bandForAge(cfg.age);
  let needed = 0;
  switch (item.mode) {
    case 'perChild':
      needed = kids * (item.perChild?.[band] ?? 0) + adults * (item.perChild?.['7-9'] ?? 0);
      break;
    case 'perGuest':
      needed = (kids + adults) * (item.factor ?? 1);
      break;
    case 'perTable':
      needed = Math.ceil((kids + adults) / (item.divisor ?? 8)) * (item.factor ?? 1);
      break;
    case 'ageCount':
      needed = cfg.age + (item.growOn ? 1 : 0);
      break;
    case 'fixed':
      needed = item.fixedQty ?? 1;
      break;
  }
  if (item.breadKind) {
    if (cfg.mainDish !== 'polser') return null;
    const lompeShare = cfg.breadRatio / 100;
    const share = item.breadKind === 'lompe' ? lompeShare : 1 - lompeShare;
    needed = needed * share * (1 + BREAD_MARGIN);
  }
  if (needed <= 0) return null;

  const continuous = CONTINUOUS.has(item.unit.toLowerCase());
  const neededQty = continuous ? Math.round(needed * 10) / 10 : Math.ceil(needed);

  let packs: number | undefined;
  let buyQty: number | undefined;
  let priceMin: number | undefined;
  let priceMax: number | undefined;

  if (item.packSize && item.packSize > 0) {
    packs = Math.ceil(needed / item.packSize);
    buyQty = packs * item.packSize;
    if (item.priceMinNok != null) priceMin = packs * item.priceMinNok;
    if (item.priceMaxNok != null) priceMax = packs * item.priceMaxNok;
  } else {
    if (item.priceMinNok != null) priceMin = item.priceMinNok;
    if (item.priceMaxNok != null) priceMax = item.priceMaxNok;
  }

  const notes: string[] = [];
  if (item.allergyScope) {
    notes.push(`Trygt for ${kids} gjester (${ALLERGY_LABEL[item.allergyScope] ?? item.allergyScope})`);
  }
  if (item.altNote && item.allergyTags?.some((tag) => (cfg.allergies[tag] ?? 0) > 0)) {
    notes.push(item.altNote);
  }

  return {
    id: item.id,
    name: item.name,
    emoji: item.emoji,
    category: item.category,
    neededQty,
    unit: item.unit,
    packs,
    buyQty,
    packUnit: item.packUnit,
    priceMin,
    priceMax,
    note: notes.join(' '),
    kassalSearch: item.kassalSearch
  };
}

export interface PlanResult {
  groups: { category: Category; items: LineItem[] }[];
  itemCount: number;
  priceMin: number;
  priceMax: number;
  hasPrice: boolean;
}

export function computePlan(catalog: GoodItem[], cfg: PartyConfig): PlanResult {
  const byCat = new Map<Category, LineItem[]>();
  let priceMin = 0;
  let priceMax = 0;
  let hasPrice = false;
  let itemCount = 0;

  for (const item of catalog) {
    const li = computeLineItem(item, cfg);
    if (!li) continue;
    itemCount++;
    if (li.priceMin != null) {
      priceMin += li.priceMin;
      priceMax += li.priceMax ?? li.priceMin;
      hasPrice = true;
    }
    if (!byCat.has(li.category)) byCat.set(li.category, []);
    byCat.get(li.category)!.push(li);
  }

  const groups = CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
    category: c,
    items: byCat.get(c)!
  }));

  return { groups, itemCount, priceMin, priceMax, hasPrice };
}

/** Suggested guest count from the Norwegian "guests = age (+1)" convention. */
export function suggestedGuests(age: number): number {
  return Math.min(Math.max(age + 1, 2), 40);
}
