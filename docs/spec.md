# TradePoint spec

Agent-facing. Terse on purpose. Dates are decision dates.

## Product (2026-11-02)

Two jobs: (1) ownership companion that tells the user when to trade, (2) decoder that
reverses a dealer's payment quote into real cost at the desk. Companion leads; decoder
is a mode reached from the Garage via "I'm at a dealership", pre-filled with the
garage's loan payoff and value benchmarks.

Target user: private buyer in Canada, Ontario first. Not fleet, not lease (lease later).

## Tiers

| Free | Pro ($4.99 one-time, store IAP) |
|------|-------|
| One vehicle | Multiple vehicles |
| Cliff list (warranty, km thresholds, maintenance, season, equity crossover as a dated row) | 36-month chart (value vs loan) |
| Decoder + verdict + breakdown + ask-for chips | Equity tile and window sentence |
| Share link (URL fragment) | Saved deals, side-by-side |
| Prep checklist | PDF export |

Paywall appears on tapping a dimmed Pro element, never on first launch. States price,
"once", and what stays free.

## Screens (match docs/mockups/tradepoint-mockups.html)

1. Garage: vehicle card (name, km, km/mo), value vs loan vs equity tile (Pro), window
   banner (Pro), next-cliffs list, "I'm at a dealership".
2. Timeline (Pro chart, free list): SVG two lines + dashed cliff markers + crossover
   dot; dated cliff list; "Refresh value from comps".
3. Dealer, two modes (2026-11-07). "Plan a payment" (default): advertised price
   (required), frequency, term, APR, down, trade-in value, owing on trade → payment at
   the chosen frequency, plus all-in (price + HST + licensing), financed, total
   interest, total paid; for shopping before the desk. "Check a quote" (the decoder):
   payment, frequency segmented (monthly/bi-weekly/weekly), term, APR, down,
   advertised price (optional, visible), trade allowance, trade payoff; benchmarks:
   pre-approval APR, outside trade offer. Garage-sourced fields styled teal.
4. Verdict: headline + subtitle with threshold in dollars; three gap rows (price, rate,
   trade) with severity stripes; breakdown (financed, down + net trade, implied all-in,
   total interest, total paid); ask-for chips; "I need 10 minutes" (copies text);
   Share.
5. Shared snapshot: dark card; quoted / really paying / advertised + tax / unexplained;
   rate markup cost; trade shortfall; link opens free web decoder with inputs restored.
6. Pro sheet.

Onboarding is progressive: year/make/model + km first (unlocks warranty and km
cliffs), purchase price/date and loan later (unlocks equity), value anchors later.
Decoder must work with zero garage data.

## Math (src/math, tested)

- Periodic rate r = APR / periodsPerYear; n = round(termMonths * periodsPerYear / 12).
- amountFinanced = P(1-(1+r)^-n)/r; APR 0 → P·n. payment = A·r/(1-(1+r)^-n).
- monthlyEquivalent = payment · periodsPerYear / 12 (display; compute at quoted
  frequency).
- netTradeEquity = allowance − payoff. impliedAllIn = financed + down + netTradeEquity.
  totalPaid = P·n + down + netTradeEquity. totalInterest = P·n − financed.
- expectedAllIn (ON) = advertised + 0.13·max(0, advertised − allowance) + 150.
- unexplainedGap = impliedAllIn − expectedAllIn.
- rateGap = (P − paymentFor(financed, bankRate, n)) · n. tradeGap = allowance − offer
  (negative = dealer under the outside offer).
- Remaining balance after k payments: B(1+r)^k − p((1+r)^k − 1)/r.

## Verdict (2026-11-02)

Per gap: level = gap > 8%·impliedAllIn → large; > 3% → ask; else match. Headline =
worst level: "Numbers match" / "Numbers don't match" / "Large gaps". Subtitle names
the count of gaps over the 3% line and the line in dollars. Gaps with no benchmark
entered are omitted, not zero.

## Cliffs (src/model/cliffs)

- Warranty: comprehensive and powertrain expiry = min(inService + years, km reach of
  limit at current km/mo). Already-expired → not a cliff; report as past.
- Odometer: next of 100k/150k/200k; date from km/mo.
- Equity crossover: first month projected value ≥ loan balance. Already positive → not
  a cliff.
- Season: per segment (AWD/SUV/truck Sep–Dec; convertible/sports Mar–Jun; default none).
- Maintenance: per-segment interval table (e.g. transmission fluid ~96k), user-editable
  later. Window = sell before, flagged with typical cost.
- Window sentence: picks the span between the earliest beneficial cliff (equity
  positive) and the earliest harmful one (warranty end, 100k), and always appends the
  keep-it cost per year (interest + estimated depreciation for the next 12 months).

## Value model (src/model/value)

Segment curve: firstYearDrop, monthlyRate thereafter, flattening after year 6. Anchored
at purchase price; re-anchored through user value entries (latest anchor is exact; the
curve keeps its shape after it). Comps entry: 3–5 prices → median anchor, source
"comps". UI always states the curve's provenance.

## Data files (src/data)

- warranty.json: make → { comprehensive: {years, km}, powertrain: {years, km},
  source, verifiedOn }. Canadian terms. Verify against manufacturer sites; never from
  memory.
- provinces.json: code → { taxRate, tradeInReducesBase, licensingEstimate }. ON only.
- segments.json: segment → { firstYearDrop, monthlyRate, season, maintenance[] }.

## Persistence

localStorage key `tradepoint.garage.v1`, `{ schemaVersion, vehicles[], deals[] }`.
schemaVersion 2 (Session 15): vehicle `benchmarks` → `prep`. schemaVersion 3 (Session 17)
types `deals` as `SavedDeal[]` and adds `selectedVehicleId`.
Money in integer cents; rates as decimals; dates ISO strings. load() wraps in try/catch
and falls back to empty; migrate(fromVersion) chain.

## Share codec

`#d=<base64url>` of a versioned fixed-order array of decoder inputs. Opens on Verdict
with an Edit path. No server.

## Phase 1 (2026-11-04)

### Prep checklist (free)
Garage card "Before the dealership", four rows with done states:
Stored on the vehicle as `prep` (schemaVersion 2 renamed it from `benchmarks`).
1. Pre-approval rate from a bank or credit union → `prep.preApprovalApr`.
2. Trade figures from two independent sources (an outside offer beats an estimate) →
   `prep.tradeOffers[]`, max 2, `{ source, amount, date? }` (cents). Verdict trade gap
   uses the higher one. A v1 `outsideTradeOffer` migrates to one offer, source "Outside offer".
3. Walk-away all-in → `prep.walkAway` (cents). Verdict shows one line: implied
   all-in vs walk-away in dollars. Never affects headline or severity. Not in share links.
   Rules row is done when `prep.rulesReadOn` is set ("Got it").
4. Province rules card from `provinces.json` `rules[]` (ON: advertised price is all-in
   except HST and licensing; admin fees added at the desk breach OMVIC rules). Each rule
   has `source` and `verifiedOn`.
Links are plain (no referral) until Phase 2.

### Pro entitlement
`Entitlement` interface: `isPro`, `purchase`, `restore`, change subscription. Web
implementation is controlled by `VITE_PRO_OPEN` (open until store launch; afterwards
web Pro elements point to the store apps, no web purchase). Native implementation is
RevenueCat, entitlement `pro`, non-consumable product `pro`, $4.99 CAD. Offline uses
cached customer info. Losing Pro never deletes or hides data: the selected vehicle and
all saved deals stay readable; Pro-only actions get the Pro tag.

### Saved deals (Pro)
`SavedDeal { id, label, savedAt, quote, benchmarks, vehicleId? }`; quote/benchmarks are
the decoder's shapes in cents and decimals. Compare takes exactly two: differences in
dollars, no winner wording.

### PDF (Pro)
One page per deal: headline, gap rows, breakdown, ask-for list, date, not-advice line.
Pure function deal → bytes (pdf-lib, lazy-loaded).

### Native storage
Native builds keep the garage in Capacitor Preferences (iOS may evict WebView
localStorage). Loaded once into memory at startup, written through. First native
launch copies any localStorage garage across.

## Visual

Light-only. Tokens from the mockup: teal accent (#0E7C86), surface white, surface-2
#F3F5F7, ink #16212B, muted #62707C, line #D8DEE4; semantic good #2F8A57, warn
#B9771A, bad #B5443B. Display face Barlow Condensed for numbers and headings; IBM Plex
Sans for text; tabular numerals everywhere digits align.

## Out of scope

Lease (Phase 2+), maintenance log, fuel log, marketplace, dealer leads, ads, data
sale, B2B, dark mode, scraping, accounts, backend.
