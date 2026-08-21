import { expect, test } from '@playwright/test';

const enabled = (value: string | undefined) => value === '1';

test('production build matches injected analytics and MENY flags', async ({ page }) => {
  test.skip(process.env.EXPECT_PRODUCTION_CONFIG !== '1', 'Runs only against the production artifact');

  const analyticsEnabled = enabled(process.env.EXPECT_ANALYTICS_ENABLED);
  const menyEnabled = enabled(process.env.EXPECT_MENY_ENABLED);
  const analyticsChunks: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/applicationinsights-web-')) analyticsChunks.push(request.url());
  });
  await page.route(/(?:dc\.services\.visualstudio\.com|applicationinsights\.azure\.com)/, (route) =>
    route.abort()
  );

  await page.goto('/?gjester=12');

  if (menyEnabled) await expect(page.getByTestId('meny-cart-button')).toBeVisible();
  else await expect(page.getByTestId('meny-cart-button')).toHaveCount(0);

  if (analyticsEnabled) {
    await expect.poll(() => analyticsChunks.length).toBeGreaterThan(0);
  } else {
    await page.waitForTimeout(500);
    expect(analyticsChunks).toHaveLength(0);
  }
});
