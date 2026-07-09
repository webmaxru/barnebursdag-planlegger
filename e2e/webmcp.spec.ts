import { expect, test, type Page } from '@playwright/test';

/**
 * WebMCP integration tests.
 *
 * Real WebMCP needs a flagged Chrome preview, so these specs inject a fake
 * `document.modelContext` before the app loads. The fake records the tools the
 * app registers, letting us deterministically assert schemas and execute the
 * tools — exactly what the WebMCP skill's "validate behavior" step recommends.
 */

async function installFakeModelContext(page: Page) {
  await page.addInitScript(() => {
    const store: { tools: any[] } = { tools: [] };
    (window as any).__webmcp = store;
    const modelContext = {
      registerTool(tool: any) {
        store.tools.push(tool);
        return Promise.resolve();
      },
      unregisterTool(name: string) {
        store.tools = store.tools.filter((t) => t.name !== name);
      }
    };
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      writable: true,
      value: modelContext
    });
  });
}

function toolNames(page: Page) {
  return page.evaluate(() => (window as any).__webmcp.tools.map((t: any) => t.name));
}

async function callTool(page: Page, name: string, input: unknown) {
  return page.evaluate(
    async ({ name, input }) => {
      const tool = (window as any).__webmcp.tools.find((t: any) => t.name === name);
      if (!tool) throw new Error(`tool ${name} not registered`);
      const client = { requestUserInteraction: async (cb: () => Promise<unknown>) => cb() };
      return tool.execute(input, client);
    },
    { name, input }
  );
}

test('registers both WebMCP tools with input and result schemas', async ({ page }) => {
  await installFakeModelContext(page);
  await page.goto('/');
  await expect(page.getByTestId('wizard')).toBeVisible();

  await expect.poll(() => toolNames(page)).toEqual(
    expect.arrayContaining(['plan_birthday_party', 'get_shopping_list'])
  );

  const tools = await page.evaluate(() =>
    (window as any).__webmcp.tools.map((t: any) => ({
      name: t.name,
      readOnly: t.annotations?.readOnlyHint ?? false,
      hasInput: !!t.inputSchema,
      outputRequired: t.outputSchema?.required ?? null
    }))
  );

  const plan = tools.find((t: any) => t.name === 'plan_birthday_party');
  const list = tools.find((t: any) => t.name === 'get_shopping_list');

  // Result schemas are obligatory: both tools must declare one.
  expect(plan.outputRequired).toEqual(
    expect.arrayContaining(['party', 'itemCount', 'categories', 'shareUrl'])
  );
  expect(list.outputRequired).toEqual(
    expect.arrayContaining(['party', 'itemCount', 'categories', 'shareUrl'])
  );
  expect(plan.hasInput).toBe(true);
  expect(plan.readOnly).toBe(false);
  expect(list.readOnly).toBe(true);
});

test('plan_birthday_party updates config and returns a structured shopping list', async ({ page }) => {
  await installFakeModelContext(page);
  await page.goto('/');
  await expect.poll(() => toolNames(page)).toContain('plan_birthday_party');

  const result: any = await callTool(page, 'plan_birthday_party', { age: 7, guests: 9, adults: 2 });

  expect(result.isError).toBeFalsy();
  expect(result.structuredContent.party.guests).toBe(9);
  expect(result.structuredContent.party.age).toBe(7);
  expect(result.structuredContent.party.adults).toBe(2);
  expect(result.structuredContent.itemCount).toBeGreaterThan(0);
  expect(result.structuredContent.categories.length).toBeGreaterThan(0);
  expect(result.structuredContent.shareUrl).toContain('gjester=9');

  // The tool's effect must be visible on the page: result view now shows 9 guests.
  await expect(page.getByTestId('app')).toBeVisible();
  await expect(page.getByLabel('Antall gjester')).toHaveValue('9');
});

test('get_shopping_list reflects the current settings without changing them', async ({ page }) => {
  await installFakeModelContext(page);
  await page.goto('/');
  await expect.poll(() => toolNames(page)).toContain('get_shopping_list');

  await callTool(page, 'plan_birthday_party', { age: 6, guests: 12 });
  await expect(page.getByLabel('Antall gjester')).toHaveValue('12');

  const result: any = await callTool(page, 'get_shopping_list', {});
  expect(result.structuredContent.party.guests).toBe(12);
  expect(result.structuredContent.party.age).toBe(6);
  expect(result.structuredContent.itemCount).toBeGreaterThan(0);
});

test('plan_birthday_party rejects out-of-range input with a corrective error', async ({ page }) => {
  await installFakeModelContext(page);
  await page.goto('/');
  await expect.poll(() => toolNames(page)).toContain('plan_birthday_party');

  const result: any = await callTool(page, 'plan_birthday_party', { age: 0, guests: 9 });
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toBeUndefined();
  expect(result.content[0].text).toContain('age');
});
