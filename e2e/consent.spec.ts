import { expect, test } from '@playwright/test';

const manager = '**/fundingchoicesmessages.google.com/i/pub-6118980043742623?ers=1';
const readyManager = `
  window.googlefc.showRevocationMessage = function () {
    localStorage.setItem('test-consent', 'withdrawn');
    document.querySelector('[data-consent-status]').dataset.revoked = 'true';
  };
  var queued = window.googlefc.callbackQueue;
  window.googlefc.callbackQueue = { push: function (entry) { entry.CONSENT_DATA_READY(); } };
  queued.forEach(function (entry) { entry.CONSENT_DATA_READY(); });
`;

test('guide to privacy flow loads only the CMP on demand and opens consent withdrawal', async ({ page }) => {
  const errors: Error[] = [];
  const ads: string[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.route('**/pagead2.googlesyndication.com/**', (route) => {
    ads.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body: '' });
  });
  await page.route(manager, (route) => route.fulfill({ contentType: 'application/javascript', body: readyManager }));
  await page.goto('/guider/hvor-mye-mat-til-barnebursdag');
  // A slow third-party script must not delay the consent control on the next page.
  await page.route('**/agentprose.cloud/**', () => {});
  await page.evaluate(() => localStorage.setItem('test-consent', 'granted'));
  await page.locator('.foot-nav a[href="/personvern"]').click();
  expect(await page.evaluate(() => localStorage.getItem('test-consent'))).toBe('granted');
  const adCount = ads.length;
  await expect(page.locator('script[data-consent-manager]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Endre samtykke til annonser' }).click();
  await expect(page.locator('[data-consent-status]')).toHaveAttribute('data-revoked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('test-consent'))).toBe('withdrawn');
  await expect(page.locator('.ad-slot, script[src*="adsbygoogle.js"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Endre samtykke til annonser' }).click();
  await expect(page.locator('script[data-consent-manager]')).toHaveCount(1);
  expect(ads.length).toBe(adCount);
  expect(errors).toEqual([]);
});

test('blocked CMP reports an error and permits retry instead of claiming no cookies exist', async ({ page }) => {
  await page.route(manager, (route) => route.abort());
  await page.goto('/personvern');
  const button = page.getByRole('button', { name: 'Endre samtykke til annonser' });
  await button.click();
  await expect(page.locator('[data-consent-status]')).toContainText('kunne ikke åpnes');
  await expect(button).toBeEnabled();
  await page.unroute(manager);
  await page.route(manager, (route) => route.fulfill({ contentType: 'application/javascript', body: readyManager }));
  await button.click();
  await expect(page.locator('[data-consent-status]')).toHaveAttribute('data-revoked', 'true');
});

test('unresponsive CMP times out visibly and stale callbacks cannot open duplicate dialogs', async ({ page }) => {
  await page.clock.install();
  await page.route(manager, (route) => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.goto('/personvern');
  const button = page.getByRole('button', { name: 'Endre samtykke til annonser' });
  await button.click();
  await page.clock.fastForward(15001);
  await expect(page.locator('[data-consent-status]')).toContainText('kunne ikke åpnes');
  await expect(button).toBeEnabled();
  await page.unroute(manager);
  await page.route(manager, (route) => route.fulfill({
    contentType: 'application/javascript',
    body: readyManager.replace("localStorage.setItem('test-consent', 'withdrawn');",
      "document.documentElement.dataset.opened = String(Number(document.documentElement.dataset.opened || 0) + 1);")
  }));
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('data-opened', '1');
});

test('React privacy fallback has the same working withdrawal control', async ({ page, request }) => {
  const shell = await (await request.get('/')).text();
  await page.route('**/personvern', (route) => route.fulfill({ contentType: 'text/html', body: shell }));
  await page.route(manager, (route) => route.fulfill({ contentType: 'application/javascript', body: readyManager }));
  await page.goto('/personvern');
  await page.getByRole('button', { name: 'Endre samtykke til annonser' }).click();
  await expect(page.locator('[data-consent-status]')).toHaveAttribute('data-revoked', 'true');
});
