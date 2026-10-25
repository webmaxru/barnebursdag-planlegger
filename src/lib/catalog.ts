import type { GoodItem } from './types';

/** Bump when the default catalog shape/content changes (invalidates saved copies). */
export const CATALOG_VERSION = 9;

/**
 * Where the default prices come from. Items with `priceSource: 'oda'` use ordinary
 * (non-sale) prices from the online grocer Oda, collected on PRICE_SOURCE.date:
 * the lower bound is the cheapest suitable product, the upper bound a known brand.
 * Items without `priceSource` are not sold at Oda and keep a rough estimate.
 */
export const PRICE_SOURCE = {
  store: 'Oda',
  kind: 'ordinære priser',
  date: '2026-10-25',
  label: 'Priser: Oda, ordinære priser 25.10.2026'
} as const;

/**
 * Default Norwegian barnebursdag goods catalog.
 * Quantities are grounded in research (Matvaretabellen portion anchors,
 * Festmagasinet/Oda pack sizes) but are fully editable by the user in the app.
 */
export const DEFAULT_CATALOG: GoodItem[] = [
  // ---------------- MAT ----------------
  {
    id: 'polser', name: 'Pølser', emoji: '🌭', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    // Sold by weight. Oda packs that state both count and weight run 62–80 g per
    // sausage, so a 600 g pack is counted as 8 (75 g each). Gilde Go' & Magrere
    // 600 g 39,00 – Gilde Grillpølser 600 g 64,90.
    packSize: 8, packWeightG: 600, packUnit: 'pakke (600 g ≈ 8 stk)', priceMinNok: 39, priceMaxNok: 64.9,
    priceSource: 'oda', allergyTags: ['svin'], altNote: 'Bytt til kyllingpølse for halal / uten svin.',
    kassalSearch: 'grillpølse', showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'lomper', name: 'Lomper', emoji: '🫓', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    // Vår Laveste Pris frosne lomper 10 stk 10,90 – Buer Lomper Original 10 stk 17,20.
    packSize: 10, packUnit: 'pakke (10 stk)', priceMinNok: 10.9, priceMaxNok: 17.2, priceSource: 'oda',
    kassalSearch: 'lomper', showIf: { mainDish: 'polser' }, breadKind: 'lompe', enabled: true
  },
  {
    id: 'polsebrod', name: 'Pølsebrød', emoji: '🥖', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    // Prima Lavpris 12 stk 18,90 – Hatting grove pølsebrød 10 stk 26,70 (counted as 10).
    packSize: 10, packUnit: 'pakke (10–12 stk)', priceMinNok: 18.9, priceMaxNok: 26.7, priceSource: 'oda',
    kassalSearch: 'pølsebrød', showIf: { mainDish: 'polser' }, breadKind: 'polsebrod', enabled: true
  },
  {
    id: 'pizza', name: 'Minipizza', emoji: '🍕', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    packSize: 8, packUnit: 'pizza (~8 stk)', priceMinNok: 40, priceMaxNok: 80,
    kassalSearch: 'minipizza', showIf: { mainDish: 'pizza' }, enabled: true
  },
  {
    id: 'ketchup', name: 'Ketchup', emoji: '🍅', category: 'mat', unit: 'flaske',
    // Idun Tomatketchup 530 g 26,90 – Heinz Tomatketchup 1 kg 54,40.
    mode: 'perTable', divisor: 20, packSize: 1, packUnit: 'flaske (530 g–1 kg)',
    priceMinNok: 26.9, priceMaxNok: 54.4, priceSource: 'oda', kassalSearch: 'ketchup',
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'sennep', name: 'Sennep', emoji: '🟡', category: 'mat', unit: 'tube',
    // Idun Pølsesennep 490 g 22,90 – Bergbys Sennep 510 g 29,90.
    mode: 'perTable', divisor: 25, packSize: 1, packUnit: 'tube (ca. 500 g)',
    priceMinNok: 22.9, priceMaxNok: 29.9, priceSource: 'oda', kassalSearch: 'pølsesennep',
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'stektlok', name: 'Stekt løk', emoji: '🧅', category: 'mat', unit: 'boks',
    // Prima Lavpris sprøstekt løk 100 g 9,90 – Ps sprøstekt løk 100 g 19,70.
    mode: 'perTable', divisor: 15, packSize: 1, packUnit: 'boks (100 g)',
    priceMinNok: 9.9, priceMaxNok: 19.7, priceSource: 'oda', kassalSearch: 'sprøstekt løk',
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'gluten-brod', name: 'Glutenfri lompe/brød', emoji: '🫓', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    // Engers Lefsebakeri glutenfrie lomper 6 stk 32,50 (the only one at Oda).
    packSize: 6, packUnit: 'pakke (6 stk)', priceMinNok: 32.5, priceMaxNok: 32.5, priceSource: 'oda',
    allergyScope: 'gluten', kassalSearch: 'glutenfri lompe',
    // Stands in for lomper/pølsebrød, so only when pølser are on the menu.
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'svin-polser', name: 'Kyllingpølser (uten svin)', emoji: '🌭', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    // Åkeberg Skoglunn grillpølse kylling 6 stk/400 g 42,90; Solvinge 460 g 33,60
    // (weight only, counted as 6).
    packSize: 6, packWeightG: 400, packUnit: 'pakke (400–460 g ≈ 6 stk)', priceMinNok: 33.6, priceMaxNok: 42.9,
    priceSource: 'oda', allergyScope: 'svin', kassalSearch: 'grillpølser kylling',
    // Stands in for the pork pølser, so only when pølser are on the menu.
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'kake', name: 'Bursdagskake', emoji: '🎂', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1, '5-6': 1, '7-9': 1.25 },
    packSize: 20, packUnit: 'kake (~20 biter)', priceMinNok: 150, priceMaxNok: 250,
    homeOnly: true, allergyTags: ['gluten', 'melk', 'egg'],
    altNote: 'Se glutenfri/melkefri kakemiks (Toro/Regal).',
    kassalSearch: 'sjokoladekake', enabled: true
  },
  {
    id: 'iskake', name: 'Iskake', emoji: '🍦', category: 'mat', unit: 'stk',
    mode: 'perTable', divisor: 10, packSize: 1, packUnit: 'iskake (~6–8 biter)',
    priceMinNok: 99, priceMaxNok: 199, homeOnly: true,
    allergyTags: ['melk', 'nott', 'egg'],
    altNote: 'Sjekk allergener – mange iskaker inneholder melk, egg eller nøtter.',
    kassalSearch: 'iskake', enabled: true
  },
  {
    id: 'gluten-kake', name: 'Glutenfri kake/muffins', emoji: '🧁', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1, '5-6': 1, '7-9': 1 },
    packSize: 12, packUnit: 'pakke (12 stk)', priceMinNok: 49, priceMaxNok: 79,
    homeOnly: true, allergyScope: 'gluten', kassalSearch: 'glutenfri muffins', enabled: true
  },
  {
    id: 'melk-kake', name: 'Melkefri kake/muffins', emoji: '🧁', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1, '5-6': 1, '7-9': 1 },
    packSize: 12, packUnit: 'pakke (12 stk)', priceMinNok: 49, priceMaxNok: 79,
    homeOnly: true, allergyScope: 'melk', kassalSearch: 'melkefri muffins', enabled: true
  },
  {
    id: 'egg-bakst', name: 'Eggfri bakst', emoji: '🧁', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1, '5-6': 1, '7-9': 1 },
    packSize: 12, packUnit: 'pakke (12 stk)', priceMinNok: 49, priceMaxNok: 79,
    homeOnly: true,     allergyScope: 'egg', kassalSearch: 'vegansk sjokoladekake', enabled: true
  },
  {
    id: 'frukt', name: 'Frukt (oppkuttet)', emoji: '🍓', category: 'mat', unit: 'g',
    mode: 'perChild', perChild: { '3-4': 120, '5-6': 130, '7-9': 140 },
    kassalSearch: 'grønne druer', enabled: true
  },
  {
    id: 'snacks', name: 'Snacks / potetgull', emoji: '🥨', category: 'mat', unit: 'g',
    mode: 'perChild', perChild: { '3-4': 30, '5-6': 35, '7-9': 40 },
    // KiMs Salt crunch 200 g 37,20 – Maarud classic salt 240 g 41,90 (counted as 200 g).
    packSize: 200, packUnit: 'pose (200–240 g)', priceMinNok: 37.2, priceMaxNok: 41.9, priceSource: 'oda',
    homeOnly: true, kassalSearch: 'potetgull', enabled: true
  },

  // ---------------- DRIKKE ----------------
  {
    id: 'saft', name: 'Saft (konsentrat)', emoji: '🧃', category: 'drikke', unit: 'dl',
    mode: 'perChild', perChild: { '3-4': 4, '5-6': 5, '7-9': 6 },
    // 1,5 l bottles. Prima Lavpris husholdningssaft 36,40 (Oda: makes 9 l) –
    // Lerum uten tilsatt sukker 69,40 (1 + 4, makes 7,5 l). Counted as 7,5 l.
    packSize: 75, packUnit: 'flaske (1,5 l ≈ 7,5–9 l ferdig)', priceMinNok: 36.4, priceMaxNok: 69.4,
    priceSource: 'oda', kassalSearch: 'husholdningssaft', enabled: true
  },
  {
    id: 'brus', name: 'Brus (7+ år)', emoji: '🥤', category: 'drikke', unit: 'boks',
    mode: 'perChild', perChild: { '3-4': 0, '5-6': 0, '7-9': 1 },
    // Solo Super 10 × 0,33 l 89,00 – Coca-Cola 10 × 0,33 l 97,40.
    packSize: 10, packUnit: '10-pk (0,33 l)', priceMinNok: 89, priceMaxNok: 97.4, priceSource: 'oda',
    homeOnly: true, kassalSearch: 'Solo', enabled: true
  },

  // ---------------- SERVISE ----------------
  {
    id: 'tallerkener', name: 'Tallerkener (papp)', emoji: '🍽️', category: 'servise', unit: 'stk',
    // Plain plates: REMA 1000 papptallerken 18 cm 25 stk 31,40 – dyp 19 cm 25 stk 36,50.
    // Themed plates cost far more (Sprell, 8 stk 109,00), see the budget guide.
    mode: 'perGuest', factor: 1.2, packSize: 25, packUnit: 'pakke (25 stk)',
    priceMinNok: 31.4, priceMaxNok: 36.5, priceSource: 'oda', kassalSearch: 'papptallerken', enabled: true
  },
  {
    id: 'kopper', name: 'Kopper (papp)', emoji: '🥛', category: 'servise', unit: 'stk',
    // Plain cups: R drikkebeger 200 ml 80 stk 53,60. Themed cups cost far more
    // (Sprell, 8 stk 129,00), see the budget guide.
    mode: 'perGuest', factor: 1.2, packSize: 80, packUnit: 'pakke (80 stk)',
    priceMinNok: 53.6, priceMaxNok: 53.6, priceSource: 'oda', kassalSearch: 'pappkrus', enabled: true
  },
  {
    id: 'servietter', name: 'Servietter', emoji: '🧻', category: 'servise', unit: 'stk',
    // Prima Lavpris bordpakning 75 stk 22,40 – R servietter hvit 33 cm 50 stk 28,60 (counted as 50).
    mode: 'perGuest', factor: 2, packSize: 50, packUnit: 'pakke (50–75 stk)',
    priceMinNok: 22.4, priceMaxNok: 28.6, priceSource: 'oda', kassalSearch: 'serviett papir', enabled: true
  },
  {
    id: 'bestikk', name: 'Bestikk (gaffel/skje)', emoji: '🍴', category: 'servise', unit: 'sett',
    // R engangsgafler av tre 20 stk 21,30 + R engangsskjeer av tre 20 stk 21,30.
    mode: 'perGuest', factor: 1, packSize: 20, packUnit: '20 gafler + 20 skjeer (tre)',
    priceMinNok: 42.6, priceMaxNok: 42.6, priceSource: 'oda', kassalSearch: 'engangsbestikk', enabled: true
  },
  {
    id: 'duk', name: 'Bordduk (papir)', emoji: '🟦', category: 'servise', unit: 'stk',
    mode: 'perTable', divisor: 8, packSize: 1, packUnit: 'duk (120×180 cm)',
    priceMinNok: 55, priceMaxNok: 89,
    kassalSearch: 'papirduk hvit', enabled: true
  },
  {
    id: 'sugeror', name: 'Sugerør', emoji: '🥤', category: 'servise', unit: 'stk',
    mode: 'perGuest', factor: 1, packSize: 25, packUnit: 'pakke (25 stk)',
    priceMinNok: 25, priceMaxNok: 39, kassalSearch: 'sugerør', enabled: false
  },

  // ---------------- PYNT ----------------
  {
    id: 'ballonger', name: 'Ballonger', emoji: '🎈', category: 'pynt', unit: 'stk',
    mode: 'perGuest', factor: 2, packSize: 10, packUnit: 'pakke (10 stk)',
    priceMinNok: 30, priceMaxNok: 60, kassalSearch: 'ballonger', audience: 'kids', enabled: true
  },
  {
    id: 'krone', name: 'Bursdagskrone', emoji: '👑', category: 'pynt', unit: 'stk',
    mode: 'fixed', fixedQty: 1, packUnit: 'til bursdagsbarnet',
    priceMinNok: 45, priceMaxNok: 99, enabled: true
  },
  {
    id: 'kakelys', name: 'Kakelys (= alder + 1)', emoji: '🕯️', category: 'pynt', unit: 'stk',
    mode: 'ageCount', growOn: true, packSize: 8, packUnit: 'pakke (8 stk)',
    priceMinNok: 19, priceMaxNok: 39, kassalSearch: 'kakelys', enabled: true
  },
  {
    id: 'vimpel', name: 'Vimpelrekke / girlander', emoji: '🎉', category: 'pynt', unit: 'stk',
    mode: 'fixed', fixedQty: 1, priceMinNok: 29, priceMaxNok: 95,
    kassalSearch: 'vimpel', enabled: false
  },

  // ---------------- GODTERI ----------------
  {
    id: 'godtepose', name: 'Godteposer', emoji: '🍬', category: 'godteri', unit: 'stk',
    mode: 'perGuest', factor: 1, packSize: 6, packUnit: 'pakke (6 stk)',
    priceMinNok: 29, priceMaxNok: 59, homeOnly: true, kassalSearch: 'godteposer',
    audience: 'kids', enabled: true
  },
  {
    id: 'smagodt', name: 'Smågodt (til poser)', emoji: '🍭', category: 'godteri', unit: 'g',
    mode: 'perChild', perChild: { '3-4': 50, '5-6': 100, '7-9': 125 },
    homeOnly: true, allergyTags: ['svin'],
    altNote: 'Seigmenn inneholder svinegelatin – velg vegansk / Nonstop.',
    kassalSearch: 'supermix smågodt', audience: 'kids', enabled: true
  },
  {
    id: 'nott-godt', name: 'Nøttefri sjokolade/godteri', emoji: '🍫', category: 'godteri', unit: 'g',
    mode: 'perChild', perChild: { '3-4': 50, '5-6': 75, '7-9': 100 },
    homeOnly: true, allergyScope: 'nott', kassalSearch: 'Freia melkesjokolade',
    audience: 'kids', enabled: true
  },
  {
    id: 'premier', name: 'Premier / smågaver (lek)', emoji: '🎁', category: 'godteri', unit: 'stk',
    mode: 'perGuest', factor: 1, priceMinNok: 10, priceMaxNok: 30,
    audience: 'kids', enabled: false
  },
  {
    id: 'pinata', name: 'Pinata med godteri', emoji: '🪅', category: 'godteri', unit: 'stk',
    mode: 'fixed', fixedQty: 1, packUnit: 'til festen',
    priceMinNok: 99, priceMaxNok: 199, kassalSearch: 'pinata', audience: 'kids', enabled: false
  }
];
