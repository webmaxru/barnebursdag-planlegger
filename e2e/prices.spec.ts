import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { computePlan, computeLineItem } from '../src/lib/engine';
import { DEFAULT_CATALOG, PRICE_SOURCE } from '../src/lib/catalog';
import { krRange } from '../src/lib/format';
import type { PartyConfig } from '../src/lib/types';

const base: PartyConfig = {
  guests: 10, age: 6, adults: 0, type: 'hjemme', duration: 2,
  allergies: {}, mainDish: 'polser', breadRatio: 50
};
const item = (id: string) => DEFAULT_CATALOG.find((it) => it.id === id)!;
const line = (id: string, cfg: Partial<PartyConfig> = {}) => computeLineItem(item(id), { ...base, ...cfg })!;
/** "1 038,1" → "1 040" style, as the guides round their totals to tens. */
const tens = (n: number) => new Intl.NumberFormat('nb-NO').format(Math.round(n / 10) * 10).replace(/\s/g, ' ');
const whole = (n: number) => new Intl.NumberFormat('nb-NO').format(Math.round(n)).replace(/\s/g, ' ');
const read = (path: string) => readFile(path, 'utf8');

test('every priced item has a sane range, and Oda prices carry the dated source', () => {
  expect(PRICE_SOURCE.label).toBe('Priser: Oda, ordinære priser 25.10.2026');
  for (const it of DEFAULT_CATALOG) {
    if (it.priceMinNok == null) continue;
    expect(it.priceMinNok, it.id).toBeGreaterThan(0);
    expect(it.priceMaxNok ?? it.priceMinNok, it.id).toBeGreaterThanOrEqual(it.priceMinNok);
  }
  const oda = DEFAULT_CATALOG.filter((it) => it.priceSource === 'oda').map((it) => it.id);
  expect(oda).toEqual(expect.arrayContaining([
    'polser', 'svin-polser', 'lomper', 'polsebrod', 'gluten-brod', 'ketchup', 'sennep', 'stektlok',
    'snacks', 'saft', 'brus', 'tallerkener', 'kopper', 'servietter', 'bestikk'
  ]));
});

test('pack sizes follow how the goods are sold', () => {
  // Lomper and pølsebrød come 10 to a pack and cost 10,90–26,70 kr at Oda.
  expect(item('lomper')).toMatchObject({ packSize: 10, priceMinNok: 10.9, priceMaxNok: 17.2 });
  expect(item('polsebrod')).toMatchObject({ packSize: 10, priceMinNok: 18.9, priceMaxNok: 26.7 });
  // Saft is sold in 1,5 l bottles that make at least 7,5 l (75 dl) of drink.
  expect(item('saft')).toMatchObject({ unit: 'dl', packSize: 75 });
  // Grillpølser are sold by weight: 600 g counted as 8 sausages, i.e. 75 g each (Oda packs: 62–80 g).
  const polser = item('polser');
  expect(polser.packWeightG! / polser.packSize!).toBeGreaterThanOrEqual(62);
  expect(polser.packWeightG! / polser.packSize!).toBeLessThanOrEqual(80);
});

test('goods sold by weight report the weight bought, and prices follow whole packs', () => {
  const polser = line('polser');
  expect(polser).toMatchObject({ neededQty: 20, packs: 3, buyQty: 24, buyWeightG: 1800, priceSource: 'oda' });
  expect(polser.priceMin).toBeCloseTo(3 * 39);
  expect(polser.priceMax).toBeCloseTo(3 * 64.9);
  expect(line('lomper')).toMatchObject({ neededQty: 12, packs: 2 });
  expect(line('saft')).toMatchObject({ neededQty: 50, packs: 1 });
  expect(line('saft', { guests: 16, age: 8 })).toMatchObject({ neededQty: 96, packs: 2 });
  expect(line('kake').priceSource).toBeUndefined(); // estimate, flagged «anslag» in the list
});

test('pølse-only allergy substitutes follow the main dish', () => {
  const allergies = { gluten: 2, svin: 1 };
  const ids = (cfg: Partial<PartyConfig>) =>
    computePlan(DEFAULT_CATALOG, { ...base, allergies, ...cfg }).groups.flatMap((g) => g.items.map((it) => it.id));
  // With pølser: glutenfri lompe for the gluten kids, kyllingpølser for the kids who skip pork.
  expect(ids({})).toEqual(expect.arrayContaining(['gluten-brod', 'svin-polser', 'gluten-kake']));
  // With pizza there are no lomper or pølser to replace, so neither substitute is listed.
  const pizza = ids({ mainDish: 'pizza' });
  expect(pizza).not.toContain('gluten-brod');
  expect(pizza).not.toContain('svin-polser');
  expect(pizza).toContain('gluten-kake'); // still not tied to the main dish
});

test('the numbers in the guides and on the home page match the calculator', async () => {
  const total = (cfg: Partial<PartyConfig>) => computePlan(DEFAULT_CATALOG, { ...base, ...cfg });

  const budget = await read('content/guider/budsjett-for-barnebursdag.md');
  const eight = total({ guests: 8 });
  expect(budget).toContain(`**ca. ${whole(eight.priceMin)}–${whole(eight.priceMax)} kr**`);
  expect(budget).toContain(`omtrent ${tens(eight.priceMin)}–${tens(eight.priceMax)} kroner`);
  const pizza = total({ guests: 8, mainDish: 'pizza' });
  expect(budget).toContain(`omtrent ${tens(pizza.priceMin)}–${tens(pizza.priceMax)} kroner`);

  const guests = await read('content/guider/hvor-mange-gjester-i-barnebursdag.md');
  for (const n of [4, 7, 12, 20]) {
    const p = total({ guests: n });
    expect(guests).toContain(`| ${n} | ca. ${tens(p.priceMin)}–${tens(p.priceMax)} kr |`);
  }

  const home = await read('index.html');
  const ten = total({});
  expect(home).toContain(`ca. ${tens(ten.priceMin)}–${tens(ten.priceMax)} kroner`);

  const method = await read('content/guider/slik-beregner-kakeklar.md');
  for (const it of DEFAULT_CATALOG.filter((x) => x.priceSource === 'oda')) {
    const fmt = (v: number) => v.toFixed(2).replace('.', ',');
    const range = it.priceMinNok === it.priceMaxNok ? `${fmt(it.priceMinNok!)} kr` : `${fmt(it.priceMinNok!)}–${fmt(it.priceMaxNok!)} kr`;
    expect(method, it.id).toContain(`| ${range} |`);
  }
});

test('shopping list shows the price source and flags estimates', async ({ page }) => {
  await page.goto('/?gjester=10&alder=6');
  await expect(page.getByTestId('price-source')).toContainText('Priser: Oda, ordinære priser 25.10.2026');
  const plan = computePlan(DEFAULT_CATALOG, base);
  await expect(page.locator('.total strong')).toHaveText(krRange(plan.priceMin, plan.priceMax));
  await expect(page.locator('.row', { hasText: 'Bursdagskake' }).locator('.price-flag')).toHaveText('anslag');
  await expect(page.locator('.row', { hasText: 'Lomper' }).locator('.price-flag')).toHaveCount(0);
  await expect(page.locator('.row', { hasText: 'Pølser' }).first()).toContainText('1,8 kg');
});

test('a shared link restores the calculator inputs', async ({ page }) => {
  await page.goto('/?gjester=9&alder=8&voksne=2&rett=pizza&allergi=gluten:1');
  await expect(page.getByLabel('Antall gjester')).toHaveValue('9');
  await expect(page.getByLabel('Barnets alder')).toHaveValue('8');
  await expect(page.locator('.row', { hasText: 'Minipizza' })).toBeVisible();
  await expect(page.locator('.row-name', { hasText: 'Glutenfri kake/muffins' })).toBeVisible();
  await expect(page).toHaveURL(/voksne=2/);
});

test('copy link copies the restoring URL, and falls back to a visible link', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__copied = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => { (window as any).__copied.push(t); } }
    });
  });
  await page.goto('/?gjester=9&alder=8');
  await page.getByTestId('copy-link').click();
  await expect(page.getByRole('status')).toContainText('Lenke kopiert');
  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied.at(-1)).toMatch(/gjester=9/);
  expect(copied.at(-1)).toMatch(/alder=8/);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('denied'); } }
    });
  });
  await page.getByRole('toolbar').first().getByRole('button', { name: /Del/ }).click();
  await expect(page.getByTestId('share-fallback').locator('input')).toHaveValue(/gjester=9&alder=8/);
});
