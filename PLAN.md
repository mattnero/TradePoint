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

### Session 8 · Cliff engine
- `src/model/cliffs.ts`: given vehicle + loan + value anchors, return dated events:
  warranty expiries, next odometer thresholds (100k/150k/200k), equity crossover,
  seasonal window for the segment, maintenance window (from a small per-segment
  interval table, user-editable later).
- Pure functions, tests for each cliff type plus the "already past" cases (a 2019
  Santa Fe has no warranty cliff left; the engine must say so, not invent one).
- Done when: the mockup's example vehicle yields the four cliffs in the mockup order.

### Session 9 · Garage screen (free tier)
- Vehicle card, odometer, km/month, cliff list, "I'm at a dealership" button.
- Progressive onboarding: year/make/model + current km first; purchase and loan
  later, each unlocking more of the screen.
- Equity tile present but dimmed with a Pro tag (no paywall yet; a stub).
- Done when: Matt's real Santa Fe is in the garage with correct odometer and
  warranty state.

### Session 10 · Garage → decoder handoff
- "I'm at a dealership" pre-fills trade payoff from the loan and trade allowance
  benchmark from the latest value anchor; the fields show the teal "from your garage"
  state.
- Benchmarks (pre-approval rate, outside offer) live on the vehicle and pre-fill too.
- Done when: a garage with a loan opens the decoder with payoff filled and a verdict
  that includes the trade gap.

### Session 11 · Depreciation and equity projection
- `src/model/value.ts`: segment curve anchored to purchase price, then re-anchored
  through user value entries (latest anchor wins; curve shape preserved).
- `projectEquity(vehicle, loan, months)` → arrays for the chart; crossover month.
- Tests: with no anchors it follows the segment curve; with one anchor it passes
  through it; crossover matches a hand calculation.
- Done when: the example vehicle crosses positive at month 4.

### Session 12 · Timeline screen and window sentence
- SVG chart (two lines, dashed cliff markers, crossover dot) drawn from the
  projection; the mockup's chart code is a direct starting point.
- Cliff list below, "Refresh value" entry.
- `windowSentence(cliffs, equity)`: the plain-language recommendation that always
  includes the "keep it" cost per year.
- Done when: Garage banner and Timeline agree with each other for the example car.

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
