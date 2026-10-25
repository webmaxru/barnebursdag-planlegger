import type { PlanResult } from './engine';
import { CATEGORY_LABEL } from './engine';
import type { LineItem, PartyConfig } from './types';
import { PRICE_SOURCE } from './catalog';
import { krRange, n1, plural } from './format';

/**
 * A ready-to-paste prompt for the user's own grocery-ordering AI agent
 * (e.g. an agent connected to an online grocer through MCP). It carries the whole
 * shopping list with quantities and pack sizes, the party facts and allergies,
 * and the rules the agent must follow: fill the cart, never check out or pay.
 */

/** Placeholder the user replaces before sending the prompt. */
export const DELIVERY_PLACEHOLDER = '[FYLL INN: dato og tidsvindu]';

/** How each allergy key reads in the prompt, and what a safe product is called. */
export const ALLERGY_PROMPT: Record<string, { who: string; safe: string }> = {
  gluten: { who: 'har glutenallergi (cøliaki)', safe: 'merket glutenfri' },
  melk: { who: 'har melkeallergi', safe: 'merket melkefri' },
  egg: { who: 'har eggallergi', safe: 'uten egg (eggfri eller vegansk)' },
  nott: { who: 'har nøtteallergi', safe: 'uten nøtter og peanøtter, og uten «kan inneholde spor av nøtter»' },
  svin: { who: 'spiser ikke svin', safe: 'uten svinekjøtt og uten svinegelatin' }
};

/** Short allergy names for the rules section. */
const ALLERGY_LABEL_PROMPT: Record<string, string> = {
  gluten: 'glutenallergi',
  melk: 'melkeallergi',
  egg: 'eggallergi',
  nott: 'nøtteallergi',
  svin: 'uten svin'
};

/**
 * Search words that find the item in a Norwegian online grocery. Checked against
 * Oda's product search on 25.10.2026: where the calculator's own search word gave
 * poor hits (e.g. «pappkrus» → coffee cups, «papirduk hvit» → snus,
 * «sjokolade uten nøtter» → nut products), the prompt
 * uses the words below instead. Everything else uses the catalog's search word.
 */
export const PROMPT_SEARCH: Record<string, string> = {
  kake: 'sjokoladekake langpanne',
  frukt: 'druer, epler eller bananer',
  kopper: 'drikkebeger papp',
  servietter: 'servietter',
  duk: 'bordduk papir',
  'melk-kake': 'vegansk muffins',
  // A keyword search containing «nøtter» returns nut products, so point to sweets that are usually nut-free.
  'nott-godt': 'vingummi'
};

/** Items Oda's search did not carry on 25.10.2026 – many grocery shops don't, so the agent may skip them. */
export const OFTEN_MISSING = new Set(['iskake', 'duk', 'ballonger', 'krone', 'kakelys', 'godtepose', 'pinata', 'premier', 'vimpel']);

function searchWords(it: LineItem): string | undefined {
  return PROMPT_SEARCH[it.id] ?? it.kassalSearch;
}

/** Item name without the calculator's own hints in parentheses, e.g. «Kakelys (= alder + 1)» → «Kakelys». */
function cleanName(name: string): string {
  return name.replace(/\s*\(=[^)]*\)/g, '').trim();
}

function itemLine(it: LineItem, index: number): string {
  const qty = `${n1(it.neededQty)} ${it.unit}`;
  let buy = '';
  if (it.packs != null) {
    const weight = it.buyWeightG ? `, ca. ${n1(it.buyWeightG / 1000)} kg` : '';
    buy = ` – kjøp ${it.packs} × ${it.packUnit || 'pakke'}${weight}`;
  } else if (it.packUnit) {
    buy = ` – ${it.packUnit}`;
  }
  const search = searchWords(it);
  const extras = [
    search ? `søk: «${search}»` : '',
    it.note ? `merk: ${it.note}` : '',
    OFTEN_MISSING.has(it.id) ? 'finnes ikke i alle matbutikker' : ''
  ].filter(Boolean).join('; ');
  return `${index}. ${cleanName(it.name)} – ${qty}${buy}${extras ? ` (${extras})` : ''}`;
}

export function allergyLines(cfg: PartyConfig): string[] {
  return Object.entries(cfg.allergies || {})
    .filter(([key, count]) => count > 0 && ALLERGY_PROMPT[key])
    .map(([key, count]) => `${plural(count, 'barn', 'barn')} ${ALLERGY_PROMPT[key].who}`);
}

export function buildAgentPrompt(plan: PlanResult, cfg: PartyConfig, url?: string): string {
  const allergies = allergyLines(cfg);
  const allergyKeys = Object.entries(cfg.allergies || {})
    .filter(([key, count]) => count > 0 && ALLERGY_PROMPT[key])
    .map(([key]) => key);

  const party = [
    `- ${plural(cfg.guests, 'barn', 'barn')} på ${cfg.age} år${cfg.adults > 0 ? `, pluss ${plural(cfg.adults, 'voksen', 'voksne')} som spiser` : ''}`,
    `- ${cfg.type === 'barnehage' ? 'I barnehagen' : 'Hjemme'}, ${plural(cfg.duration, 'time', 'timer')}`,
    `- Hovedrett: ${cfg.mainDish === 'pizza' ? 'minipizza' : 'pølser'}`,
    `- Allergier og kosthold: ${allergies.length ? allergies.join(', ') : 'ingen oppgitt'}`,
    `- Levering: ${DELIVERY_PLACEHOLDER}`
  ];

  const lines: string[] = [
    'Hei! Jeg planlegger barnebursdag og vil at du legger varene under i handlekurven min i nettbutikken du har tilgang til.',
    '',
    'FESTEN',
    ...party,
    '',
    'HANDLELISTE (laget med Kakeklar)',
    'Mengden er det festen trenger. «Kjøp» er antall pakker Kakeklar regner med – velg nærmeste pakning som dekker mengden.'
  ];

  let n = 0;
  for (const g of plan.groups) {
    lines.push('', CATEGORY_LABEL[g.category].toUpperCase());
    for (const it of g.items) lines.push(itemLine(it, ++n));
  }

  lines.push(
    '',
    'SLIK VIL JEG AT DU GJØR DET',
    '1. Finn én vare for hvert punkt på listen. Gir navnet ikke treff, bruk søkeordet i parentes, og prøv et nært synonym før du gir opp. Les varenavnet – et søk på «iskake» kan gi iskaffe.',
    '2. Velg vanlige hverdagsvarer til ordinær pris – helst butikkens rimelige standardvare eller et kjent merke. Ikke premium, økologisk eller temavarer med mindre jeg ber om det. Et tilbud er greit, men ikke nødvendig.',
    '3. Pakningen trenger ikke være lik. Velg antall pakker slik at mengden på listen dekkes, uten å kjøpe mye mer enn det.'
  );
  if (allergyKeys.length) {
    lines.push(
      '4. Allergier er viktigst. Varene merket «Trygt for …» på listen er til barna med allergi og skal være:',
      ...allergyKeys.map((k) => `   - ${ALLERGY_LABEL_PROMPT[k]}: ${ALLERGY_PROMPT[k].safe}`),
      '   Les allergeninformasjonen på hver av disse varene. Finner du ikke en trygg vare, ikke legg inn en tilfeldig erstatning – skriv det i rapporten i stedet.',
      '5. Bytter du en vare med noe annet, skal erstatningen også være trygg for allergiene over.'
    );
  } else {
    lines.push('4. Ingen allergier er oppgitt. Spør meg likevel før du bytter en vare med noe helt annet.');
  }
  const k = allergyKeys.length ? 6 : 5;
  lines.push(
    `${k}. Varer butikken ikke har (ofte pynt, kakelys og godteposer), hopper du over og lister opp til slutt, så jeg kan kjøpe dem et annet sted.`,
    `${k + 1}. Velg levering til tidspunktet over hvis du kan. Står det fortsatt «FYLL INN», spør meg.`,
    `${k + 2}. Ikke gå til kassen. Ikke bestill, betal eller bekreft noe uten at jeg har sagt ja. Legg varene i handlekurven og stopp der.`,
    '',
    'RAPPORT TIL MEG',
    '- hver vare du la i handlekurven: navn, pakning, antall og pris',
    '- varer du byttet eller ikke fant, og hvorfor',
    '- totalsum for handlekurven',
    '- lenke til handlekurven, så jeg kan sjekke og betale selv'
  );
  if (plan.hasPrice) {
    lines.push('', `Til sammenligning anslår Kakeklar ${krRange(plan.priceMin, plan.priceMax)} (${PRICE_SOURCE.label.replace('Priser: ', '')}).`);
  }
  if (url) lines.push(`Listen i Kakeklar: ${url}`);
  // Intl formats thousands with (narrow) no-break spaces; plain spaces paste cleaner into chat boxes.
  return lines.join('\n').replace(/[\u00a0\u202f]/g, ' ');
}
