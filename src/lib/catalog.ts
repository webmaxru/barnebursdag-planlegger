import type { GoodItem } from './types';

/** Bump when the default catalog shape/content changes (invalidates saved copies). */
export const CATALOG_VERSION = 6;

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
    packSize: 8, packUnit: 'pakke (8 stk)', priceMinNok: 35, priceMaxNok: 55,
    allergyTags: ['svin'], altNote: 'Bytt til kyllingpølse for halal / uten svin.',
    kassalSearch: 'pølser', showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'lomper', name: 'Lomper', emoji: '🫓', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    packSize: 8, packUnit: 'pakke (8 stk)', priceMinNok: 20, priceMaxNok: 30,
    kassalSearch: 'lomper', showIf: { mainDish: 'polser' }, breadKind: 'lompe', enabled: true
  },
  {
    id: 'polsebrod', name: 'Pølsebrød', emoji: '🥖', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    packSize: 8, packUnit: 'pakke (8 stk)', priceMinNok: 25, priceMaxNok: 35,
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
    mode: 'perTable', divisor: 20, packSize: 1, packUnit: 'flaske',
    priceMinNok: 25, priceMaxNok: 45, kassalSearch: 'ketchup',
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'sennep', name: 'Sennep', emoji: '🟡', category: 'mat', unit: 'tube',
    mode: 'perTable', divisor: 25, packSize: 1, packUnit: 'tube',
    priceMinNok: 20, priceMaxNok: 40, kassalSearch: 'sennep',
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'stektlok', name: 'Stekt løk', emoji: '🧅', category: 'mat', unit: 'boks',
    mode: 'perTable', divisor: 15, packSize: 1, packUnit: 'boks',
    priceMinNok: 25, priceMaxNok: 40, kassalSearch: 'stekt løk',
    showIf: { mainDish: 'polser' }, enabled: true
  },
  {
    id: 'gluten-brod', name: 'Glutenfri lompe/brød', emoji: '🫓', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    packSize: 6, packUnit: 'pakke (6 stk)', priceMinNok: 35, priceMaxNok: 55,
    allergyScope: 'gluten', kassalSearch: 'glutenfri lompe', enabled: true
  },
  {
    id: 'svin-polser', name: 'Kyllingpølser (uten svin)', emoji: '🌭', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1.5, '5-6': 2, '7-9': 2.5 },
    packSize: 8, packUnit: 'pakke (8 stk)', priceMinNok: 45, priceMaxNok: 69,
    allergyScope: 'svin', kassalSearch: 'kyllingpølser', enabled: true
  },
  {
    id: 'kake', name: 'Bursdagskake', emoji: '🎂', category: 'mat', unit: 'stk',
    mode: 'perChild', perChild: { '3-4': 1, '5-6': 1, '7-9': 1.25 },
    packSize: 20, packUnit: 'langpannekake (~20 biter)', priceMinNok: 150, priceMaxNok: 250,
    homeOnly: true, allergyTags: ['gluten', 'melk', 'egg'],
    altNote: 'Se glutenfri/melkefri kakemiks (Toro/Regal).',
    kassalSearch: 'sjokoladekake', enabled: true
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
    homeOnly: true, allergyScope: 'egg', kassalSearch: 'eggfri kake', enabled: true
  },
  {
    id: 'frukt', name: 'Frukt (oppkuttet)', emoji: '🍓', category: 'mat', unit: 'g',
    mode: 'perChild', perChild: { '3-4': 120, '5-6': 130, '7-9': 140 },
    kassalSearch: 'frukt', enabled: true
  },
  {
    id: 'snacks', name: 'Snacks / potetgull', emoji: '🥨', category: 'mat', unit: 'g',
    mode: 'perChild', perChild: { '3-4': 30, '5-6': 35, '7-9': 40 },
    packSize: 165, packUnit: 'pose (165 g)', priceMinNok: 25, priceMaxNok: 35,
    homeOnly: true, kassalSearch: 'potetgull', enabled: true
  },

  // ---------------- DRIKKE ----------------
  {
    id: 'saft', name: 'Saft (konsentrat)', emoji: '🧃', category: 'drikke', unit: 'dl',
    mode: 'perChild', perChild: { '3-4': 4, '5-6': 5, '7-9': 6 },
    packSize: 30, packUnit: 'flaske (0,5 L ≈ 3 L ferdig)', priceMinNok: 25, priceMaxNok: 40,
    kassalSearch: 'saft', enabled: true
  },
  {
    id: 'brus', name: 'Brus (7+ år)', emoji: '🥤', category: 'drikke', unit: 'boks',
    mode: 'perChild', perChild: { '3-4': 0, '5-6': 0, '7-9': 1 },
    packSize: 6, packUnit: '6-pk (0,33 L)', priceMinNok: 50, priceMaxNok: 80,
    homeOnly: true, kassalSearch: 'brus', enabled: true
  },

  // ---------------- SERVISE ----------------
  {
    id: 'tallerkener', name: 'Tallerkener (papp)', emoji: '🍽️', category: 'servise', unit: 'stk',
    mode: 'perGuest', factor: 1.2, packSize: 8, packUnit: 'pakke (8 stk)',
    priceMinNok: 29, priceMaxNok: 79, kassalSearch: 'papptallerken', enabled: true
  },
  {
    id: 'kopper', name: 'Kopper (papp)', emoji: '🥛', category: 'servise', unit: 'stk',
    mode: 'perGuest', factor: 1.2, packSize: 8, packUnit: 'pakke (8 stk)',
    priceMinNok: 29, priceMaxNok: 89, kassalSearch: 'pappkrus', enabled: true
  },
  {
    id: 'servietter', name: 'Servietter', emoji: '🧻', category: 'servise', unit: 'stk',
    mode: 'perGuest', factor: 2, packSize: 20, packUnit: 'pakke (20 stk)',
    priceMinNok: 29, priceMaxNok: 59, kassalSearch: 'servietter', enabled: true
  },
  {
    id: 'bestikk', name: 'Bestikk (gaffel/skje)', emoji: '🍴', category: 'servise', unit: 'sett',
    mode: 'perGuest', factor: 1, packSize: 6, packUnit: 'pakke (18 deler = 6 sett)',
    priceMinNok: 39, priceMaxNok: 55, kassalSearch: 'plastbestikk', enabled: true
  },
  {
    id: 'duk', name: 'Bordduk (papir)', emoji: '🟦', category: 'servise', unit: 'stk',
    mode: 'perTable', divisor: 8, packSize: 1, packUnit: 'duk (120×180 cm)',
    priceMinNok: 55, priceMaxNok: 89, kassalSearch: 'papirduk', enabled: true
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
    priceMinNok: 45, priceMaxNok: 99, kassalSearch: 'bursdagskrone', enabled: true
  },
  {
    id: 'kakelys', name: 'Kakelys (= alder + 1)', emoji: '🕯️', category: 'pynt', unit: 'stk',
    mode: 'ageCount', growOn: true, packSize: 8, packUnit: 'pakke (8 stk)',
    priceMinNok: 29, priceMaxNok: 45, kassalSearch: 'kakelys', enabled: true
  },
  {
    id: 'vimpel', name: 'Vimpelrekke / girlander', emoji: '🎉', category: 'pynt', unit: 'stk',
    mode: 'fixed', fixedQty: 1, priceMinNok: 29, priceMaxNok: 95,
    kassalSearch: 'vimpelrekke', enabled: false
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
    kassalSearch: 'smågodt', audience: 'kids', enabled: true
  },
  {
    id: 'nott-godt', name: 'Nøttefri sjokolade/godteri', emoji: '🍫', category: 'godteri', unit: 'g',
    mode: 'perChild', perChild: { '3-4': 50, '5-6': 75, '7-9': 100 },
    homeOnly: true, allergyScope: 'nott', kassalSearch: 'nøttefri sjokolade',
    audience: 'kids', enabled: true
  },
  {
    id: 'premier', name: 'Premier / smågaver (lek)', emoji: '🎁', category: 'godteri', unit: 'stk',
    mode: 'perGuest', factor: 1, priceMinNok: 10, priceMaxNok: 30,
    kassalSearch: 'smågaver barn', audience: 'kids', enabled: false
  },
  {
    id: 'pinata', name: 'Pinata med godteri', emoji: '🪅', category: 'godteri', unit: 'stk',
    mode: 'fixed', fixedQty: 1, packUnit: 'til festen',
    priceMinNok: 99, priceMaxNok: 199, kassalSearch: 'pinata', audience: 'kids', enabled: false
  }
];
