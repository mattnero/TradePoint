# TradePoint — Implementation Plan

Written 2026-11-02. Agent-facing. Matt drives from the terminal at about 3 hours a
week and does not read this file; the agent does, at the start of each session. Each session
below is one sitting with a definition of done; stop when it's green, not when the
clock runs out. If a session spills, finish it next time rather than starting the
next one. Phase 0 is 14 sessions, roughly Feb–Mar 2027.

Companion leads the product; the decoder gets built first because the van purchase
comes first. Mockups: `docs/mockups/tradepoint-mockups.html`.

## Stack (decided here; change only with a reason)

| Layer | Choice | Why |
|-------|--------|-----|
| Language / build | TypeScript, Vite | Already in the repo; Matt knows Vite from the add-in |
| UI | **Svelte 5** | Smallest bundle and least boilerplate for a form-heavy mobile UI; scoped styles; no virtual DOM to fight on a low-end phone. React works too if you'd rather; nothing below depends on the framework |
| Styling | Plain CSS with custom properties, one `tokens.css` | The mockup already defines the tokens; no Tailwind to configure |
| State | Svelte runes + one `garage` store persisted to `localStorage` | One vehicle, one loan, a few deals; nothing needs a database |
| Routing | Hash router (`#garage`, `#timeline`, `#dealer`, `#verdict`, `#d=<deal>`) | Share links must work on static hosting with no server |
| Tests | Vitest for math/model; Playwright smoke test later | Math is where bugs would cost credibility |
| Hosting (web) | GitHub Pages from `main` via Actions | Free, already on GitHub; swap to Cloudflare Pages if a custom domain needs it |
| Mobile (Phase 1) | Capacitor 8 | Wraps the same build; iOS needs Xcode on this Mac, Android needs Android Studio |
| Payments (Phase 1) | RevenueCat (`@revenuecat/purchases-capacitor`) | Free under US$2.5k monthly revenue; handles both stores' IAP and receipt validation |
| Analytics | None in Phase 0 | Add a privacy-respecting counter (Plausible or GoatCounter) only if curious |

No backend. No accounts. If a feature needs a server, it waits for Phase 2 and gets a
written reason.

## Model per session

Sonnet by default. Use Opus for sessions 2, 7, 8 and 11 (verdict model, warranty data,
cliff engine, depreciation/equity): edge-case heavy, and wrong answers there look
right. If a session on Sonnet turns into a judgment call about product behaviour,
switch rather than guess. Fable is not needed for this project.

## Working rules

- Math and model code is written test-first. UI code is checked by using it.
- Every session ends with `npm test` and `npm run typecheck` green and a commit.
- Persisted data has a `schemaVersion` from day one. Migrations are a function per
  version bump. Losing someone's garage on an update is the worst bug this app can have.
- All money is in cents as integers in the model; format at the edge. All rates are
  decimals (0.0799), never percentages, below the UI.
- Province rules, warranty terms and depreciation curves are data files, not code.
- Use a dedicated Claude Code session in this repo for build work. The hub session is
  for planning and cross-project questions.

## Defaults for the four open mockup questions

Picked so Phase 0 isn't blocked. Reverse any of them later.

| Question | Default | Why |
|----------|---------|-----|
| Comps inline or a tap away on Garage | A tap away | Garage stays a summary screen |
| "Keep it" cost as a third chart line | No; sentence only | Two lines and one crossing is the chart's point |
| Advertised price collapsed by default | Visible, labelled optional | One extra field is cheaper than a disclosure control |
| Share as image or link | Link first; image card in Phase 1 | Link needs zero infrastructure; the fragment already carries the deal |

## Phase 0 — sessions

### Session 1 · Project skeleton and CI
- Add Svelte 5 + Vite to the existing repo (`npm create vite` into a temp dir, copy
  config in; keep `src/math` untouched).
- `tokens.css` from the mockup palette (light-only). Load Barlow Condensed + IBM Plex
  Sans from Google Fonts with system fallbacks.
- App shell: four-tab bottom nav, hash router, empty screens.
- GitHub Actions: `npm ci && npm run typecheck && npm test` on push; deploy `dist/`
  to GitHub Pages on `main`.
- Done when: the empty shell is live at `mattnero.github.io/TradePoint` and CI is green.
- **Status 2026-11-02: done.** Repo made public (Pages needs it on the free plan); shell
  live at https://mattnero.github.io/TradePoint/ and CI green.

### Session 2 · Money, rates and the verdict model
- `src/model/money.ts`: cents type, `formatCAD`, `parseMoneyInput`.
- `src/model/verdict.ts`: takes a `DealBreakdown` plus benchmarks, returns the three
  gaps and a level (match / ask / large) using 3% / 8% of implied all-in.
- Tests from the worked example and from two invented deals (cheap used car, $60k
  truck) to prove the thresholds scale.
- Done when: `verdict(workedExample)` returns three "ask" gaps with the numbers in
  docs 03.
- **Status 2026-11-02: done.** `verdict(quote: DealQuote, benchmarks)` takes the cents-based
  quote, not a `DealBreakdown`, because the rate gap needs payment, term and frequency.
  `src/model/deal.ts` holds `DealQuote` (cents) and `dealFigures` (wraps the dollar math,
  returns cents). Gap sign: price/rate positive = costs the buyer; trade = allowance −
  offer, negative = costs the buyer. Gaps in the buyer's favour are always "match".
  Thresholds compared in integer basis points, strict `>`. `rateGap` added to
  `src/math/loan.ts`. Worked-example benchmarks (5.99%, $9,200 offer) are in the fixture.

### Session 3 · Decoder screen
- Six inputs + frequency segmented control + optional advertised price, as mocked.
- Numeric keypad (`inputmode`), big touch targets, live recompute on input.
- Decoder state is a plain object; no garage dependency yet.
- Done when: entering the worked example on a phone-width browser shows the right
  amount financed.
- **Status 2026-11-02: done.** Checked in headless Chrome at 375px: worked example shows
  $28,881, bi-weekly shows the monthly equivalent, state survives tab switches, no
  horizontal scroll, all targets >= 44px. Inputs are `type=text` with `inputmode`
  (not `type=number`: avoids spinner/comma quirks). Parsing is `src/decoder/inputs.ts`
  (`readDecoder`); state is the `decoder` rune object in `src/decoder/state.svelte.ts`.
  "Check the numbers" goes to `#verdict`, still an empty stub for Session 4, which
  should read `currentReading()` for quote + benchmarks.

### Session 4 · Verdict screen
- Headline, three gap rows with stripes, breakdown table, "Ask for" chips.
- "I need 10 minutes" copies a short text to the clipboard (with a fallback that
  selects the text when clipboard is refused).
- Done when: the worked example renders amber with the three gaps from the mockup.
- **Status 2026-11-02: done.** Checked in headless Chrome at 375px: worked example renders
  amber with +$1,877 / +$2,371 / −$1,200, clipboard copy works, and a refused clipboard
  selects a fallback textarea. Copy lives in `src/model/verdictCopy.ts` (tested). Ask-for
  chips: bill of sale always; buy rate / trade appraisal only when that gap is flagged;
  "Same price at 60 months" when term > 60. No Share button yet; Session 5 adds it next to
  "I need 10 minutes". The screen reads `currentReading()` from the decoder state, so
  Session 5 should load a decoded `#d=` code into `decoder` before rendering.

### Session 5 · Share link
- `src/share/codec.ts`: encode the deal inputs into a compact URL-safe string
  (base64url of a fixed-order array, versioned). Round-trip tests.
- Opening `#d=<code>` lands on the verdict with inputs restored and an "Edit" path
  back to the decoder.
- Done when: a link pasted into another browser shows the same verdict.
- **Status 2026-11-02: done.** Verified on the production build with two separate browser
  contexts: identical verdict, Edit restores every field, damaged or truncated codes show
  "This link doesn't open". Format v1 is a JSON array base64url'd (116 chars for the worked
  example): `[1, paymentCents, freqIndex, term, apr×100000, down, allowance, payoff,
  advertised|null, preApprApr|null, offer|null]`. Province is implicit ON; bump the version
  to add one. Decoding re-validates through `readDecoder`, so nothing invalid reaches the
  screen. Share uses the native share sheet when present (cancel is silent), else copies
  the link. Viewing a shared deal does not touch the local decoder state until Edit.

**Checkpoint after session 5: the decoder is usable for the van purchase.** Use it on
a real quote before continuing; fix what hurt.

### Session 6 · Vehicle model and persistence
- `src/model/vehicle.ts`: year, make, model, trim, in-service date, purchase price,
  odometer readings (date + km), km/month derived from the last two readings.
- `src/model/loan.ts` (model, not math): balance, rate, months remaining; or the
  original terms and a start date, from which balance is derived.
- `src/store/garage.ts`: one vehicle, persisted, `schemaVersion: 1`, load/save
  wrapped in try/catch, migration stub.
- Done when: a vehicle survives reload and a deliberately broken stored blob falls
  back to an empty garage without crashing.
- **Status 2026-11-02: done.** Checked in Chrome: vehicle survives reload; a broken blob
  gives an empty garage and the original is copied to `tradepoint.garage.backup` before
  anything can overwrite it; blocked `localStorage` falls back to memory without errors.
  Layout: `src/model/dates.ts` (ISO date helpers, whole-month counting), `loan.ts` (two
  shapes: `terms` and `snapshot`; balance derived at any date, never projected backwards),
  `vehicle.ts` (`createVehicle`, `addOdometerReading`, `kmPerMonth`, `parseVehicle`),
  `src/store/garage.ts` (pure load/save/migrate, injectable storage) and
  `garage.svelte.ts` (reactive `garageStore`; nothing imports it yet, Session 9 will).
  Choices: `kmPerMonth` is null when the last two readings are under 14 days apart
  (short spans extrapolate wildly); a reading on an existing date replaces it; the loan
  assumes monthly payments; `deals` is an opaque array until Phase 1 defines it; one
  vehicle is a UI rule, the store holds an array. Next sessions: the `Vehicle` has no
  benchmarks or value anchors yet (Sessions 10 and 11 add them, with a migration only
  if existing fields change).

### Session 7 · Reference data
- `src/data/warranty.json`: make → comprehensive and powertrain terms (years, km) for
  Canada. Seed the top 15 makes. **Verify each against the manufacturer's Canadian
  site before committing; do not trust memory.** Record the source URL and date per row.
- `src/data/provinces.json`: ON only for now (13%, trade-in reduces base, licensing
  estimate). Shape ready for others.
- `src/data/segments.json`: mid-SUV, compact car, pickup, minivan, luxury, EV with
  first-year and subsequent monthly depreciation rates. Mark them as rough; they get
  re-anchored by user values.
- Done when: `warrantyFor("Hyundai", inServiceDate, km)` returns the right expiry for
  the example car.
- **Status 2026-11-02: done.** `warrantyFor(make, inServiceDate, km, asOf)` (asOf added so
  it stays pure) returns per-coverage `endsOn`, `kmRemaining` and `expired: "date" | "km" |
  null`; mockup 2022 Santa Fe (in service 2022-06-15, 86,800 km) gives powertrain to
  2027-06-15 with 13,200 km left. Unknown make returns null; never guess.
  Warranty rows: Toyota, Ford, Honda, Hyundai, Chevrolet, GMC, Kia, Nissan, Mazda, Ram,
  Jeep, Subaru, Volkswagen, BMW, Mitsubishi. **Tesla dropped**: tesla.com/en_ca returns 403
  to curl, WebFetch and headless Chrome, and the only document reachable is a 2017-18 PDF;
  add it only after reading the en_ca warranty page in a real browser. Every row has a
  verbatim quote and a Canadian manufacturer source; Toyota, Mazda, Ram, Jeep were
  re-checked against raw page text. `km: null` means unlimited distance (Mazda).
  Caveats for Session 8: terms are current model-year terms (VW states 2018-2026, Jeep
  2022-2027); older cars may differ, so the UI should say "current terms". Ram's 2026
  retail-only 10 yr / 160,000 km powertrain is in notes, not the row. Diesel, EV and
  hybrid exceptions are in notes, not modelled.
  `provinces.json` now drives `TAX_RULES` (licensing stored in cents, converted at the
  math edge). The $150 licensing estimate is above ServiceOntario's $32 permit plus
  plates; kept because it errs toward fewer false price-gap alarms.
  `segments.json`: six segments, all `rough: true`, mid-SUV matches the mockup (1.1%/mo,
  Sep-Dec AWD season, transmission fluid at 96,000 km for $350). Added
  `lateMonthlyRate` and `flattensAfterMonths` (72) for the spec's year-6 flattening;
  Session 11 decides how the curve uses them. Only one maintenance item per segment
  (transmission fluid); more need sources.
  Open for Session 9: `warrantyFor` needs an in-service date; onboarding only asks for
  year/make/model + km first, so Session 9 must ask for it or estimate it and label it.

### Session 8 · Cliff engine
- `src/model/cliffs.ts`: given vehicle + loan + value anchors, return dated events:
  warranty expiries, next odometer thresholds (100k/150k/200k), equity crossover,
  seasonal window for the segment, maintenance window (from a small per-segment
  interval table, user-editable later).
- Pure functions, tests for each cliff type plus the "already past" cases (a 2019
  Santa Fe has no warranty cliff left; the engine must say so, not invent one).
- Done when: the mockup's example vehicle yields the four cliffs in the mockup order.
- **Status 2026-11-02: done.** `cliffsFor({ vehicle, asOf, valueAt?, horizonMonths = 36 })`
  returns `{ upcoming, past, activeSeason, needs }`, all structured data (no copy; UI
  writes titles). Mockup 2022 Santa Fe yields equity → warranty → 100,000 km → season in
  mockup order. Decision: the transmission-fluid window is sorted by date like
  everything else, so it lands second (May 2027 at 96,000 km), not last as the mockup
  draws it; the mockup labelled it by km, not by date.
  Rules: comprehensive and powertrain merge into one cliff when they end the same day
  for the same reason (Hyundai, Kia); warranty end = min(date limit, projected km date);
  unknown driving rate gives `limitedBy: "date-or-km"`; ended items go to `past`, never
  `upcoming` (2019 Santa Fe: warranty past, 100k past, next is 150k). Equity steps
  monthly and is past when already positive. An active season goes in `activeSeason`;
  the cliff is always the next window start. Maintenance is an interval (next multiple
  of the item km). `needs` lists what's missing (inServiceDate, odometerRate, segment,
  value, warrantyTerms) for progressive onboarding. Projections use the exact km/day
  from the last two readings, counted from the latest reading date.
  `valueAt` is injected: Session 11's value model plugs in here. On a plain 1.1%/mo
  curve the mockup car crosses in month 3 (Feb 2027); Session 11's anchored curve must
  produce month 4. Added `segment?` to `Vehicle` (optional, validated; no migration).

### Session 9 · Garage screen (free tier)
- Vehicle card, odometer, km/month, cliff list, "I'm at a dealership" button.
- Progressive onboarding: year/make/model + current km first; purchase and loan
  later, each unlocking more of the screen.
- Equity tile present but dimmed with a Pro tag (no paywall yet; a stub).
- Done when: Matt's real Santa Fe is in the garage with correct odometer and
  warranty state.
- **Status 2026-11-03: built, waiting on Matt's real figures.** Everything works end to
  end in Chrome at 375px using a stand-in 2019 Santa Fe (add, estimate and set in-service
  date, segment, loan, odometer update, reload, remove). The last "done when" step is
  Matt entering his own car at https://mattnero.github.io/TradePoint/#garage: year 2019,
  Hyundai, Santa Fe, current km, and the real in-service date (the app shows "Estimated"
  until he does). Nothing from the stand-in was saved to the repo.
  Built: onboarding form (`AddVehicleForm`), vehicle card with km/month, dimmed Pro
  value tile (stub), next-cliffs list, "Already behind you" list, `VehicleSetup`
  (odometer update, in-service date with "estimate from model year" flagged Estimated via
  new `Vehicle.inServiceEstimated`, vehicle type, optional loan snapshot, remove). Copy is
  in `src/model/cliffCopy.ts`, form parsing in `src/garage/inputs.ts`, both tested.
  Shared button/card/pill classes live in `src/styles/base.css`; Dealer and Verdict still
  carry their own copies (fold in during the Session 14 polish pass).
  Decisions: window banner (Pro) and equity row wait for Sessions 11-12 (no value model
  yet, so `cliffsFor` runs without `valueAt`); purchase price/date not asked yet (Session 11
  needs it for the depreciation anchor); one car only, replaced by "Remove this car";
  a same-day odometer entry corrects the earlier one rather than erroring; a second
  reading on a later day is what gives km/month. Transmission fluid "due around" is the
  next multiple of 96,000 km above the odometer, so a car past 96,000 km shows 192,000;
  it cannot know whether the 96,000 km service was done.
  Engine bug found by real use and fixed with a test: a single reading over the km limit
  with the date limit also passed now reports "ended <date>", not "km, date unknown".

### Session 10 · Garage → decoder handoff
- "I'm at a dealership" pre-fills trade payoff from the loan and trade allowance
  benchmark from the latest value anchor; the fields show the teal "from your garage"
  state.
- Benchmarks (pre-approval rate, outside offer) live on the vehicle and pre-fill too.
- Done when: a garage with a loan opens the decoder with payoff filled and a verdict
  that includes the trade gap.
- **Status 2026-11-03: done.** Checked in Chrome at 375px: a garage with a loan and
  benchmarks opens the decoder with payoff, pre-approval rate and outside offer filled and
  teal; typing the dealer's quote gives the worked-example verdict with all three gaps.
  **Deviation from the plan text: trade allowance is NOT pre-filled.** The allowance is the
  dealer's number; filling it from our own estimate would zero the trade gap silently if
  the user forgot to change it. Revisit in Session 11 as a visible "your estimate: $X"
  hint beside the field (not a value in it). Payoff is the modelled loan balance today and
  the screen says to prefer the lender's figure.
  Rules: tapping "I'm at a dealership" fills only blank fields, or fields still holding the
  garage's earlier value; anything the user typed is kept. Teal shows only while the
  field equals the garage value, so editing it turns the teal off. Benchmarks live on
  `Vehicle.benchmarks` (`preApprovalApr`, `outsideTradeOffer`), edited in the garage's
  "Your benchmarks" card; `parseVehicle` validates them, no migration needed (optional).
  Code: `src/decoder/fromGarage.ts` (pure, tested), `applyGarage` in
  `src/decoder/state.svelte.ts`.

### Session 11 · Depreciation and equity projection
- `src/model/value.ts`: segment curve anchored to purchase price, then re-anchored
  through user value entries (latest anchor wins; curve shape preserved).
- `projectEquity(vehicle, loan, months)` → arrays for the chart; crossover month.
- Tests: with no anchors it follows the segment curve; with one anchor it passes
  through it; crossover matches a hand calculation.
- Done when: the example vehicle crosses positive at month 4.
- **Status 2026-11-03: done, with the month corrected to 3.** The mockup copy said ~4 months
  / March, but the mockup's own chart code crosses at month 3, and so does every honest
  version of the spec's curve (whole or fractional months, plain or anchored): $14,200 on
  Oct 28 at 1.1%/mo is $13,708 on 2027-02-02 against $13,665 owing, +$43. Nothing defensible
  moves it to 4, so the mockup copy was changed to Feb / 3 months instead of bending the model.
  The margin is thin; small rate changes flip it, which is why the UI must say "rough".
  Model: `src/model/value.ts` `retention(segment, ageMonths)` = (1 − firstYearDrop)^(age/12)
  through month 12, then (1 − monthlyRate) per month to `flattensAfterMonths`, then
  `lateMonthlyRate`. Age is fractional months (days / 365.25·12) from the in-service date,
  falling back to `estimatedInServiceDate(year)` (Jul 1) and flagging `ageEstimated`.
  `valueCurve(vehicle)` → `{ at(date), basis }` or null (needs a segment and a purchase or an
  anchor). Anchors = purchase + `Vehicle.valueAnchors` (`{ date, value, source: comps |
  offer | manual }`, validated in `parseVehicle`, optional so no migration). For a date, the
  latest anchor on or before it is exact and the curve ratio carries it; before the first
  anchor, the first one projects backwards. Same-day anchor beats the purchase price.
  `basis` is the latest anchor, for provenance copy (`src/model/valueCopy.ts`).
  `src/model/equity.ts` `projectEquity({ loan, valueAt, asOf, months })` → monthly points
  (month 0..n) and `crossover` (first value ≥ balance; month 0 = already positive).
  `cliffsFor`'s equity cliff now calls it, so the cliff list and the Session 12 chart can't
  disagree (a test pins this).
  UI: Purchase (optional) card in VehicleSetup (price + date, `readPurchase`), showing the
  provenance line once saved; Garage passes `valueCurve(...).at` into `cliffsFor`, so the
  free cliff list now dates the equity crossover; a hint asks for purchase + vehicle type
  when there's a loan but no curve. Checked in Chrome at 375px.
  **Not done, on purpose: the "your estimate: $X" hint beside trade allowance** (Session 10
  deferral). A curve from purchase price is a retail-ish number; dealers' trade allowance
  sits below retail, so the hint would make normal allowances look like lowballs. Revisit
  in Session 13 once comps/outside offers exist, labelled as retail vs trade.
  Session 12 notes: comps are asking prices, so a comps anchor overstates trade value;
  consider saying so in the provenance line. The equity tile is still the dimmed stub.

### Session 12 · Timeline screen and window sentence
- SVG chart (two lines, dashed cliff markers, crossover dot) drawn from the
  projection; the mockup's chart code is a direct starting point.
- Cliff list below, "Refresh value" entry.
- `windowSentence(cliffs, equity)`: the plain-language recommendation that always
  includes the "keep it" cost per year.
- Done when: Garage banner and Timeline agree with each other for the example car.
- **Status 2026-11-03: done.** Checked in Chrome at 375px with four garages (example car,
  paid-off 2019 past every deadline, bare car, empty): example banner reads "Your window: Feb
  to Jun 2027" and the Timeline dates equity Feb 2027 and the warranty Jun 2027; no
  horizontal scroll, no console errors.
  Agreement is structural: `src/model/outlook.ts` `outlookFor(vehicle, asOf)` builds the
  curve, cliff report, 36-month projection, window and keep-it cost once; both screens call
  it, and a test pins crossover = equity cliff = window open.
  Model: `src/model/window.ts` `tradeWindow(report, projection)` → `window` (opens date or
  "now", closes at a deadline) | `late` (deadline on/before equity turns positive) | `open`
  (no deadline in horizon) | `underwater` (no crossover). Deadlines are warranty ends and the
  100,000 km mark only (per spec), dated ones only. No loan counts as equity positive now.
  `keepCost(valueAt, loan, asOf)` = next-12-month depreciation + interest (payments left in
  the year × payment − principal paid). Copy in `windowCopy.ts`; amounts rounded to $10 and
  the total is the sum of the rounded parts so the sentence adds up.
  **Copy deviation:** the mockup said "keeping it is cheaper by about $2,100 a year"; cheaper
  than what is not computable, so the sentence states the cost: "Keeping it costs about
  $2,320 over the next year: $1,760 in depreciation and $560 in interest." The mockup board
  still has the old line; the app is the reference now.
  `projectEquity` now takes `loan: Loan | undefined` (no loan = zero balance) so a paid-off
  car still gets a value line.
  UI: Garage value/loan/equity tile (equity pill "−$931 · positive in ~3 months"), window
  banner, provenance line ending "A rough estimate." Timeline: chart (`src/timeline/chart.ts`
  pure geometry, tested; `EquityChart.svelte`), legend, provenance, month-dated cliff list
  (equity row shows value vs owing), "Already behind you", empty states. Chart details: y
  top = 3 grid steps of whole $1k; marker labels sit at the bottom, stagger to a second row
  when within 44px, and turn inward at the right edge; crossover label sits above the dot and
  faces the open side. Shared `src/garage/CliffList.svelte` replaces Garage's inline list.
  **Pro is not gated yet:** tile, banner and chart render for everyone with a Pro tag. Gating
  needs the entitlement check (Phase 1 item 2), and dimming now would hide the feature from
  the only user. Phase 1 must add the dimmed states (spec: free sees the Timeline list with
  the chart dimmed).
  **"Refresh value" button not added:** nothing to refresh into until Session 13 builds
  anchor entry; Session 13 adds the button with its form.

### Session 13 · Value refresh and comps
- Add a value anchor by hand (amount, source, date) and by pasting 3–5 comp prices
  (median becomes the anchor).
- Deep-link builder for AutoTrader.ca and CarGurus searches from year/make/model/km
  and a radius.
- Done when: adding an anchor moves the chart and the window sentence.
- **Status 2026-11-03: done.** Checked in Chrome at 375px with the example car holding only a
  purchase price: the purchase-only curve said "Your window: now to Jun 2027" (equity +$1,743);
  pasting four comps ($14,350 median) moved the chart and changed the Garage tile and banner to
  "Feb to Jun 2027" / "−$750 · positive in ~3 months"; the entry survived a reload.
  Model: `src/model/comps.ts` `medianPrice` (even count averages the middle two, rounded to the
  cent). `addValueAnchor` / `removeValueAnchor` in `vehicle.ts`: one anchor per date (a new one
  on the same date replaces it, whatever its source), kept in date order. Entry parsing is
  `readValueEntry` in `src/garage/inputs.ts`: comps need 3 to 5 prices split on whitespace or
  semicolons (a trailing comma is dropped; commas inside a number are thousands separators), each
  between $500 and $500,000, so a km figure run into a price is rejected, not silently taken.
  Amounts (offer, own figure) use the same bounds. Anchor date defaults to today, not future.
  `valueBasisLine` for comps now ends "(asking prices)", since asking prices run above what a
  dealer pays (Session 12's note).
  UI: `src/timeline/ValueRefresh.svelte` under the Timeline chart: "Refresh value from comps"
  button opens (1) find comps: optional postal code + radius (25/50/100/250 km) + two links,
  (2) enter: Comps / Outside offer / My figure, date, "Update value"; below it a list of value
  entries with Remove. Garage's value tile has a "Refresh value from comps" button to `#timeline`.
  Postal code is not stored (it only goes into the link); no schema change.
  **AutoTrader.ca link, verified in Chrome:** `/cars/{make}/{model}/my_{year}?kmfrom=&kmto=`
  plus `zip=<postal>&zipr=<km>` when a valid Canadian postal code is given (radius honoured: 50 km
  gave 17 results, 100 km gave 19). Slugs are lowercase with non-alphanumerics as hyphens; checked
  on CX-5, RAV4, F-150, Grand Cherokee, Silverado 1500, 3 Series, Sienna, Odyssey, Pacifica,
  Carnival. An unknown model degrades to all of that make's cars in that year, not an error. Km band
  is ±20% (at least ±15,000) widened to whole 5,000s. The old `?make=&mdl=&yRng=` form redirects
  but drops radius and postal code, so it is not used.
  **Deviation: CarGurus is a Google search, not a filtered link.** CarGurus.ca filters by internal
  model ids (the id in a URL decides the model, not the name; a guessed id opened a Jeep Renegade
  page) and its search endpoint returns 403 to headless Chrome. A table of ids would be data to
  maintain and verify per model, so the button opens
  `google.com/search?q=<year make model> for sale site:cargurus.ca`. Headless Chrome got Google's
  bot check on it, so that link is unverified in a real browser; Matt should tap it once.
  **Still not done: the "your estimate: $X" hint beside the Dealer's trade allowance** (Session
  10 deferral). With comps in, it would show a retail-ish number next to a number that is
  normally lower; the outside-offer benchmark already carries the trade-side figure. Left out
  unless Matt asks.
  Found, not fixed: the app declares no favicon, so browsers log a 404 for `/favicon.ico`.
  Session 14 (or Phase 1 icons) should add one.

### Session 14 · Polish pass and Phase 0 close
- Phone-width audit on a real phone via the GitHub Pages URL: tap targets, keypad
  behaviour, no horizontal scroll, safe-area padding.
- Empty states for every screen. Error copy that says what to do.
- Tag `v0.1.0`.
- **Status 2026-11-03: done in emulation, tagged `v0.1.0`; the real-phone pass is Matt's.** Headless
  Chrome (DevTools protocol, mobile emulation with touch) at 320 and 375px over every route × three
  garages (example car, empty, unreadable blob): no horizontal scroll, no control under 44px except an
  inline text link, no input under 16px (no iOS focus zoom), no console errors. Still unchecked: real
  keypad behaviour and safe-area padding on a notched phone. Matt should open the Pages URL on his
  phone once and tap through.
  **Bug fixed, test-first: the decoder silently treated unreadable input as zero/blank** ("3k" down
  became $0, "84 mo" said "enter the term"). `fieldProblems` in `src/decoder/inputs.ts` returns a
  message per typed-but-unreadable field; `readDecoder` now returns `problems` and no quote while any
  exist, so it never guesses. `Field` takes `error` (red state, `aria-invalid`, described-by); the
  readout and the Verdict's empty state say to fix the red field.
  Settings screen (was a stub): where data lives, the Safari ~7-day storage caveat, that share links
  carry the numbers, "Copy the unreadable data" when the backup key exists (the Garage recovery notice
  now points there), "Erase everything" (`eraseGarage` removes the garage and backup keys;
  `KeyValueStore` gained `removeItem`; decoder reset too), and an About card (not advice; Ontario rule
  figures read from `TAX_RULES`; values rough; Pro open while testing; version from package.json).
  Polish: Dealer and Verdict now use base.css (Session 9 note closed); `.card .btn.quiet` gets a white
  fill and border, because quiet buttons inside grey cards were invisible app-wide; SVG favicon in
  `public/` (Vite rewrites it under `/TradePoint/`). Apple touch icon waits for Phase 1 icons.
  Not built, and in no session: the spec's free "Prep checklist". The garage's "Your benchmarks" card
  is the closest thing. Plan it with Phase 1 if Matt wants it.

## Phase 1 — stores and Pro (planned 2026-11-04)

Eleven sessions, 15–25. At one a week that's late January 2027 plus store review time.
Order: the web-only features come first (15–20) because none of them need Xcode, Android
Studio or a developer account, and Matt can sort those out in parallel. Native work
(21–25) comes last. Product rules for everything below are in `docs/spec.md`
under "Phase 1 (2026-11-04)".

Model per session (same rule as Phase 0: Opus where a wrong answer looks right or loses
data; Sonnet elsewhere; no Haiku, because redoing a session costs more than it saves):

| Session | Model | Why |
|---------|-------|-----|
| 15 Prep checklist | Opus | Ontario rules are verified data like Session 7; the trade-offer parser change feeds the verdict |
| 16 Pro seam | Sonnet | Wiring and one sheet; the flag-off check catches misses |
| 17 Saved deals, schema v3 | Opus | A migration chain; a mistake erases garages |
| 18 Side by side | Sonnet | Display of numbers already computed and tested |
| 19 Multiple vehicles | Sonnet | UI over the v2 shape; switch to Opus if the Pro-loss rules get murky |
| 20 PDF | Sonnet | Layout and a pure function with tests |
| 21 Capacitor shell | Sonnet | Toolchain trial and error; speed matters more than depth |
| 22 Native storage | Opus | Async storage behind a sync interface, plus a one-way copy on first launch |
| 23 RevenueCat | Opus | Purchase edge cases (pending, refund, offline) that look right when wrong |
| 24 Store listings | Sonnet | Copy and forms; the guideline check is a checklist |
| 25 Launch | Sonnet | Switch to Opus if a rejection reason is ambiguous |

### Matt's prerequisites (blocking, with the session that needs them)

| Needed by | What | Notes |
|-----------|------|-------|
| 21 | Full Xcode from the Mac App Store | Today the Mac only has Command Line Tools. After install: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, open Xcode once, install an iOS simulator |
| 21 | Android Studio with the SDK and one emulator | `~/Library/Android/sdk` does not exist yet |
| 21 | iPhone with Developer Mode on, USB cable | For the real-phone pass Phase 0 never got |
| 23 | Apple Developer Program, active | US$99/yr; enrolment takes days. Then in App Store Connect: Paid Apps agreement, banking, tax forms. IAP doesn't work until those are accepted |
| 23 | Google Play Console account | US$25 one-time; identity check takes days. **New personal accounts must run a closed test with at least 12 opted-in testers for 14 consecutive days before production access.** Matt needs 12 people (family, friends) with Android phones |
| 23 | RevenueCat account | Free. One project, iOS and Android apps added |

If 21's tools aren't ready when 15–20 are done, stop and ask; don't start native work
half set up.

### Session 15 · Prep checklist (free)
- Spec "Prep checklist". Garage card "Before the dealership" with four rows, each with a
  done state: pre-approval rate, two trade figures, walk-away all-in, Ontario rules.
- Benchmarks gain `tradeOffers` (up to two, each `{ source, amountCents, date }`) and
  `walkAwayCents`. Parser reads the old single `outsideTradeOffer` as one offer. The
  decoder's outside-offer benchmark is the higher offer; the share codec is unchanged.
- Ontario rules card is data (`provinces.json` gains `rules[]` with `source`, `verifiedOn`).
  Verify against OMVIC's site; never from memory.
- Dealer screen gets a walk-away field (optional; works with no garage). Verdict gets
  one line under the breakdown: all-in vs walk-away in dollars. It never changes the
  headline or severity. Walk-away stays out of the share link.
- Plain links only (bank/credit union pre-approval, outside offer sites); no referrals.
- Done when: tests cover the parser change and the walk-away line; Matt's worked example
  with a $33,000 walk-away reads "$1,881 over your walk-away".
- **Status 2026-11-04: done.** Changed from the plan: instead of the parser quietly reading
  the old field, this was done as a real **schema bump, v1 → v2** (`garageV1ToV2` in
  `src/store/garage.ts`). `vehicle.benchmarks` became `vehicle.prep`
  (`src/model/prep.ts`: `preApprovalApr`, `tradeOffers[]` max 2 `{ source, amount, date? }`,
  `walkAway`, `rulesReadOn`); a v1 `outsideTradeOffer` becomes one offer from "Outside offer"
  with no date; empty benchmarks are dropped; malformed v1 data goes down the existing
  backup/recovery path. The stored text stays v1 until the next save. `decoderBenchmarks(prep)`
  gives the decoder the higher offer. The walk-away lives on `DecoderReading`, not in
  `Benchmarks`, so it can't reach `verdict()` or the share codec (tested).
  Ontario rules: five, in `provinces.json` `ON.rules`, each sourced to omvic.ca (all-in price
  page, cancelling-an-agreement page), checked 2026-11-04: all-in except HST and licensing,
  no cooling-off, deposit with no contract is refundable, conditions in writing, 90-day cancel
  for undisclosed used-car history. Links in `src/data/prepLinks.json`: FCAC "shop around for
  auto-financing", Canada Drives sell page, Clutch `sell-or-trade` (Clutch is a JS app; it was
  confirmed through its search index, not by loading it). AutoTrader's instant offer URL is a 404;
  left out. Garage card `PrepChecklist.svelte` replaces the old benchmarks form in VehicleSetup.
  Checked in headless Chrome at 320 and 375px against a v0.1.1-shaped garage: it upgrades with
  no recovery notice, all four rows complete, the result survives reload, the decoder fills
  walk-away 33000 and offer 9200, and the Verdict reads "$1,881 over your walk-away of $33,000."
  No horizontal scroll, checklist targets ≥ 44px, no console errors. 617 tests.
  Overlap left alone: an outside offer can also be entered as a value anchor on Timeline
  (source "offer"). They aren't linked. If Matt enters the same number twice, offer to copy one
  into the other.

### Session 16 · Pro seam and paywall sheet
- `src/pro/`: an `Entitlement` interface (`isPro`, `purchase`, `restore`, subscribe to
  changes) and a web implementation. A build flag (`VITE_PRO_OPEN`, default true until
  Session 25) keeps everything open on the web while testing.
- One `requirePro(feature)` path used by every Pro element: equity tile, window banner,
  Timeline chart, second vehicle, save deal, compare, PDF. Dimmed elements open the sheet.
- Paywall sheet copied from mockup screen 6: price, "once", four inclusions, what stays
  free, Unlock, Not now. "Not now" suppresses the sheet for the rest of the session
  (in memory, not stored). Never shown on launch.
- Settings: replace the "open while testing" line with a dev toggle that is only shown
  when the flag is on.
- Done when: with the flag off, every Pro element opens the sheet and nothing Pro
  renders; with it on, nothing changes from v0.1.1.
- **Status 2026-11-07: done.** `src/pro/`: `Entitlement` interface + `createWebEntitlement`
  (`entitlement.ts`), `createProGate` (`gate.ts`: `request(feature)`, `dismiss`, `unlock`, session-long
  "Not now" suppression), `pro.svelte.ts` (`requirePro(feature)`, `pro` reactive state, `PRO_OPEN` from
  `VITE_PRO_OPEN`, default true), `ProLock.svelte` (dimmed button card), `PaywallSheet.svelte` (native
  `<dialog>`: focus trap and Escape for free; Escape counts as Not now). `ProFeature` already names
  `vehicles`, `saveDeal`, `compare`, `pdf` for Sessions 17-20 to call. Wired now: Garage equity tile and
  window banner, Timeline chart. Locked state renders no numbers. The web purchase is a stub that unlocks
  in memory only; Session 23 swaps in RevenueCat. Settings shows a "Lock Pro features" testing checkbox
  (persisted under `tradepoint.testingLock`) only when the flag is on. Price text is `PRO_PRICE` in
  `src/pro/copy.ts`; Session 23 should take it from the store. `browserStorage` moved to
  `src/store/browserStorage.ts`. 643 tests. Checked in headless Chrome at 320/375px on a flag-off
  and a flag-on build. Left free: "Refresh value from comps" on Timeline (not in the Pro list).
  No Restore button yet (Session 23, store review requires one).

### Change 2026-11-07 · Payment planner on the Dealer screen (Matt's request, between 16 and 17)
- Dealer screen has two modes, segmented at the top: "Plan a payment" (default, title "What will it
  cost?") and "Check a quote" (the old decoder, "What did they say?"). Both edit the same `decoder`
  inputs, so shopping figures carry into the desk check; only the payment is left to type.
- Plan math: `planPayment` in `src/math/deal.ts` (dollars), `paymentPlan` in `src/model/deal.ts`
  (cents; payment rounded to the cent, totals from the rounded payment). All-in = advertised + HST on
  (price − trade) + licensing estimate; financed = max(0, all-in − down − net trade). Tested so the
  planned payment decodes to a $0 gap. `readPlan` in `src/decoder/inputs.ts` reads only the shown
  fields (price required; benchmarks and walk-away hidden and ignored in plan mode).
- `dealer.mode` lives in `src/decoder/state.svelte.ts` (memory only). Garage's "I'm at a dealership",
  Verdict's Edit and "Go to the decoder" set it to "check"; Settings erase resets it to "plan".
- Not done: saving or sharing a plan. Session 17 (saved deals) should decide whether a plan is
  saveable; a plan plus its rounded payment is already a valid `DealQuote`.
- 660 tests. Checked in headless Chrome at 320/375px: worked example plans $420.76/mo, bi-weekly
  $193.94, unreadable field blocks the result, switching to Check and entering $450 gives the verdict.

### Session 17 · Saved deals (schema v3)
- Test-first. `SavedDeal` model and parser; `deals: unknown[]` becomes `SavedDeal[]`.
  `schemaVersion` 2 → 3 (Session 15 used v2). The migration keeps every vehicle exactly; test
  it with real v1 and v2 blobs chained through, including the unreadable-blob backup path.
- Save from Verdict with a label (dealer name), list on Dealer, open (restores the
  decoder), rename, delete. Saving is Pro.
- Done when: v1 and v2 garages survive the upgrade untouched; three saved deals survive
  reload.
- **Status 2026-11-07: done.** `src/model/savedDeal.ts`: `SavedDeal { id, label, savedAt (IsoDate),
  quote, benchmarks, vehicleId? }`, `parseSavedDeal` (strict: payment > 0, term 1-120, rates 0-1, ON only,
  advertised > 0 if present; unknown keys dropped), `savedDealInputs(deal, walkAway)` (round-trips through
  `readDecoder`), `createSavedDeal` (blank label → "Deal N", label capped at 40), `addDeal`/`renameDeal`/
  `removeDeal`/`newestFirst`, `findSaved` (field-by-field match), `savedLine` ("$34,881 all-in · Numbers
  don't match · Saved today"). Schema **v3** (`garageV2ToV3`): vehicles pass through untouched; v1/v2 `deals`
  become `[]` (no version before 3 ever wrote one; a non-array stays non-array so it still fails); spec's
  `selectedVehicleId?` added now so Session 19 needs no v4: kept only if it names an existing vehicle,
  otherwise dropped without failing; nothing sets it yet. A v3 deal that won't parse makes the whole garage
  unreadable (same rule as vehicles: backup copy + recovery notice). Walk-away is not saved; opening keeps
  whatever walk-away the decoder already has. `vehicleId` is set only when a garage value was used and the
  verdict wasn't from a share link. UI: `src/deals/SaveDeal.svelte` on Verdict (Pro via
  `requirePro("saveDeal")`; shows "Saved as X" when the current numbers match a saved deal, so no duplicates),
  `src/deals/SavedDeals.svelte` at the bottom of Dealer in both modes (tap → restores decoder in check mode
  and opens Verdict; Rename inline; Delete with confirm). Listing, opening, renaming and deleting stay free
  so losing Pro hides nothing. Plans ("Plan a payment") are not saveable; only checked quotes are.
  721 tests. Checked in headless Chrome at 320/375 on flag-on and flag-off builds: v2 and v1 garages load
  with the vehicle unchanged after a v3 write, three deals survive reload newest first, open/rename/delete
  persist, a bad v3 deal goes to the backup, flag-off lists and opens deals but Save opens the sheet.

### Session 18 · Side by side
- Pick two saved deals → compare screen: payment and frequency, term, APR, financed,
  all-in, total interest, total paid, gap vs advertised, verdict level each.
- Differences in dollars ("B is $1,240 less all-in, $3,100 less interest"). No winner,
  no good/bad wording; a lower payment over a longer term says so.
- Done when: checked at 320/375px with two deals that differ in term and rate.
- **Status 2026-11-07: done.** `src/model/compare.ts` (`compareDeals(a, b)`: figures, verdict level and
  monthly-equivalent payment per side), `src/model/compareCopy.ts` (`compareRows`: payment with frequency
  note, term, rate, financed, all-in, interest, total paid, gap vs advertised, verdict; `differenceLines`:
  "B is $2,505 less all-in, $2,865 more interest and $360 more in total paid." then a payment line such as
  "B's payment is $70 a month lower, but it runs 12 months longer."; "but" when payment and term pull
  opposite ways, "and" when they agree; figures within a dollar are left out; all equal gets one
  "same" sentence; no winner or good/bad words, tested). Route `#compare=<idA>,<idB>` (two distinct ids,
  otherwise `ids: null`), tab stays Dealer. Screen `src/screens/Compare.svelte`: A/B columns, a missing
  deal or bare route explains itself, reload keeps the comparison. Picker on the Dealer saved list:
  "Compare two" (shown with 2+ deals, Pro-gated via `requirePro("compare")`), checkboxes, third box
  disabled at two, first pick is A. With Pro locked the compare screen shows a lock card and no numbers.
  Differences are always B against A; each deal keeps its own benchmarks for its verdict. `formatPercent`
  is now exported from `verdictCopy.ts`. 747 tests. Checked in headless Chrome at 320/375 on
  flag-on and flag-off builds with a 72-month 5.99% and an 84-month 7.99% deal, plus a bi-weekly deal with a
  long name: no horizontal scroll.

### Session 19 · Multiple vehicles
- Vehicle switcher on Garage and Timeline; selected vehicle id persisted. Adding a second
  vehicle is Pro.
- Losing Pro (refund, flag off) never deletes or hides data: the selected vehicle stays
  fully usable, the rest show read-only with a Pro tag.
- Garage → decoder handoff uses the selected vehicle.
- Done when: three vehicles, switch, reload, remove one; the flag-off case keeps all three.

### Session 20 · PDF export
- One saved or current deal → one-page PDF: verdict headline, gap rows, breakdown,
  ask-for list, the not-advice line and the date. pdf-lib, loaded with a dynamic
  `import()` so it stays out of the main bundle; standard fonts are fine.
- Built as a pure function from deal → bytes, tested in Vitest (parse the output, check the
  text). Web: download. Native file sharing is Session 22.
- Done when: the worked example's PDF shows the same numbers as the Verdict screen and
  the main bundle size didn't grow by more than a few KB.

### Session 21 · Capacitor shell
- Needs Xcode and Android Studio (see prerequisites). Capacitor 8 (`@capacitor/core`
  8.6 on 2026-11-04). App id `io.github.mattnero.tradepoint`, name TradePoint.
- `vite build` with `base` set per target: `/TradePoint/` for Pages, `./` for native.
  The Pages deploy must keep working.
- Icons and splash from the token palette (teal mark on white). Safe-area insets on nav
  and sheets. Status bar dark text on white.
- Done when: the app runs on the iOS simulator, an Android emulator and Matt's iPhone;
  the real-phone tap-through from Session 14 is done there.

### Session 22 · Native storage, share and files
- Test-first. iOS can clear WebView localStorage under storage pressure, so native
  builds store the garage in `@capacitor/preferences`. It's async and `KeyValueStore`
  is sync: load once at startup into memory, write through. On first native launch,
  copy any existing localStorage garage across before reading. Web is unchanged.
- Settings: "Restore from a backup" (paste the backup text), so Matt's web garage can
  move into the app.
- Share button and PDF use the native share sheet (`@capacitor/share`, `@capacitor/filesystem`).
  Share links still point at the Pages URL.
- Done when: kill and relaunch keeps the garage on both platforms; a web backup pasted
  into the app restores the Santa Fe; a PDF reaches Messages/Files.

### Session 23 · RevenueCat
- Needs the developer accounts and agreements (see prerequisites). One non-consumable
  product `pro`, $4.99 CAD, in App Store Connect and Play Console; one RevenueCat
  entitlement `pro`. `@revenuecat/purchases-capacitor` (14.0 on 2026-11-04).
- Native `Entitlement` implementation; public SDK keys come from untracked `.env`
  (they end up in the app binary; that's how RevenueCat's public keys are meant to work).
  Restore purchases in the sheet and Settings. Offline launch uses the SDK's cached
  customer info; never lock someone out because there's no signal at a dealership.
- Cancelled purchase, pending purchase (Ask to Buy), refund → rules from Session 19.
- Upload the first signed Android build to a Play closed test now so the 14-day clock starts.
- Done when: sandbox purchase and restore work on the iPhone and an Android test device;
  airplane mode after purchase keeps Pro.

### Session 24 · Store listings
- Privacy policy page on Pages (no data collected, nothing leaves the device except what
  the user shares). App Store privacy label "Data Not Collected"; Play data-safety form to match.
- Screenshots at the required sizes from the real app with the example car. Listing copy:
  what it does, Ontario first, not financial advice, "Numbers match" language only.
- Review check: Apple 4.2 (minimum functionality; the app must work offline and use
  native share, which 22 covers), 3.1.1 (IAP only; the app never links to a web
  purchase), financial-calculator disclaimer in the app and listing.
- TestFlight build out to Matt; Play closed test running with 12+ testers.
- Done when: both listings are complete, with no missing-field warnings.

### Session 25 · Launch
- Submit to both stores; fix review feedback (may take more than one sitting; that's fine).
- Web build flips `VITE_PRO_OPEN` off: Pro elements on the web open a sheet that says
  Pro is in the iPhone and Android apps, with store links. No web purchase.
- Tag `v1.0.0`.
- Done when: both apps are live and a real purchase on Matt's phone unlocks Pro.

## Phase 2 — if still fun

Referrals for outside trade offers and pre-approval with inline disclosure; other
provinces; share image card; lease decoder. Each gets its own plan.

## Risks to watch while building

- **Depreciation curves are made up until anchored.** Say so in the UI every time.
- **Warranty data drift.** Manufacturers change terms; a `verifiedOn` date per row and
  a yearly check is enough for a hobby.
- **Scope creep toward a maintenance log.** The companion tracks cliffs, not oil
  changes. If a maintenance feature doesn't change the trade window, it's out.
- **Play's 12-tester closed test.** 14 consecutive days before production access; start it
  in Session 23, not 25.
- **Apple guideline 4.2 (wrapped websites).** Offline use, native share and local files are
  what make it an app; don't cut them to save time.
- **The van happens before session 5.** Then the decoder page at session 3 plus a
  calculator in the test file is the fallback; it still beats the four-square.
