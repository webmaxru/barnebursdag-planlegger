import { expect, test, type Page } from '@playwright/test';

async function finishDefaultWizard(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('wizard')).toBeVisible();
  await page.getByTestId('wizard-next').click();
  await expect(page.getByTestId('wizard-step-2')).toBeVisible();
  await page.getByTestId('wizard-next').click();
  await expect(page.getByTestId('wizard-step-3')).toBeVisible();
  await page.getByTestId('wizard-finish').click();
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Handleliste' })).toBeVisible();
}

async function goToWizardStep(page: Page, step: 1 | 2 | 3) {
  await page.goto('/');
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();
  for (let current = 1; current < step; current += 1) {
    await page.getByTestId('wizard-next').click();
    await expect(page.getByTestId(`wizard-step-${current + 1}`)).toBeVisible();
  }
}

async function finishWizardFromStep3(page: Page) {
  await page.getByTestId('wizard-finish').click();
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Handleliste' })).toBeVisible();
}

function item(page: Page, name: string | RegExp) {
  return page.locator('.row-name').filter({ hasText: name });
}

async function buyQuantityFor(page: Page, name: string | RegExp) {
  const row = page.locator('.row').filter({ has: item(page, name) });
  await expect(row).toBeVisible();
  const badge = await row.locator('.badge').first().innerText();
  const match = badge.match(/=\s*(\d+(?:[,.]\d+)?)/);
  expect(match, `Expected buy quantity in badge: ${badge}`).not.toBeNull();
  return Number(match![1].replace(',', '.'));
}

async function setRange(page: Page, testId: string, value: number) {
  await page.getByTestId(testId).evaluate((el, v) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, String(v));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('default finish shows hot dogs with lomper and condiments', async ({ page }) => {
  await finishDefaultWizard(page);

  await expect(item(page, /Pølser$/)).toBeVisible();
  await expect(item(page, /Lomper$/)).toBeVisible();
  await expect(item(page, /Pølsebrød$/)).toBeVisible();
  await expect(item(page, /Ketchup$/)).toBeVisible();
  await expect(item(page, /Sennep$/)).toBeVisible();
  await expect(item(page, /Stekt l/)).toBeVisible();
  await expect(item(page, /Minipizza/)).toHaveCount(0);
});

test('setting bread ratio to pølsebrød hides lomper', async ({ page }) => {
  await goToWizardStep(page, 3);
  await setRange(page, 'bread-ratio', 0);

  await finishWizardFromStep3(page);

  await expect(item(page, /Pølsebrød$/)).toBeVisible();
  await expect(item(page, /Lomper$/)).toHaveCount(0);
});

test('choosing pizza replaces hot dogs and condiments', async ({ page }) => {
  await goToWizardStep(page, 3);
  await page.getByTestId('choice-maindish-pizza').click();

  await finishWizardFromStep3(page);

  await expect(item(page, /Minipizza/)).toBeVisible();
  await expect(item(page, /Pølser$/)).toHaveCount(0);
  await expect(item(page, /Ketchup$/)).toHaveCount(0);
});

test('godteposer is included by default and pinata is not in the wizard', async ({ page }) => {
  await finishDefaultWizard(page);

  await expect(item(page, /Godteposer$/)).toBeVisible();
  await expect(item(page, /Pinata/)).toHaveCount(0);
});

test('inline guest edit immediately updates the shopping list', async ({ page }) => {
  await finishDefaultWizard(page);

  const guestsInput = page.getByLabel('Antall gjester');
  const ageInput = page.getByLabel('Barnets alder');
  await expect(guestsInput).toBeVisible();
  await expect(ageInput).toBeVisible();
  await expect(guestsInput).toHaveClass(/inline-num/);
  await expect(ageInput).toHaveClass(/inline-num/);

  const baselinePlates = await buyQuantityFor(page, /Tallerkener \(papp\)$/);
  await guestsInput.fill('30');

  await expect
    .poll(() => buyQuantityFor(page, /Tallerkener \(papp\)$/))
    .toBeGreaterThan(baselinePlates);
});
