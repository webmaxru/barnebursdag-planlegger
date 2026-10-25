# AdSense round 3: audit, changes and what is left

Google's answer to the second review (October 2026) was "Low value content": the site must provide substantial
unique value, show ongoing curation and structural maintenance, and generate genuine user interest.

## Audit (before this PR, upstream main 4aa3ea8)

- 22 guides/recipes of 660–1,170 words plus 5 trust pages, 2 hubs and the calculator. Nothing thin by length.
- No near-duplicates: the highest 5-gram overlap between any two pages was 2.6 % (Om Kakeklar vs Om utvikleren);
  between guides at most 2.2 % (pizza vs pølsefest). No page needs merging or noindex.
- Two guides had no internal link pointing at them (`/guider/planlegg-barnebursdag-steg-for-steg`, `/guider/taco-til-barnebursdag`).
- **The home page was the weakest page.** The explanatory text, FAQ and guide links sat inside `#root`, so React
  replaced them on load. A first-time visitor (and Googlebot, which renders JavaScript and has no localStorage)
  saw only the wizard. The FAQPage JSON-LD described a FAQ that was not visible after rendering, and its food
  answer ("1–2 pølser") did not match the calculator (1.5 / 2 / 2.5 per child).
- Generic, uncheckable money claims: every NOK figure came from the calculator's own estimate ranges, with no store
  prices behind them.
- A few unverifiable claims: «gjennomprøvde oppskrifter» (hub description), «den mest brukte bursdagskaken i Norge»,
  «tilbakemeldinger fra foreldre som har brukt listene», «basert på egen erfaring».
- All 22 articles were published and dated the same day (17 Oct 2026).
- Sitemap, robots.txt, ads.txt, canonical URLs, 404s and Article/Recipe/FAQPage data were already in order.
  Ads are only on guides and recipes, never on trust pages, hubs or the calculator.

## What this PR changes, by Google's three points

**Authentic, high-quality information, tools or services**
- Home page: the explanation now sits outside the React root and stays visible under the calculator: how to use
  it, a per-age table with the exact numbers the engine uses, a worked example for 10 children aged 6, the FAQ
  (JSON-LD now matches the visible text word for word) and links to 8 guides. Rendered text: about 540 words (the
  old rendered page was essentially the wizard).
- Budget guide: a table of ordinary prices for 17 product types from Oda (fetched 25 Oct 2026, discounted items
  excluded), with brand and pack size, and three observations, among them that the calculator's lomper/pølsebrød
  range is on the high side. Source added to the page.
- Barnehage guide: verbatim quote from Helsedirektoratet's national guideline on celebrations in kindergartens.
- Unverifiable claims removed or reworded (list above).

**Ongoing curation and structural maintenance**
- Om Kakeklar has a dated change log built from the repository history (June 2026 launch → today).
- «Sist oppdatert» moved to 25 Oct 2026 only on pages whose text changed; kontakt, personvern and vilkår keep their dates.
- Internal links added to the two orphan guides and from the method page to the price table.

**Author voice and editing**
- Openings of all 22 guides/recipes rewritten in Maxim's voice: first person only for his real choices ("tallene jeg
  bruker i kalkulatoren", "jeg bygde Kakeklar rundt tre spørsmål"), short sentences, plain words, no anecdotes,
  no invented experience. Om Kakeklar now speaks as one person ("jeg") and no longer as "vi".
- Mechanical pass (the "v1" rules, adapted to bokmål with the Norwegian dash ` – `): 24 colon→dash and
  short-sentence joins, 10 of 28 "…, ikke X" / "ikke X, men Y" contrast closers cut, 4 asides moved into
  parentheses. Never touched: headings, tables, lists of ingredients, FAQ/structured data, quotes, legal text in
  Vilkår, and the "Varighet / Du trenger" lines in the game guides.

**Generates and sustains genuine user interest:** nothing in code can do this; see below.

## Content inventory after this PR (word count = article body, without FAQ)

| Path | Title | Type | Words before → after | Status |
|---|---|---|---|---|
| / | Kakeklar – hvor mye trenger du til barnebursdagen? | calculator | ~220 visible before JS, wizard only after → ~540 | deepened |
| /guider | Guider til barnebursdag | hub (generated) | ~1,120 | kept |
| /oppskrifter | Oppskrifter til barnebursdag | hub (generated) | ~380 | kept (description fixed) |
| /guider/allergier-i-barnebursdag | Allergier i barnebursdag: slik planlegger du trygt | guide | 963 → 959 | revised |
| /guider/barnebursdag-hjemme-eller-leie-lokale | Barnebursdag hjemme eller i leid lokale? Fordeler og ulemper | guide | 855 → 866 | revised |
| /guider/barnehagebursdag | Barnebursdag i barnehagen: slik gjør du det enkelt | guide | 994 → 1060 | deepened |
| /guider/budsjett-for-barnebursdag | Budsjett for barnebursdag: slik holder du kostnadene nede | guide | 868 → 1325 | deepened |
| /guider/godteposer-til-barnebursdag | Godteposer til barnebursdag: innhold og mengde | guide | 831 → 831 | revised |
| /guider/hvor-mange-gjester-i-barnebursdag | Hvor mange gjester i barnebursdag? Slik bestemmer du | guide | 779 → 777 | revised |
| /guider/hvor-mye-drikke-til-barnebursdag | Hvor mye drikke til barnebursdag? Saft, vann og brus | guide | 928 → 933 | revised |
| /guider/hvor-mye-mat-til-barnebursdag | Hvor mye mat til barnebursdag? Mengder per barn (3–9 år) | guide | 1142 → 1144 | revised |
| /guider/hvor-stor-bursdagskake | Hvor stor bursdagskake trenger du? Stykker per barn | guide | 867 → 861 | revised |
| /guider/invitasjon-til-barnebursdag | Invitasjon til barnebursdag: tekster du kan kopiere | guide | 901 → 906 | revised |
| /guider/leker-til-barnebursdag-3-5-ar | Leker til barnebursdag for 3–5 år: 12 enkle leker | guide | 1019 → 1021 | revised |
| /guider/leker-til-barnebursdag-6-9-ar | Leker til barnebursdag for 6–9 år: 12 leker og en plan | guide | 1015 → 1015 | revised |
| /guider/pizza-til-barnebursdag | Pizza til barnebursdag: hvor mange pizzaer trenger du? | guide | 721 → 726 | revised |
| /guider/planlegg-barnebursdag-steg-for-steg | Planlegg barnebursdag: sjekkliste uke for uke | guide | 1172 → 1165 | revised |
| /guider/polsefest-barnebursdag | Pølser i lompe til barnebursdag: mengder og tips | guide | 798 → 797 | revised |
| /guider/slik-beregner-kakeklar | Slik beregner Kakeklar mengdene | guide | 864 → 878 | revised |
| /guider/taco-til-barnebursdag | Taco til barnebursdag: mengder og tips for barn | guide | 777 → 775 | revised |
| /guider/utebursdag-og-grillfest | Utebursdag og grillfest for barn: slik lykkes du | guide | 808 → 806 | revised |
| /oppskrifter/blotkake-til-barnebursdag | Bløtkake til barnebursdag med jordbær og krem | recipe | 663 → 666 | revised |
| /oppskrifter/bursdagsmuffins | Bursdagsmuffins: enkel oppskrift til barnebursdag | recipe | 712 → 711 | revised |
| /oppskrifter/fruktspyd-og-sunn-bursdagsmat | Fruktspyd og sunn bursdagsmat til barn | recipe | 860 → 860 | revised |
| /oppskrifter/sjokoladekake-i-langpanne | Sjokoladekake i langpanne til barnebursdag | recipe | 746 → 743 | revised |
| /kontakt | Kontakt Kakeklar | trust page | 226 → 226 | kept |
| /om-kakeklar | Om Kakeklar | trust page | 463 → 604 | deepened |
| /om-utvikleren | Om utvikleren: Maxim Salnikov | trust page | 406 → 411 | revised |
| /personvern | Personvernerklæring | trust page | 680 → 680 | kept |
| /vilkar | Vilkår for bruk | trust page | 340 → 340 | kept |

29 prerendered pages, 30 sitemap URLs, no pages added, merged or noindexed.

## What can still block approval

1. **User interest and traffic.** Google asks for "a level of user interest that supports a commercial advertising
   partnership". A site with little search traffic can be refused whatever its content. This needs time and real
   visitors: Search Console impressions, a few links from Norwegian parent communities, sharing the calculator.
2. **Site/content age.** Most of the content is ten days old. Waiting several weeks before the next review lets
   Google crawl the new versions and see the site being maintained.
3. **Author signals.** The TODO notes on /om-utvikleren (a sentence of real experience, an optional photo) are still
   open, and only Maxim can fill them.

## Checklist for Maxim

1. Review and merge this PR (deploy runs on push to main).
2. Search Console: request indexing for `/`, `/guider/budsjett-for-barnebursdag`, `/guider/barnehagebursdag` and
   `/om-kakeklar`, and resubmit `sitemap.xml`.
3. Optionally fill the /om-utvikleren TODOs in your own words.
4. Wait at least 2–4 weeks with real traffic before requesting a new review (AdSense → Sites → Request review).

## Follow-ups not in this PR

- Calibrate catalog price ranges against the Oda snapshot (lomper/pølsebrød are too high, saft is sold in 1.5 l
  bottles, grillpølser are sold by weight). That changes the budget example totals and the saved-catalog version,
  so it should be its own change.
- `e2e/consent.spec.ts › guide to privacy flow…` fails locally on this branch **and on unchanged main** (the
  consent status attribute never flips in the sandbox); every other e2e test passes.
