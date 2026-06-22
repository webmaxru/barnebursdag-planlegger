import { expect, test, type Page } from '@playwright/test';

async function gotoApp(page: Page, query = '') {
  await page.goto('/' + query);
  if (query) {
    // Any URL param makes the app skip the wizard and open the result directly.
    await expect(page.getByTestId('app')).toBeVisible();
  } else {
    await expect(page.getByTestId('wizard')).toBeVisible();
    await page.getByTestId('wizard-skip').click();
    await expect(page.getByTestId('app')).toBeVisible();
  }
}

test('MENY cart button is hidden by default (feature flag off)', async ({ page }) => {
  await gotoApp(page);

  await expect(page.getByTestId('open-wizard')).toBeVisible();
  await expect(page.getByTestId('meny-cart-button')).toHaveCount(0);
});

test('MENY cart button appears in preview mode (?meny=1)', async ({ page }) => {
  await gotoApp(page, '?meny=1');

  await expect(page.getByTestId('meny-cart-button')).toBeVisible();
});

test('MENY cart flow shows a shareable link', async ({ page }) => {
  await page.route('**/api/meny/cart', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        url: 'https://meny.no/delt-handlevogn/test-123',
        id: 'test-123',
        count: 2,
        matched: [
          { name: 'Pølser', query: 'grillpølse', ean: '1', title: 'Grillpølser', subtitle: '600g', brand: 'Prior', price: 56.9, quantity: 3 },
          { name: 'Lomper', query: 'lomper', ean: '2', title: 'Lomper', subtitle: '10stk', brand: '', price: 10.8, quantity: 3 }
        ],
        unmatched: [{ name: 'Bursdagskrone', query: 'krone' }]
      })
    })
  );

  await gotoApp(page, '?meny=1');

  await page.getByTestId('meny-cart-button').click();
  await expect(page.getByTestId('meny-cart-modal')).toBeVisible();
  await expect(page.getByTestId('meny-cart-link')).toHaveValue('https://meny.no/delt-handlevogn/test-123');
  await expect(page.getByText('Grillpølser')).toBeVisible();
});
