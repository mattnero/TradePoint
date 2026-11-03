# 09 — Trade-In Timing

Matt's ask: help decide the best time to trade in the current car to maximise value.

## Reframe first: there is no peak to find

After purchase, a car's value only goes down. "Maximise value" cannot mean find the
high point; it has to mean one of:

1. **Avoid the cliffs.** Value drops in steps, not a smooth line. Sell before a cliff,
   not after.
2. **Minimise cost per month of ownership.** Holding longer is almost always cheaper
   overall; the honest tool often says "keep it".
3. **Exit at a point where the deal works**: positive equity, a known new-car
   incentive window, before a big repair.

Dealers already run the opposite of this feature. The "equity mining" call ("you're
in a great equity position, come in and upgrade") is a retention tactic that profits
from churning the customer into a new loan. This feature is the honest version: same
inputs, user's interest instead of dealer's.

## The cliffs (what the feature should actually track)

| Cliff | Why it matters | Data needed |
|-------|----------------|-------------|
| Warranty expiry (powertrain 5yr/100k km is common; bumper-to-bumper 3yr/60k) | Buyers and dealers pay a premium for remaining factory warranty; value steps down at expiry | User's purchase date + make warranty table (small static dataset) |
| Odometer thresholds: 100k, 150k, 200k km | Price breaks in listings and in wholesale guides; also search-filter cutoffs on AutoTrader | User's km and monthly rate |
| Negative → positive equity crossover | The month the loan balance drops below the car's value is the first month a trade doesn't cost cash | User's loan (03 math) + a value curve |
| Major scheduled maintenance | Timing belt, transmission service, tires + brakes together can be $2–4k; selling just before avoids it, selling just after rarely recovers it | Make/model service interval table, or user-entered |
| Model generation change | Outgoing-gen used values drop when the new gen launches | Public announcements; manual curation per model, or skip |
| Seasonality | AWD/trucks firm up Sept–Dec; convertibles and sports cars spring; general used demand softens Nov–Jan | Generic monthly index per segment |
| Used-market macro | 2021–23 showed used values can rise; indices like the Canadian Black Book Used Vehicle Retention Index are published monthly | Manual monthly entry or scrape-free summary |

## Minimum viable version

Everything in the table except the value curve is computable from what the user
already knows plus small static tables. So:

**Inputs**: vehicle (year/make/model/trim), purchase date and price, current km,
km per month, loan details (reuse the decoder's inputs), optional user-entered
current value (comps or an outside offer).

**Outputs**:
- Timeline for the next 36 months with markers: warranty expiry, next odometer
  threshold, equity crossover, projected big-maintenance window, seasonal window
  for this segment.
- Equity line: projected value vs loan balance by month.
- Plain-language recommendation, e.g. "Your powertrain warranty ends in 7 months and
  you'll cross 100,000 km in 9. If you intend to trade in the next two years, the
  window is the next 7 months. If you don't, keeping it is cheaper by roughly $X/year."
- Quarterly nudge: "refresh your value" with a prefilled comps link. This is the
  recurring open that makes 08 line 4 possible.

## The value curve problem

Same issue as 04. Without licensed data you have three options, in order:

1. **Segment-generic depreciation curves** (compact, mid SUV, pickup, luxury, EV),
   anchored to the user's purchase price. Crude but transparent. First year ~20–25%,
   then ~12–15% a year, flattening after year 6. EVs are steeper and noisier.
2. **User-refreshed anchors.** Each time the user enters a real value (comps, outside
   offer, CARFAX range) the curve re-anchors through that point. Three anchors over a
   year beats any generic curve.
3. **Licensed valuation feed** in a later phase if B2B revenue (08 line 3) pays for
   it. A credit-union partner may already have Black Book access it can expose.

Say what the curve is. "Estimated from a mid-SUV average, re-anchored to your Clutch
offer on Sept 14" is credible. A single confident number isn't.

## Companion-led: what that means (Matt's call, 2026-11-02)

Matt's read is that an ownership companion pulls in more people than a dealership
decoder, because everyone owns a car every day and only shops once a decade. Fair,
with two cautions:

**It's a crowded category.** Drivvo, Fuelly, Simply Auto, AUTOsist, CARFAX Car Care
(US), KBB My Garage (US, free value tracking), Jerry (US). Most are maintenance logs
and fuel trackers. None in Canada does the equity-crossover / trade-window angle, and
none hands you a decoder when you walk into the dealership. That combination is the
listing's pitch: "know when to trade your car, and check the deal when you do." Do
not build a fuel log or a maintenance diary to compete with them; link out or skip.

**Onboarding cost is real.** The decoder needs six numbers and no account. The
companion needs vehicle, purchase date and price, km, km/month, loan. Make it
progressive: vehicle + km first (gives the warranty and odometer cliffs immediately),
loan later (unlocks equity), value refresh later still. Every screen must show
something useful before asking for the next input.

**Integration is the moat for a hobby.** When the user taps "I'm at a dealership",
the decoder arrives pre-filled with their trade allowance benchmark, loan payoff and
current value. That's a 30-second advantage no standalone calculator has, and it
costs almost nothing once both halves exist.

## What this feature changes about the product

- Decided: the companion leads (07 q9). The decoder is a mode. Store copy, icon and
  first-run flow are built around "your car's exit plan".
- Onboarding gets longer (vehicle, loan, km). Make it optional and progressive; the
  decoder must still work with six numbers and no account.
- The honest output is frequently "keep your car". That's the trust-building outcome
  and the one that gets the app recommended. Resist tuning the recommendation toward
  "trade now" because it feeds referrals.
