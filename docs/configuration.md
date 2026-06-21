# Configuration — the editable goods list

The goods catalog is **data**, not hard-coded logic. Users edit it in the app (the **Tilpass** view),
and developers change the defaults in `src/lib/catalog.ts`. The generic engine then computes the plan
from whatever catalog is in effect.

## `GoodItem` schema

```ts
interface GoodItem {
  id: string;                 // stable unique id
  name: string;               // Norwegian display name
  emoji?: string;
  category: 'mat' | 'drikke' | 'servise' | 'pynt' | 'godteri';
  unit: string;               // 'stk' | 'dl' | 'g' | 'sett' | 'pakke' | 'boks'
  mode: 'perChild' | 'perGuest' | 'perTable' | 'ageCount' | 'fixed';
  perChild?: { '3-4': number; '5-6': number; '7-9': number };  // mode 'perChild'
  factor?: number;            // mode 'perGuest' / 'perTable' (default 1)
  divisor?: number;           // mode 'perTable' guests-per-unit (default 8)
  growOn?: boolean;           // mode 'ageCount' adds +1
  fixedQty?: number;          // mode 'fixed' (default 1)
  audience?: 'all' | 'kids';  // default 'all'; 'kids' excludes accompanying adults
  breadKind?: 'lompe' | 'polsebrod'; // pølse bread rows split by PartyConfig.breadRatio
  showIf?: Partial<{
    mainDish: 'polser' | 'pizza';
  }>;                         // item is shown only when every listed config value matches
  packSize?: number;          // round up to whole packs
  packUnit?: string;          // label, e.g. 'pakke (8 stk)'
  priceMinNok?: number;       // per pack (or per item if no packSize)
  priceMaxNok?: number;
  homeOnly?: boolean;         // hidden in barnehage mode
  allergyTags?: string[];     // e.g. ['svin','gluten','melk']
  allergyScope?: string;      // allergy-safe item scoped to affected people
  altNote?: string;           // shown when an allergy filter matches
  kassalSearch?: string;      // search term for live prices
  enabled: boolean;
}
```

See [calculation-engine.md](calculation-engine.md) for how each `mode` is evaluated.

The wizard sets `mainDish` and `breadRatio` (0–100 percent lompe, default 50); advanced mode
(`Controls`) can change them too. Godteposer are included by default for home parties. Pinata is not a
wizard option or `PartyConfig` field; it is a disabled-by-default catalog item that users enable with
the per-item checkbox in **Tilpass varelisten**.

## Editing in the app (Tilpass)

`ConfigEditor.tsx` renders every item as an expandable card with inputs for the editable catalog fields. Users can:

- Toggle items on/off (the checkbox in the summary).
- Change name, emoji, category, unit, calculation mode and its parameters.
- Set pack size, pack label, price range, Kassal search term, allergy/home-only flags.
- **+ Legg til vare** to add a new item, **Slett vare** to remove one.
- **⬇️ Eksporter / ⬆️ Importer** the catalog as JSON.
- **↺ Nullstill** to reset to the shipped defaults.

Changes apply live to the result list and are saved automatically.

## Persistence

`src/lib/store.ts` handles persistence in `localStorage`:

| Key | Value |
|-----|-------|
| `bb.catalog` | JSON array of `GoodItem` |
| `bb.catalog.version` | the `CATALOG_VERSION` the saved catalog was written with |

On load, a saved catalog is used **only if** its stored version matches the current `CATALOG_VERSION`;
otherwise the defaults are returned. This prevents stale custom catalogs from breaking after a schema
change. **Bump `CATALOG_VERSION` in `catalog.ts` whenever you change the default catalog's shape.**
The current shipped `CATALOG_VERSION` is **6**.

## Import / export format

```json
{
  "version": 6,
  "items": [ { "id": "polser", "name": "Pølser", "...": "..." } ]
}
```

`importCatalog` also accepts a bare array (`[ {…}, {…} ]`) for convenience.

## Changing the shipped defaults

1. Edit `DEFAULT_CATALOG` in `src/lib/catalog.ts`.
2. If you added/removed fields or items in a way that should override users' saved copies, bump `CATALOG_VERSION`.
3. Rebuild (`npm run build`). No engine changes needed for ordinary additions.

## Default catalog (summary)

| Category | Items |
|----------|-------|
| Mat | Pølser, Minipizza, Lomper, Pølsebrød, Ketchup, Sennep, Stekt løk, Bursdagskake, Frukt, Snacks |
| Drikke | Saft, Brus (7+) |
| Servise | Tallerkener, Kopper, Servietter, Bestikk, Bordduk, Sugerør* |
| Pynt | Ballonger, Bursdagskrone, Kakelys, Vimpelrekke* |
| Godteri | Godteposer, Pinata*, Smågodt, Premier* |

\* shipped disabled by default (`enabled: false`).

Pølser/minipizza and condiments are gated by the wizard's food choices via `showIf`. Lomper and
pølsebrød are selected together by `breadRatio`; both appear according to the ratio, with a ~15% extra
margin applied to each non-zero bread share before pack rounding. Pinata ships as `enabled: false` and
has no `showIf`.

## URL state for food choices

`PartyConfig.sausageBread` and `PartyConfig.treatBag` were replaced by:

- `breadRatio: number` — stored as `brod=<ratio>` (for example `brod=70`). The old `brod=polsebrod`
  form is gone.

The old `pose` and `pinata` URL parameters are no longer emitted or read.
