import { expect, test } from '@playwright/test';

const redirects = [
  ['/barnehagebursdag', '/guider/barnehagebursdag'],
  ['/allergier-i-barnebursdag', '/guider/allergier-i-barnebursdag'],
  ['/slik-beregner-kakeklar', '/guider/slik-beregner-kakeklar']
];

test('non-canonical URLs redirect once to the apex path without a trailing slash', async ({ request }) => {
  const slash = await request.get('/kontakt/?fra=test', { maxRedirects: 0 });
  expect(slash.status()).toBe(301);
  expect(slash.headers().location).toBe('/kontakt?fra=test');

  const guide = await request.get('/guider/barnehagebursdag/', { maxRedirects: 0 });
  expect(guide.status()).toBe(301);
  expect(guide.headers().location).toBe('/guider/barnehagebursdag');

  const legacy = await request.get('/barnehagebursdag/', { maxRedirects: 0 });
  expect(legacy.status()).toBe(301);
  expect(legacy.headers().location).toBe('/guider/barnehagebursdag');

  const www = await request.get('/om-utvikleren/', { maxRedirects: 0, headers: { host: 'www.kakeklar.no' } });
  expect(www.status()).toBe(301);
  expect(www.headers().location).toBe('https://kakeklar.no/om-utvikleren');

  const azure = await request.get('/kontakt', {
    maxRedirects: 0,
    headers: { host: 'jolly-cliff-01972b603.7.azurestaticapps.net' }
  });
  expect(azure.status()).toBe(301);
  expect(azure.headers().location).toBe('https://kakeklar.no/kontakt');

  expect((await request.get('/kontakt')).status()).toBe(200);
  expect((await request.get('/')).status()).toBe(200);
});

test('legacy guide links redirect permanently before static serving', async ({ request }) => {
  for (const [from, to] of redirects) {
    for (const suffix of ['', '/']) {
      const response = await request.get(from + suffix, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers().location).toBe(to);
    }
    expect((await request.get(to)).status()).toBe(200);
  }
});

test('content is crawlable with unique metadata and real not-found responses', async ({ browser, request }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const path of ['/guider/barnehagebursdag', '/oppskrifter/sjokoladekake-i-langpanne', '/kontakt']) {
    const response = await page.goto(`http://localhost:8080${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://kakeklar.no${path}`);
    expect(await page.title()).not.toBe('Kakeklar');
  }
  const missing = await request.get('/en-side-som-ikke-finnes');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Fant ikke siden');
  const sitemap = await request.get('/sitemap.xml');
  expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(32);
  const changelog = await (await request.get('/nytt')).text();
  expect(changelog).toContain('Nytt på Kakeklar');
  expect(changelog).toContain('href="/nytt"');
  expect(changelog).toContain('Handlelisten kan sendes til en handlekurv hos MENY');
  const home = await (await request.get('/')).text();
  expect(home).toContain('Ny: Prisindeks for barnebursdag – november 2026');
  expect(home).toContain('679,50 kr');
  expect(home).toContain('href="/guider/prisindeks-bursdagskurv"');
  const index = await (await request.get('/guider/prisindeks-bursdagskurv')).text();
  expect(index).toContain('"@type":"Dataset"');
  expect(index).toContain('https://kakeklar.no/prisindeks/2026-11.csv');
  const csv = await request.get('/prisindeks/2026-11.csv');
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain('REMA 1000');
  await context.close();
});

test('main navigation and breadcrumbs have 40px touch targets', async ({ page }) => {
  await page.goto('/guider/barnehagebursdag');
  const links = page.locator('.site-nav a, .breadcrumbs a');
  expect(await links.count()).toBeGreaterThan(3);
  for (const link of await links.all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth)
  );
});

test('trust pages, ads.txt, robots and sitemap use the canonical site', async ({ request }) => {
  const contact = await (await request.get('/kontakt')).text();
  expect(contact).toContain('mailto:salnikov&#64;gmail.com');
  expect(contact).toContain('>salnikov&#64;gmail.com<');
  expect(contact).toContain('rel="canonical" href="https://kakeklar.no/kontakt"');
  expect(contact).not.toMatch(/\b[Vv]i\b/);
  expect(contact).not.toContain('TODO');

  const author = await (await request.get('/om-utvikleren')).text();
  expect(author).toContain('src="/img/maxim.jpg"');
  expect(author).toContain('width="400"');
  expect(author).toContain('height="400"');
  expect(author).toContain('alt="Portrett av Maxim Salnikov"');
  expect(author).toContain('"jobTitle":"Senior Solution Engineer"');
  expect(author).toContain('https://sessionize.com/maxim-salnikov');
  expect(author).toContain('https://www.linkedin.com/in/webmax/');
  expect(author).toContain('far til to barn, på 15 og 4 år');
  expect(author).not.toContain('TODO');
  expect((await request.get('/img/maxim.jpg')).status()).toBe(200);

  const about = await (await request.get('/om-kakeklar')).text();
  expect(about).toContain('far til to barn på 15 og 4 år');
  const guide = await (await request.get('/guider/hvor-mye-mat-til-barnebursdag')).text();
  expect(guide).toContain('far til to barn på 15 og 4 år og utvikleren bak Kakeklar');

  const ads = await (await request.get('/ads.txt')).text();
  expect(ads.trim()).toBe('google.com, pub-6118980043742623, DIRECT, f08c47fec0942fa0');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://kakeklar.no/sitemap.xml');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs.length).toBeGreaterThan(20);
  for (const loc of locs) {
    expect(loc.startsWith('https://kakeklar.no/'), loc).toBe(true);
    expect(loc.endsWith('/') && loc !== 'https://kakeklar.no/', loc).toBe(false);
    expect(loc.includes('www.'), loc).toBe(false);
  }
  const missing = await request.get('/denne-siden-finnes-ikke');
  expect(missing.status()).toBe(404);
  expect(await missing.text()).toContain('Fant ikke siden');
});

test('static and React contact pages contain resolved contact information', async ({ page, request }) => {
  const response = await request.get('/content.json');
  const pages: { path: string; html: string }[] = await response.json();
  const contact = pages.find((entry) => entry.path === '/kontakt');
  if (!contact) throw new Error('Built content is missing /kontakt');
  expect(contact.html).not.toContain('{{contact_email}}');

  await page.goto('/kontakt');
  await expect(page.locator('.content-body')).not.toContainText('{{contact_email}}');
  await expect(page.locator('.content-body a').first()).toBeVisible();

  const shell = await (await request.get('/')).text();
  await page.route('**/kontakt', (route) => route.fulfill({ contentType: 'text/html', body: shell }));
  await page.goto('/kontakt');
  // The browser decodes &#64; when it parses the shared HTML into the DOM.
  await expect(page.locator('.content-body > div')).toHaveJSProperty('innerHTML', contact.html.replaceAll('&#64;', '@'));
  await expect(page.locator('.content-body a[href="mailto:salnikov@gmail.com"]')).toHaveText('salnikov@gmail.com');
});

test('offline home aliases use the shell refreshed by an online visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
    const names = await caches.keys();
    const name = names.find((entry) => entry.startsWith('bursdag-'));
    if (!name) throw new Error('Service worker did not create its cache');
    const cache = await caches.open(name);
    await cache.put('/', new Response('<title>Stale install shell</title>', { headers: { 'Content-Type': 'text/html' } }));
  });
  await page.goto('/?gjester=12');
  await expect(page).toHaveTitle(/Kakeklar/);
  await context.setOffline(true);
  for (const path of ['/', '/?gjester=8', '/index.html']) {
    await page.goto(path);
    await expect(page).toHaveTitle(/Kakeklar/);
    await expect(page.getByTestId('wizard').or(page.getByTestId('app'))).toBeVisible();
  }
});

test('agentprose: snippet once per page and an index of every guide and recipe for the Cloud crawler', async ({ request }) => {
  for (const path of ['/', '/guider/barnehagebursdag', '/oppskrifter/bursdagsmuffins', '/personvern']) {
    const html = await (await request.get(path)).text();
    expect(html.match(/agentprose\.min\.js/g), path).toHaveLength(1);
    expect(html, path).toContain('data-key="pk_fJJtZLOFInWKFuyN"');
  }
  const response = await request.get('/agentprose.json');
  expect(response.status()).toBe(200);
  const index = await response.json();
  expect(index.site.url).toBe('https://kakeklar.no/');
  expect(index.posts.length).toBeGreaterThanOrEqual(20);
  const muffins = index.posts.find((p: { url: string }) => p.url === 'https://kakeklar.no/oppskrifter/bursdagsmuffins');
  expect(muffins.markdown).toContain('## Ingredienser');
});
