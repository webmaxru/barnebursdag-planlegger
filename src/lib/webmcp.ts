import { useEffect, useRef, type MutableRefObject } from 'react';
import type { GoodItem, PartyConfig } from './types';
import { computePlan, CATEGORY_LABEL, type PlanResult } from './engine';
import { shareUrl } from './store';
import { track } from './analytics';

/**
 * WebMCP integration for Kakeklar.
 *
 * Exposes the party planner to in-browser AI agents through the imperative
 * WebMCP API (`document.modelContext.registerTool`, with a `navigator.modelContext`
 * fallback for older Chrome previews). Two tools are registered — one that writes
 * the party configuration and regenerates the shopping list, and one read-only
 * tool that returns the current list. Both declare a strict `inputSchema` and a
 * `outputSchema` (result schema) and return MCP-style structured content.
 *
 * See `.agents/skills/webmcp/references/webmcp-reference.md` for the contract.
 */

const ALLERGY_KEYS = ['gluten', 'melk', 'egg', 'nott', 'svin'] as const;

// ---------------------------------------------------------------------------
// Result schema — shared by both tools (the "result schema" the agent reads).
// ---------------------------------------------------------------------------
const SHOPPING_LIST_OUTPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  description: 'The generated birthday-party shopping list and the settings it was computed from.',
  properties: {
    party: {
      type: 'object',
      description: 'The party settings the list was computed from.',
      properties: {
        age: { type: 'integer', description: "The birthday child's age in years." },
        guests: { type: 'integer', description: 'Number of child guests.' },
        adults: { type: 'integer', description: 'Accompanying adults who also eat.' },
        type: { type: 'string', enum: ['hjemme', 'barnehage'], description: "Venue: 'hjemme' (home) or 'barnehage' (kindergarten)." },
        duration: { type: 'integer', description: 'Party length in hours.' },
        mainDish: { type: 'string', enum: ['polser', 'pizza'], description: "Main dish: 'polser' (hot dogs) or 'pizza'." },
        breadRatio: { type: 'integer', description: 'Percent of bread that is lompe; the rest is hot-dog buns.' },
        allergies: {
          type: 'object',
          description: 'Number of child guests with each dietary restriction.',
          additionalProperties: { type: 'integer' },
        },
      },
      required: ['age', 'guests', 'adults', 'type', 'duration', 'mainDish', 'breadRatio', 'allergies'],
    },
    itemCount: { type: 'integer', description: 'Total number of distinct items to buy.' },
    estimatedCostNok: {
      type: ['object', 'null'],
      description: 'Estimated total cost in NOK, or null when no priced items are on the list.',
      properties: {
        min: { type: 'integer', description: 'Lower estimate in NOK.' },
        max: { type: 'integer', description: 'Upper estimate in NOK.' },
      },
      required: ['min', 'max'],
    },
    categories: {
      type: 'array',
      description: 'Shopping list grouped by category.',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['mat', 'drikke', 'servise', 'pynt', 'godteri'], description: 'Category id.' },
          label: { type: 'string', description: 'Human-readable Norwegian category name.' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Catalog item id.' },
                name: { type: 'string', description: 'Item name (Norwegian).' },
                quantity: { type: 'number', description: 'Needed quantity.' },
                unit: { type: 'string', description: "Unit for the quantity, e.g. 'stk', 'dl', 'pakke'." },
                packs: { type: ['integer', 'null'], description: 'Number of packs to buy, when the item is sold in packs.' },
                buyQty: { type: ['number', 'null'], description: 'Total amount purchased once rounded up to whole packs.' },
                packLabel: { type: ['string', 'null'], description: "Pack description, e.g. 'pakke (8 stk)'." },
                priceMinNok: { type: ['number', 'null'], description: 'Lower price estimate in NOK.' },
                priceMaxNok: { type: ['number', 'null'], description: 'Upper price estimate in NOK.' },
                note: { type: ['string', 'null'], description: 'Allergy-safety or alternative note, when relevant.' },
              },
              required: ['id', 'name', 'quantity', 'unit'],
            },
          },
        },
        required: ['category', 'label', 'items'],
      },
    },
    shareUrl: { type: 'string', description: 'Absolute URL that reproduces this exact list.' },
  },
  required: ['party', 'itemCount', 'estimatedCostNok', 'categories', 'shareUrl'],
};

const PLAN_INPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    age: { type: 'integer', minimum: 1, maximum: 14, description: "The birthday child's age in years (barnets alder)." },
    guests: { type: 'integer', minimum: 1, maximum: 40, description: 'Number of child guests attending (antall barn).' },
    adults: { type: 'integer', minimum: 0, maximum: 20, description: 'Accompanying adults who stay and also eat (voksne). Defaults to the current value.' },
    type: { type: 'string', enum: ['hjemme', 'barnehage'], description: "Where the party is held: 'hjemme' (at home) or 'barnehage' (kindergarten). Defaults to the current value." },
    duration: { type: 'integer', minimum: 1, maximum: 5, description: 'Party length in hours (varighet). Defaults to the current value.' },
    mainDish: { type: 'string', enum: ['polser', 'pizza'], description: "Main dish: 'polser' (hot dogs) or 'pizza'. Defaults to the current value." },
    breadRatio: { type: 'integer', minimum: 0, maximum: 100, description: 'Percent of the bread that is soft potato lompe; the rest is hot-dog buns. Only relevant when mainDish is polser. Defaults to the current value.' },
    allergies: {
      type: 'object',
      description: 'Number of child guests with each dietary restriction. Omit a key when no guest has that restriction.',
      properties: {
        gluten: { type: 'integer', minimum: 0, description: 'Child guests with gluten allergy.' },
        melk: { type: 'integer', minimum: 0, description: 'Child guests with milk allergy.' },
        egg: { type: 'integer', minimum: 0, description: 'Child guests with egg allergy.' },
        nott: { type: 'integer', minimum: 0, description: 'Child guests with nut allergy.' },
        svin: { type: 'integer', minimum: 0, description: 'Child guests who do not eat pork.' },
      },
      additionalProperties: false,
    },
  },
  required: ['age', 'guests'],
  additionalProperties: false,
};

const EMPTY_INPUT_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {},
  additionalProperties: false,
};

// ---------------------------------------------------------------------------
// Serialization + result helpers.
// ---------------------------------------------------------------------------
type ShoppingListResult = ReturnType<typeof serializeShoppingList>;

function serializeShoppingList(cfg: PartyConfig, plan: PlanResult) {
  return {
    party: {
      age: cfg.age,
      guests: cfg.guests,
      adults: cfg.adults,
      type: cfg.type,
      duration: cfg.duration,
      mainDish: cfg.mainDish,
      breadRatio: cfg.breadRatio,
      allergies: { ...cfg.allergies },
    },
    itemCount: plan.itemCount,
    estimatedCostNok: plan.hasPrice
      ? { min: Math.round(plan.priceMin), max: Math.round(plan.priceMax) }
      : null,
    categories: plan.groups.map((g) => ({
      category: g.category,
      label: CATEGORY_LABEL[g.category],
      items: g.items.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.neededQty,
        unit: it.unit,
        packs: it.packs ?? null,
        buyQty: it.buyQty ?? null,
        packLabel: it.packUnit ?? null,
        priceMinNok: it.priceMin ?? null,
        priceMaxNok: it.priceMax ?? null,
        note: it.note ? it.note : null,
      })),
    })),
    shareUrl: shareUrl(cfg),
  };
}

function summaryText(data: ShoppingListResult): string {
  const cost = data.estimatedCostNok
    ? `, estimert ${data.estimatedCostNok.min}–${data.estimatedCostNok.max} kr`
    : '';
  return `Handleliste for ${data.party.guests} gjester på ${data.party.age} år: ${data.itemCount} varer${cost}.`;
}

function toolResult(structuredContent: ShoppingListResult, text: string) {
  return {
    content: [{ type: 'text', text }],
    structuredContent,
  };
}

function toolError(text: string) {
  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

/** Coerce to a whole number and reject values outside [lo, hi]. */
function intInRange(value: unknown, lo: number, hi: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  if (n < lo || n > hi) return null;
  return n;
}

// ---------------------------------------------------------------------------
// Tool definitions.
// ---------------------------------------------------------------------------
export interface WebMcpToolsArgs {
  cfg: PartyConfig;
  catalog: GoodItem[];
  onChange: (cfg: PartyConfig) => void;
  /** Called after a successful plan write so the host can reveal the result view. */
  onPlanned?: () => void;
}

function buildPartyTools(ref: MutableRefObject<WebMcpToolsArgs>): ModelContextTool[] {
  const planTool: ModelContextTool = {
    name: 'plan_birthday_party',
    title: 'Planlegg barnebursdag',
    description:
      "Configure the Norwegian kids' birthday party (child's age, number of child guests, accompanying adults, venue, duration, main dish, bread split and per-allergy guest counts) and generate the age-aware shopping list. Use this whenever the user wants to set up or adjust the party and see what to buy.",
    inputSchema: PLAN_INPUT_SCHEMA,
    outputSchema: SHOPPING_LIST_OUTPUT_SCHEMA,
    annotations: { readOnlyHint: false },
    execute: (input: any) => {
      const args = ref.current;
      const current = args.cfg;

      const age = intInRange(input?.age, 1, 14);
      if (age == null) return toolError('Ugyldig «age». Oppgi barnets alder som et heltall mellom 1 og 14.');
      const guests = intInRange(input?.guests, 1, 40);
      if (guests == null) return toolError('Ugyldig «guests». Oppgi antall barn som et heltall mellom 1 og 40.');

      let adults = current.adults;
      if (input?.adults != null) {
        const v = intInRange(input.adults, 0, 20);
        if (v == null) return toolError('Ugyldig «adults». Oppgi antall voksne som et heltall mellom 0 og 20.');
        adults = v;
      }

      let duration = current.duration;
      if (input?.duration != null) {
        const v = intInRange(input.duration, 1, 5);
        if (v == null) return toolError('Ugyldig «duration». Oppgi varighet i timer som et heltall mellom 1 og 5.');
        duration = v;
      }

      let breadRatio = current.breadRatio;
      if (input?.breadRatio != null) {
        const v = intInRange(input.breadRatio, 0, 100);
        if (v == null) return toolError('Ugyldig «breadRatio». Oppgi prosent lompe som et heltall mellom 0 og 100.');
        breadRatio = v;
      }

      let type = current.type;
      if (input?.type != null) {
        if (input.type !== 'hjemme' && input.type !== 'barnehage') {
          return toolError('Ugyldig «type». Bruk «hjemme» eller «barnehage».');
        }
        type = input.type;
      }

      let mainDish = current.mainDish;
      if (input?.mainDish != null) {
        if (input.mainDish !== 'polser' && input.mainDish !== 'pizza') {
          return toolError('Ugyldig «mainDish». Bruk «polser» eller «pizza».');
        }
        mainDish = input.mainDish;
      }

      let allergies = current.allergies;
      if (input?.allergies != null) {
        if (typeof input.allergies !== 'object' || Array.isArray(input.allergies)) {
          return toolError('Ugyldig «allergies». Oppgi et objekt med antall barn per restriksjon.');
        }
        const next: Record<string, number> = {};
        for (const key of ALLERGY_KEYS) {
          const raw = (input.allergies as Record<string, unknown>)[key];
          if (raw == null) continue;
          const v = intInRange(raw, 0, guests);
          if (v == null) {
            return toolError(`Ugyldig «allergies.${key}». Oppgi et heltall mellom 0 og ${guests} (antall gjester).`);
          }
          if (v > 0) next[key] = v;
        }
        allergies = next;
      }

      const nextCfg: PartyConfig = { ...current, age, guests, adults, type, duration, mainDish, breadRatio, allergies };
      args.onChange(nextCfg);
      args.onPlanned?.();

      const plan = computePlan(args.catalog, nextCfg);
      const data = serializeShoppingList(nextCfg, plan);
      track('webmcp_tool', { tool: 'plan_birthday_party', guests, age });
      return toolResult(data, summaryText(data));
    },
  };

  const listTool: ModelContextTool = {
    name: 'get_shopping_list',
    title: 'Hent handleliste',
    description:
      'Return the current birthday-party shopping list exactly as shown on the page: every item to buy with quantities, pack sizes, allergy notes, the estimated total cost, and a shareable URL. Use this to read the plan without changing any settings.',
    inputSchema: EMPTY_INPUT_SCHEMA,
    outputSchema: SHOPPING_LIST_OUTPUT_SCHEMA,
    annotations: { readOnlyHint: true },
    execute: () => {
      const args = ref.current;
      const plan = computePlan(args.catalog, args.cfg);
      const data = serializeShoppingList(args.cfg, plan);
      track('webmcp_tool', { tool: 'get_shopping_list', guests: args.cfg.guests, age: args.cfg.age });
      return toolResult(data, summaryText(data));
    },
  };

  return [planTool, listTool];
}

// ---------------------------------------------------------------------------
// React hook: register the tools once on mount, keep them fed with latest state.
// ---------------------------------------------------------------------------
export function useWebMcpTools(args: WebMcpToolsArgs): void {
  // Tools are registered once, but their `execute` callbacks must always see the
  // latest cfg/catalog/handlers — so we read them through a ref updated each render.
  const ref = useRef(args);
  ref.current = args;

  useEffect(() => {
    const modelContext =
      (typeof document !== 'undefined' && document.modelContext) ||
      (typeof navigator !== 'undefined' && navigator.modelContext) ||
      null;
    if (!modelContext) return; // Normal browsers without the WebMCP preview: no-op.

    const controller = new AbortController();
    const registered: string[] = [];
    const tools = buildPartyTools(ref);

    // registerTool() is synchronous on older builds and returns a Promise on
    // Chrome 151+. Awaiting inside try/catch handles both, and keeps each tool
    // independent so one failure never blocks the other.
    void (async () => {
      for (const tool of tools) {
        try {
          await modelContext.registerTool(tool, { signal: controller.signal });
          registered.push(tool.name);
        } catch (error) {
          console.error(`WebMCP: kunne ikke registrere verktøyet «${tool.name}»`, error);
        }
      }
    })();

    return () => {
      // Transitional cleanup: unregisterTool() still exists on Chrome 146–147,
      // while 148+ relies on aborting the signal. Do both for compatibility.
      for (const name of registered.splice(0).reverse()) {
        try {
          modelContext.unregisterTool?.(name);
        } catch {
          /* ignore stale cleanup during teardown */
        }
      }
      controller.abort();
    };
    // Register once; execute callbacks read fresh state via `ref`.
  }, []);
}
