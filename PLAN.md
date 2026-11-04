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
| Mobile (Phase 1) | Capacitor 6 | Wraps the same build; iOS needs Xcode on this Mac, Android needs Android Studio |
| Payments (Phase 1) | RevenueCat | Free under US$2.5k monthly revenue; handles both stores' IAP and receipt validation |
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

### Session 14 · Polish pass and Phase 0 close
- Phone-width audit on a real phone via the GitHub Pages URL: tap targets, keypad
  behaviour, no horizontal scroll, safe-area padding.
- Empty states for every screen. Error copy that says what to do.
- Tag `v0.1.0`.

## Phase 1 — stores (sketch, plan properly after Phase 0)

1. Capacitor init; iOS and Android projects; app icons and splash from the token
   palette; test on both devices.
2. RevenueCat: one non-consumable product (`pro`), entitlement check gates the
   equity tile, chart, multi-vehicle, saved deals, PDF.
3. Paywall sheet as mocked; restore purchases; "Not now" never nags again that session.
4. Saved deals + side-by-side; PDF export via the browser print pipeline is blocked
   in Capacitor webviews, so use a small client-side PDF library or render to image.
5. Store listings: screenshots from the mockup palette, privacy labels (no data
   collected), review guideline check for financial calculators (disclaimer text).
6. Apple Developer Program enrolment takes days; start it during Phase 0 session 12.

## Phase 2 — if still fun

Referrals for outside trade offers and pre-approval with inline disclosure; other
provinces; share image card; lease decoder. Each gets its own plan.

## Risks to watch while building

- **Depreciation curves are made up until anchored.** Say so in the UI every time.
- **Warranty data drift.** Manufacturers change terms; a `verifiedOn` date per row and
  a yearly check is enough for a hobby.
- **Scope creep toward a maintenance log.** The companion tracks cliffs, not oil
  changes. If a maintenance feature doesn't change the trade window, it's out.
- **The van happens before session 5.** Then the decoder page at session 3 plus a
  calculator in the test file is the fallback; it still beats the four-square.
