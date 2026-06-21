import { expect, test, type Page } from '@playwright/test';

async function goToWizardStep(page: Page, step: 1 | 2 | 3) {
  await page.goto('/');
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();
  for (let current = 1; current < step; current += 1) {
    await page.getByTestId('wizard-next').click();
    await expect(page.getByTestId(`wizard-step-${current + 1}`)).toBeVisible();
  }
}

async function finishDefaultWizard(page: Page) {
  await goToWizardStep(page, 3);
  await finishWizardFromStep3(page);
}

async function finishWizardFromStep3(page: Page) {
  await page.getByTestId('wizard-finish').click();
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Handleliste' })).toBeVisible();
}

async function clickStepper(page: Page, label: string | RegExp, ariaLabel: 'Flere' | 'Færre', times = 1) {
  const slider = page.locator('.slider').filter({ hasText: label });
  await expect(slider).toBeVisible();
  const button = slider.getByLabel(ariaLabel);
  for (let i = 0; i < times; i += 1) {
    await button.click();
  }
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

test('gluten allergy adds gluten-free items', async ({ page }) => {
  await goToWizardStep(page, 2);
  await clickStepper(page, /Glutenfri/, 'Flere');
  await page.getByTestId('wizard-next').click();
  await expect(page.getByTestId('wizard-step-3')).toBeVisible();

  await finishWizardFromStep3(page);

  await expect.poll(() => item(page, /Glutenfri/).count()).toBeGreaterThan(0);
});

test('adult guests do not lower plate quantities', async ({ browser }) => {
  const zeroAdultsContext = await browser.newContext();
  const zeroAdultsPage = await zeroAdultsContext.newPage();
  await finishDefaultWizard(zeroAdultsPage);
  const zeroAdultsPlates = await buyQuantityFor(zeroAdultsPage, /Tallerkener \(papp\)$/);
  await zeroAdultsContext.close();

  const adultsContext = await browser.newContext();
  const adultsPage = await adultsContext.newPage();
  await goToWizardStep(adultsPage, 1);
  await clickStepper(adultsPage, /Voksne/, 'Flere', 3);
  await adultsPage.getByTestId('wizard-next').click();
  await expect(adultsPage.getByTestId('wizard-step-2')).toBeVisible();
  await adultsPage.getByTestId('wizard-next').click();
  await expect(adultsPage.getByTestId('wizard-step-3')).toBeVisible();
  await finishWizardFromStep3(adultsPage);
  const withAdultsPlates = await buyQuantityFor(adultsPage, /Tallerkener \(papp\)$/);
  await adultsContext.close();

  expect(withAdultsPlates).toBeGreaterThanOrEqual(zeroAdultsPlates);
});
