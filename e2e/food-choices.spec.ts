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

test('default finish shows hot dogs with lomper and condiments', async ({ page }) => {
  await finishDefaultWizard(page);

  await expect(item(page, /Pølser$/)).toBeVisible();
  await expect(item(page, /Lomper$/)).toBeVisible();
  await expect(item(page, /Ketchup$/)).toBeVisible();
  await expect(item(page, /Sennep$/)).toBeVisible();
  await expect(item(page, /Stekt l/)).toBeVisible();
  await expect(item(page, /Minipizza/)).toHaveCount(0);
});

test('choosing pølsebrød replaces lomper', async ({ page }) => {
  await goToWizardStep(page, 3);
  await page.getByTestId('choice-bread-polsebrod').click();

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

test('pinata replaces godteposer while godteposer is the default treat', async ({ page }) => {
  await finishDefaultWizard(page);
  await expect(item(page, /Godteposer$/)).toBeVisible();
  await expect(item(page, /Pinata/)).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await goToWizardStep(page, 3);
  await page.getByTestId('choice-treat-pinata').click();

  await finishWizardFromStep3(page);

  await expect(item(page, /Pinata/)).toBeVisible();
  await expect(item(page, /Godteposer$/)).toHaveCount(0);
});
