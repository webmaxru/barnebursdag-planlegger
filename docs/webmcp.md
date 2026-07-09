# WebMCP tools

Kakeklar exposes its planner to in-browser AI agents through **WebMCP** — a proposed
web standard where a page registers imperative "tools" on `document.modelContext`
(with a `navigator.modelContext` fallback for older Chrome previews). An agent running
in a WebMCP-capable browser can then plan a party and read the shopping list directly,
instead of scraping the DOM.

Everything is client-side and additive: in a normal browser `document.modelContext` is
absent, so the integration is a no-op and the app behaves exactly as before.

## Where it lives

| Need | File |
|------|------|
| Tool schemas, serializer, `useWebMcpTools` hook | `src/lib/webmcp.ts` |
| Ambient types for the WebMCP DOM API | `src/webmcp.d.ts` |
| Registration wiring | `src/App.tsx` (`useWebMcpTools({ cfg, catalog, onChange, onPlanned })`) |
| Deterministic validation | `e2e/webmcp.spec.ts` |

The skill that guided this integration is installed via APM at
`.agents/skills/webmcp/` (`apm install webmaxru/web-ai-agent-skills/skills/webmcp`).

## The two tools

Both are **imperative** and both declare an `inputSchema` **and** an `outputSchema`
(the result schema). Each returns MCP-style structured content:
`{ content: [{ type: 'text', text }], structuredContent }`, where `structuredContent`
matches the result schema.

### 1. `plan_birthday_party` (write)

Configures the party and regenerates the shopping list. Input mirrors `PartyConfig`:

| Field | Type | Range | Notes |
|-------|------|-------|-------|
| `age` | integer | 1–14 | **required** — the child's age |
| `guests` | integer | 1–40 | **required** — number of child guests |
| `adults` | integer | 0–20 | accompanying adults who also eat |
| `type` | enum | `hjemme` \| `barnehage` | home vs kindergarten |
| `duration` | integer | 1–5 | party length in hours |
| `mainDish` | enum | `polser` \| `pizza` | |
| `breadRatio` | integer | 0–100 | percent lompe (rest is pølsebrød) |
| `allergies` | object | per-key `0..guests` | `gluten`, `melk`, `egg`, `nott`, `svin` |

Only `age` and `guests` are required; omitted fields keep their current value. Input is
validated loosely in the schema and **strictly in code** — out-of-range values return a
corrective Norwegian error (`isError: true`) instead of silently clamping. After a
successful call `onPlanned` reveals the Handleliste so the agent's effect is visible on
the page. Not `readOnly`.

### 2. `get_shopping_list` (read-only)

Returns the current shopping list without changing anything (`readOnlyHint: true`).
Takes no input.

## Result schema (`structuredContent`)

```jsonc
{
  "party": { "age", "guests", "adults", "type", "duration", "mainDish", "breadRatio", "allergies" },
  "itemCount": 0,
  "estimatedCostNok": { "min": 0, "max": 0 } /* or null when nothing is priced */,
  "categories": [
    {
      "category": "mat",            // mat | drikke | servise | pynt | godteri
      "label": "Mat",
      "items": [
        {
          "id", "name", "quantity", "unit",
          "packs", "buyQty", "packLabel",
          "priceMinNok", "priceMaxNok", "note"
        }
      ]
    }
  ],
  "shareUrl": "https://…?gjester=9&alder=7"
}
```

## Lifecycle & compatibility

- Feature-detect `document.modelContext || navigator.modelContext`; bail out when absent.
- Registered **once on mount** (before the wizard early-return, so tools exist on every
  screen). `execute` callbacks read the latest `cfg`/`catalog`/handlers through a ref, so
  they never go stale.
- `registerTool()` is `await`-ed inside `try`/`catch` — synchronous on older builds,
  `Promise<void>` on Chrome 151+. Cleanup calls `unregisterTool?.()` (optional chaining
  for Chrome ≤147) and aborts the `AbortController` passed to `registerTool()`.

## Testing

`e2e/webmcp.spec.ts` injects a fake `document.modelContext` with `page.addInitScript`,
then asserts both tools register with input + result schemas, executes
`plan_birthday_party` (structured result + visible UI update) and `get_shopping_list`,
and checks the validation error path. Run with `npm run build && npm run test:e2e`.

Real end-to-end use needs a flagged Chrome preview
(`chrome://flags/#enable-webmcp-testing`, Chrome 146+); see
`.agents/skills/webmcp/references/compatibility.md`.
