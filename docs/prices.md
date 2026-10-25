# Prices in the calculator

The default catalog (`src/lib/catalog.ts`) uses ordinary (non-sale) prices from the online grocer Oda,
collected on 25 October 2026. `PRICE_SOURCE` holds the store, date and the label shown in the results
("Priser: Oda, ordinære priser 25.10.2026"). Each item with `priceSource: 'oda'` has a code comment naming
the two products behind its range (low = cheapest suitable product, high = usually a known brand).

Items Oda does not sell (cake, ice-cream cake, mini pizza, allergy-friendly baking, paper tablecloth, balloons,
birthday crown, candles, treat bags, piñata, prizes, garland, straws) keep a rough estimate and are shown with
an «anslag» tag in the shopping list. A price the user edits under «Tilpass» becomes `priceSource: 'egen'`.

Goods sold by weight: grillpølser packs state grams, not a count. Oda packs that state both run 62–80 g per
sausage, so a 600 g pack is counted as 8 (`packSize: 8`, `packWeightG: 600`), and the list shows the weight.

## Refreshing prices

1. Look the products in the comments up on oda.com (or the API at `https://oda.com/api/v1/search/mixed/?q=...`),
   ignoring items on sale.
2. Update `priceMinNok` / `priceMaxNok` (and pack sizes if they changed), bump `CATALOG_VERSION`,
   and change `PRICE_SOURCE.date` and `label`.
3. Run `npx playwright test e2e/prices.spec.ts`. It fails if the examples in the content no longer match
   the calculator, and prints which page to update: the budget guide (example table and FAQ), the guest-count
   guide (table), the home page example (`index.html`), the drink and food guides, and the price table on
   `/guider/slik-beregner-kakeklar`.
4. Move «Sist oppdatert» (`updated`) only on pages whose text changed.
