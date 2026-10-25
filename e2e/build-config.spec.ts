import { expect, test } from '@playwright/test';

const enabled = (value: string | undefined) => value === '1';

test('production build matches injected analytics and MENY flags', async ({ page }) => {
  test.skip(process.env.EXPECT_PRODUCTION_CONFIG !== '1', 'Runs only against the production artifact');

  const analyticsEnabled = enabled(process.env.EXPECT_ANALYTICS_ENABLED);
  const menyEnabled = enabled(process.env.EXPECT_MENY_ENABLED);
  const posthogHost = process.env.EXPECT_POSTHOG_HOST?.trim();
  const analyticsChunks: string[] = [];
  const posthogRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/applicationinsights-web-')) analyticsChunks.push(request.url());
  });
  await page.route(/(?:dc\.services\.visualstudio\.com|applicationinsights\.azure\.com)/, (route) =>
    route.abort()
  );
  // Count PostHog traffic without sending CI events to the production project.
  await page.route(/posthog\.com/, (route) => {
    posthogRequests.push(route.request().url());
    return route.abort();
  });

  await page.goto('/?gjester=12');

  if (menyEnabled) await expect(page.getByTestId('meny-cart-button')).toBeVisible();
  else await expect(page.getByTestId('meny-cart-button')).toHaveCount(0);

  if (posthogHost) {
    await expect.poll(() => posthogRequests.some((url) => url.startsWith(posthogHost))).toBe(true);
  }
  expect(await page.evaluate(() => document.cookie)).not.toMatch(/ph_/);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('ph_')))).toEqual([]);
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter((key) => key.startsWith('ph_')))).toEqual([]);

  if (analyticsEnabled) {
    await expect.poll(() => analyticsChunks.length).toBeGreaterThan(0);
  } else {
    await page.waitForTimeout(500);
    expect(analyticsChunks).toHaveLength(0);
  }
});
