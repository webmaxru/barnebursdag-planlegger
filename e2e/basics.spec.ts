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
}

test('title contains Kakeklar', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Kakeklar/);
});

test('age slider max is 14', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#alder')).toHaveAttribute('max', '14');
});

test('flag recommendations are not shown after finishing the wizard', async ({ page }) => {
  await finishDefaultWizard(page);

  await expect(page.getByText(/Norske bordflagg|flagg/i)).toHaveCount(0);
});

test('mobile layout has no horizontal scroll', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only horizontal scroll check');

  await finishDefaultWizard(page);

  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)
    )
    .toBe(true);
});
