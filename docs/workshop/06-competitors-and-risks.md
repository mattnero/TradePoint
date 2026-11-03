# 06 — Competitors and Risks

## Who already does this

| Product | Market | What it does | Gap it leaves |
|---------|--------|--------------|---------------|
| CarEdge (app + site) | US | Closest existing match: deal school, fair-price insights, payment calculators, "deal coach" | US pricing data and US tax/fee rules. Not Canadian |
| Edmunds / KBB apps | US | Valuations, payment calculators | Marketplace-funded; US only; calculators are price → payment, not payment → price |
| NerdWallet / bank auto loan calculators | Any | Payment ↔ loan amount | No trade/tax/fee decomposition, no verdict, no Canadian tax |
| Canadian Black Book consumer site | CA | Trade-in and future value estimates | Lead-gen for dealers; no deal decoding |
| CARFAX Canada | CA | History + value range | No payment decoding |
| Unhaggle / Carcostcanada | CA | Dealer invoice pricing | Lead-gen model; paid reports; no on-lot tool |
| Reddit r/askcarsales, r/PersonalFinanceCanada | — | Humans explain the trick | Not fast, not on the lot |

Honest read: the *idea* is not new. CarEdge has essentially built it for the US. The
defensible gap is (1) Canada, with province tax/trade-in rules and OMVIC-style
consumer protection baked in, and (2) the on-lot, two-minute, no-install experience
rather than a content-heavy app you were supposed to study beforehand.

## Risks

**It's a utility, and utilities don't retain.** Someone buys a car every 5–8 years.
The decoder alone has near-zero retention; the growth loop has to be sharing at the
moment of use. The trade-in timing / equity tracker (09) is the answer to this, and
also the risk: it's a second product, and if it ships half-built it drags the
decoder's credibility down with it.

**Referral conflict.** Revenue from referrals (08) is the same mechanism that makes
CarEdge and every marketplace suspect. Mitigation is a hard rule, not a vibe: refer
only for independent benchmarks, disclose inline, never nudge the timing
recommendation toward "trade now". Write the rule into the repo README so it survives
future-Matt's revenue pressure.

**The math is table stakes.** Any competitor can copy a loan formula in an afternoon.
What isn't copied in an afternoon: the fixture set from real Canadian deal sheets,
the province rules, the verdict UX that a stressed person can read in ten seconds.

**FMV ambition kills the project.** Covered in 04. Do not let "but it should show
the car's value" delay shipping the decoder.

**Liability.** If the app says "red, bad deal" and the user walks from a fine deal,
no harm. If it says "green" and the contract has a hidden clause, the user will blame
the app. Phrase verdicts as "numbers match / numbers don't match" rather than
"good deal / bad deal". Disclaimer, obviously, but the phrasing matters more than the
disclaimer.

**Dealers adapt.** If this got popular, finance managers would quote all-in from the
start and move margin to add-ons and rate. That's a win for buyers and the app's
job is done. Not a real risk; noted for completeness.

**Scope creep toward a marketplace.** Every "where can I get a better rate" or "find
me this car cheaper" feature pulls toward lead-gen revenue and conflicted incentives.
Decide now (07) whether that door is closed.

## What would make this worth doing even if nobody else uses it

Matt's household buys a vehicle roughly 2028–29 (minivan). Building the decoder and a
real fixture set is useful for that purchase alone, and the Garage25 pattern (build a
small thing for yourself, polish it if it earns it) is already proven.
