import { expect, test } from '@playwright/test';

async function finishDefaultWizard(page: import('@playwright/test').Page) {
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

test('wizard is visible on first load and step 1 has the primary sliders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('wizard')).toBeVisible();
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();
  await expect(page.getByText('Made in Norway')).toBeVisible();
  await expect(page.locator('#alder')).toBeVisible();
  await expect(page.locator('#gjester')).toBeVisible();
  await expect(page.locator('#voksne')).toBeVisible();
});

test('can complete all wizard steps and see the shopping list', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();

  await page.getByTestId('wizard-next').click();
  await expect(page.getByTestId('wizard-step-2')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Allergier og matrestriksjoner' })).toBeVisible();

  await page.getByTestId('wizard-next').click();
  await expect(page.getByTestId('wizard-step-3')).toBeVisible();
  await expect(page.getByTestId('choice-maindish-polser')).toBeVisible();

  await page.getByTestId('wizard-finish').click();
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Handleliste' })).toBeVisible();
});

test('can choose barnehage on the allergies step and the list drops sweets', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();

  await page.getByTestId('wizard-next').click();
  await expect(page.getByTestId('wizard-step-2')).toBeVisible();

  // Party-type switch lives on the allergies step; default is hjemme (no barnehage note yet).
  await expect(page.getByTestId('wizard-party-type')).toBeVisible();
  await expect(page.getByTestId('barnehage-info')).toHaveCount(0);

  await page.getByTestId('party-type-barnehage').click();
  await expect(page.getByTestId('barnehage-info')).toBeVisible();

  await page.getByTestId('wizard-next').click();
  await expect(page.getByTestId('wizard-step-3')).toBeVisible();
  await page.getByTestId('wizard-finish').click();

  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Handleliste' })).toBeVisible();

  // Barnehage effect: the guidance note shows, sweets are dropped, fruit stays.
  await expect(page.getByText(/Helsedirektoratet/)).toBeVisible();
  await expect(page.locator('.row-name').filter({ hasText: /Bursdagskake$/ })).toHaveCount(0);
  await expect(page.locator('.row-name').filter({ hasText: /Godteposer$/ })).toHaveCount(0);
  await expect(page.locator('.row-name').filter({ hasText: /Frukt/ })).toBeVisible();
});

test('can skip the wizard from step 1', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();

  await page.getByTestId('wizard-skip').click();

  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Handleliste' })).toBeVisible();
});

test('open wizard button can reopen the wizard after completion', async ({ page }) => {
  await finishDefaultWizard(page);

  await page.getByTestId('open-wizard').click();

  await expect(page.getByTestId('wizard')).toBeVisible();
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();
});
