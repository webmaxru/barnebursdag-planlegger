export type Category = 'mat' | 'drikke' | 'servise' | 'pynt' | 'godteri';
export type AgeBand = '3-4' | '5-6' | '7-9';
export type CalcMode = 'perChild' | 'perGuest' | 'perTable' | 'ageCount' | 'fixed';
export type MainDish = 'polser' | 'pizza';

/**
 * A purchasable item in the configurable goods catalog.
 * The calculation `mode` decides how the needed quantity is derived from the
 * party config; `packSize` (if set) rounds the needed amount up to whole packs.
 */
export interface GoodItem {
  id: string;
  name: string;
  emoji?: string;
  category: Category;
  unit: string;                          // 'stk', 'dl', 'g', 'sett', 'pakke', 'boks'
  mode: CalcMode;
  perChild?: Record<AgeBand, number>;    // mode 'perChild': qty = guests * perChild[band]
  factor?: number;                       // mode 'perGuest'/'perTable': multiplier (default 1)
  divisor?: number;                      // mode 'perTable': guests per unit (default 8)
  growOn?: boolean;                      // mode 'ageCount': add 1 ("en å vokse på")
  fixedQty?: number;                     // mode 'fixed': constant quantity (default 1)
  packSize?: number;                     // items per purchasable pack
  packUnit?: string;                     // human label, e.g. 'pakke (8 stk)'
  priceMinNok?: number;                  // price per pack (or per item if no packSize)
  priceMaxNok?: number;
  homeOnly?: boolean;                    // hidden in barnehage (kindergarten) mode
  allergyTags?: string[];                // e.g. ['svin','gluten','melk']
  allergyScope?: string;                 // allergy-safe item scoped to affected kids
  altNote?: string;                      // shown when an allergy filter matches
  kassalSearch?: string;                 // search term for live Kassal.app prices
  audience?: 'all' | 'kids';             // 'all' = kids+adults eat it; 'kids' = kids only
  showIf?: Partial<{ mainDish: MainDish; pinata: boolean }>;
  breadKind?: 'lompe' | 'polsebrod';     // scaled by breadRatio + margin when mainDish==='polser'
  enabled: boolean;
}

export interface PartyConfig {
  age: number;                           // 1..14
  guests: number;                        // 1..40 (kids)
  adults: number;                        // 0..20 (accompanying adults / parents who stay)
  type: 'hjemme' | 'barnehage';
  duration: number;                      // 1..5 hours
  allergies: Record<string, number>;
  mainDish: MainDish;
  breadRatio: number;                    // 0..100 = percent that is LOMPE (rest is pølsebrød). Default 50.
  pinata: boolean;                       // optional add-on; godteposer is always included. Default false.
}

export interface LineItem {
  id: string;
  name: string;
  emoji?: string;
  category: Category;
  neededQty: number;
  unit: string;
  packs?: number;
  buyQty?: number;
  packUnit?: string;
  priceMin?: number;
  priceMax?: number;
  note?: string;
  kassalSearch?: string;
}
