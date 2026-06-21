# Calculation engine

All quantities come from `src/lib/engine.ts`, a set of pure functions over a `PartyConfig` and the
goods catalog. Nothing here touches the network or the DOM, so it is easy to test and reason about.

## Inputs — `PartyConfig`

```ts
interface PartyConfig {
  age: number;        // 1..14
  guests: number;     // 1..40   (kids)
  adults: number;     // 0..20   (accompanying adults / "følge")
  type: 'hjemme' | 'barnehage';
  duration: number;   // 1..5
  allergies: Record<string, number>;
  mainDish: 'polser' | 'pizza';
  breadRatio: number; // 0..100, percent lompe (default 50)
  pinata: boolean;    // default false; godteposer are included by default
}
```

## Age bands

`bandForAge(age)` collapses age into three consumption bands:

| Age | Band |
|-----|------|
| ≤ 4 | `3-4` |
| 5–6 | `5-6` |
| ≥ 7, including 10–14 | `7-9` |

Younger children eat and drink less, so `perChild` quantities are keyed by band.

## Adults / accompanying guests

`guests` means invited kids. `adults` is the number of accompanying adults / "følge" from the wizard
or advanced controls. For normal items, the engine counts both kids and adults:

```ts
kids = cfg.guests
adults = audience === 'kids' ? 0 : cfg.adults
```

For `perChild`, adults eat at the `7-9` rate:

```ts
needed = kids * perChild[band] + adults * perChild['7-9']
```

Restrictions/allergies are counted for **all participants**, not only children. The wizard labels these
sliders as "personer" and caps each restriction at `guests + adults`; an `allergyScope` item uses that
selected participant count for the matching allergy-safe quantity.

## Calculation modes

Each catalog item declares a `mode` that decides how its **needed** quantity is derived:

| Mode | Formula | Example items |
|------|---------|---------------|
| `perChild` | `kids × perChild[band] + adults × perChild['7-9']` | pølser, kake, saft, smågodt |
| `perGuest` | `(kids + adults) × (factor ?? 1)` | tallerkener (1.2), servietter (2), godteposer (1) |
| `perTable` | `ceil((kids + adults) / (divisor ?? 8)) × (factor ?? 1)` | bordduk (1 per 8 guests), condiments |
| `ageCount` | `age + (growOn ? 1 : 0)` | kakelys (age + 1) |
| `fixed` | `fixedQty ?? 1` | bursdagskrone, vimpelrekke |

## Pack rounding (anti-waste, never under-buy)

If an item has a `packSize`, the needed amount is rounded **up** to whole packs:

```
packs   = ceil(needed / packSize)
buyQty  = packs × packSize
price   = packs × priceMinNok … packs × priceMaxNok   (if prices set)
```

Discrete units (`stk`, `sett`, `pakke`, `boks`, …) display as `ceil(needed)`; continuous units
(`dl`, `g`, `ml`, `l`, `kg`) display rounded to one decimal. Pack math always uses the raw need so we
never round down and run short.

## Mode-specific filtering

- **Kindergarten mode** (`type === 'barnehage'`) drops every item flagged `homeOnly: true` (cake, candy, brus, snacks) and shows a Helsedirektoratet note suggesting fruit + a birthday crown instead.
- **Zero needs are skipped.** e.g. `brus` has `perChild { '3-4': 0, '5-6': 0, '7-9': 1 }`, so it only appears for ages 7+.
- **Allergy notes.** If the selected allergies/restrictions intersect an item's `allergyTags`, its `altNote` is shown (e.g. "Bytt til kyllingpølse for halal / uten svin"). When an item is scoped to an allergy/restriction, its participant count comes from `allergies[scope]`; otherwise restriction counts annotate and do not change the math.

## Food choices & gating (`showIf` / `audience`)

The wizard and advanced controls set `mainDish`, `breadRatio`, and `pinata`. Catalog items can use
`showIf` to appear only when every listed config field matches; `showIf` supports `{ mainDish, pinata }`.
This keeps pølser, minipizza, condiments, godteposer, and the optional pinata as ordinary catalog rows
rather than engine branches. If `showIf` does not match, `computeLineItem` returns `null` and the item
is hidden.

Bread is not an either/or choice. The pølse bread rows declare `breadKind?: 'lompe' | 'polsebrod'`, and
`breadRatio` is the percent of bread demand assigned to lomper (default `50`). The other share goes to
pølsebrød. A `BREAD_MARGIN = 0.15` (~15% extra) is added to **both** non-zero bread shares before pack
rounding so neither bread type runs out. At `breadRatio = 0` only pølsebrød appears; at `100` only
lomper appear. The URL stores this as `brod=<ratio>` (for example `brod=70`).

Godteposer are included by default for home parties. Pinata is now a separate optional add-on controlled
by `pinata: boolean` (`pinata=1` in the URL); the old `treatBag`/`pose` state is gone.

`audience` controls whether adults are included in population math:

- `audience: 'all'` (default) means kids and adults consume the item.
- `audience: 'kids'` excludes adults, used for godteposer, candy, balloons, and premier.

## Output

`computePlan(catalog, cfg)` returns:

```ts
{
  groups: { category, items: LineItem[] }[];  // ordered mat → drikke → servise → pynt → godteri
  itemCount: number;
  priceMin: number;  priceMax: number;  hasPrice: boolean;  // summed estimate
}
```

Each `LineItem` carries `neededQty`, `unit`, `packs`, `buyQty`, `packUnit`, `priceMin/Max`, an optional
allergy `note`, and a `kassalSearch` term for the live-price button.

## Worked example — 14 guests, age 7, home party

| Item | mode | needed | packs → buy |
|------|------|--------|-------------|
| Pølser | perChild 2.5 | 35 stk | ⌈35/8⌉ = **5 pk** (40) |
| Bursdagskake | perChild 1.25 | 18 biter | ⌈18/20⌉ = **1 langpanne** |
| Saft | perChild 6 dl | 84 dl | ⌈84/30⌉ = **3 flasker** |
| Tallerkener | perGuest 1.2 | 17 stk | ⌈17/8⌉ = **3 pk** (24) |
| Bestikk | perGuest 1 | 14 sett | ⌈14/6⌉ = **3 pk** |
| Bordduk | perTable /8 | 2 | **2 duker** |
| Kakelys | ageCount +1 | 8 | ⌈8/8⌉ = **1 pk** |
| Godteposer | perGuest 1 | 14 | ⌈14/6⌉ = **3 pk** (18) |

## Guest-count helper

`suggestedGuests(age) = clamp(age + 1, 2, 40)` powers the "Bruk foreslått antall" shortcut and the
slider hint, following the Norwegian "guests = the age the child turns (+1)" convention.

## Extending the engine

Adding a new behaviour is rare because the five modes cover most cases. If you must:

1. Add the mode to the `CalcMode` union in `types.ts`.
2. Add a `case` in `computeLineItem` (engine.ts).
3. Surface any new field in `ConfigEditor.tsx` so it stays user-editable.
4. Bump `CATALOG_VERSION` in `catalog.ts` if you change the default catalog shape.
