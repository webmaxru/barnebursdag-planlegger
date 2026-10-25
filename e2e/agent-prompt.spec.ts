import { expect, test, type Page } from '@playwright/test';

/**
 * «Prompt til handleagent»: the alternative to the MENY cart. The prompt must carry
 * every item on the shopping list, the allergy rules and the no-checkout rule, and the
 * same text must be available to in-browser agents through the get_agent_prompt WebMCP tool.
 */

async function installFakes(page: Page, clipboard: 'ok' | 'denied' = 'ok') {
  await page.addInitScript((mode) => {
    const store: { tools: any[] } = { tools: [] };
    (window as any).__webmcp = store;
    (window as any).__copied = [];
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      writable: true,
      value: {
        registerTool(tool: any) {
          store.tools.push(tool);
          return Promise.resolve();
        },
        unregisterTool(name: string) {
          store.tools = store.tools.filter((t) => t.name !== name);
        }
      }
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (t: string) => {
          if (mode === 'denied') throw new Error('denied');
          (window as any).__copied.push(t);
        }
      }
    });
  }, clipboard);
}

async function callTool(page: Page, name: string) {
  await expect.poll(() => page.evaluate((n) => (window as any).__webmcp.tools.some((t: any) => t.name === n), name)).toBe(true);
  return page.evaluate(async (n) => {
    const tool = (window as any).__webmcp.tools.find((t: any) => t.name === n);
    return tool.execute({}, { requestUserInteraction: async (cb: () => Promise<unknown>) => cb() });
  }, name);
}

/** Names as the list shows them, without the calculator's own «(= …)» hints. */
async function listItemNames(page: Page): Promise<string[]> {
  const list: any = await callTool(page, 'get_shopping_list');
  return list.structuredContent.categories.flatMap((c: any) => c.items.map((i: any) => String(i.name).replace(/\s*\(=[^)]*\)/g, '').trim()));
}

test('agent prompt contains every list item, the allergy rules and the no-checkout rule', async ({ page }) => {
  await installFakes(page);
  await page.goto('/?alder=6&gjester=10&rett=polser&allergi=gluten:2,svin:1');
  await expect(page.getByTestId('app')).toBeVisible();

  await page.getByTestId('agent-prompt-button').click();
  const modal = page.getByTestId('agent-prompt-modal');
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('agent-prompt-oda')).toHaveAttribute('href', 'https://oda.com/mcp');

  const prompt = await page.getByTestId('agent-prompt-text').inputValue();
  const names = await listItemNames(page);
  expect(names.length).toBeGreaterThan(10);
  for (const name of names) expect(prompt, `prompt is missing «${name}»`).toContain(name);
  expect(names).toEqual(expect.arrayContaining(['Glutenfri lompe/brød', 'Kyllingpølser (uten svin)']));

  // Party facts, allergies and the rules the agent must follow.
  expect(prompt).toContain('10 barn på 6 år');
  expect(prompt).toContain('2 barn har glutenallergi');
  expect(prompt).toContain('1 barn spiser ikke svin');
  expect(prompt).toContain('Allergier er viktigst');
  expect(prompt).toContain('glutenallergi: merket glutenfri');
  expect(prompt).toContain('uten svin: uten svinekjøtt og uten svinegelatin');
  expect(prompt).toContain('ikke legg inn en tilfeldig erstatning');
  expect(prompt).toContain('Ikke gå til kassen');
  expect(prompt).toContain('[FYLL INN: dato og tidsvindu]');
  expect(prompt).toContain('totalsum for handlekurven');
  expect(prompt).toContain('3 × pakke (600 g ≈ 8 stk)');
  expect(prompt).not.toMatch(/[\u00a0\u202f]/);

  // Copy puts exactly the previewed text on the clipboard.
  await page.getByTestId('agent-prompt-copy').click();
  await expect(page.getByRole('status')).toContainText('Prompt kopiert');
  const copied = await page.evaluate(() => (window as any).__copied as string[]);
  expect(copied.at(-1)).toBe(prompt);

  // The WebMCP tool returns the same prompt.
  const res: any = await callTool(page, 'get_agent_prompt');
  expect(res.structuredContent.prompt).toBe(prompt);
  expect(res.structuredContent.itemCount).toBe(names.length);
  expect(res.content[0].text).toBe(prompt);
});

test('agent prompt without allergies says so and keeps the substitution rule', async ({ page }) => {
  await installFakes(page);
  await page.goto('/?alder=6&gjester=10&rett=pizza');
  await page.getByTestId('agent-prompt-button').click();
  const prompt = await page.getByTestId('agent-prompt-text').inputValue();
  for (const name of await listItemNames(page)) expect(prompt).toContain(name);
  expect(prompt).toContain('Allergier og kosthold: ingen oppgitt');
  expect(prompt).toContain('Hovedrett: minipizza');
  expect(prompt).not.toContain('Allergier er viktigst');
  expect(prompt).not.toContain('Lomper');
});

test('agent prompt falls back to selecting the text when the clipboard is blocked', async ({ page }) => {
  await installFakes(page, 'denied');
  await page.goto('/?alder=5&gjester=8');
  await page.getByTestId('agent-prompt-button').click();
  await page.getByTestId('agent-prompt-copy').click();
  await expect(page.getByTestId('agent-prompt-manual')).toBeVisible();
  const selected = await page.evaluate(() => {
    const el = document.getElementById('agent-prompt-text') as HTMLTextAreaElement;
    return document.activeElement === el && el.selectionEnd - el.selectionStart === el.value.length;
  });
  expect(selected).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('agent-prompt-modal')).toHaveCount(0);
});
