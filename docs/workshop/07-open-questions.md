# 07 — Open Questions

All ten first-round questions answered 2026-11-02. Open items are what fell out of
the answers.

## Open

1. **Santa Fe fixture numbers.** Current km, km/month, loan balance, rate, remaining
   term, purchase date and price. Matt will supply later. Until then the paydown
   plan's figures are the placeholder.

2. **Van shortlist.** Which vans Matt is actually considering (Sienna, Odyssey,
   Pacifica, Carnival, Grand Caravan used?). Decides the first depreciation-curve
   segment to get right and the first decoder scenarios to pre-build.

3. **Fixture diversity with one real user.** Matt is the only test user. The decoder
   fixture set needs more than one deal sheet to be trustworthy. Proposed: anonymised
   deal breakdowns posted publicly on r/PersonalFinanceCanada and r/askcarsales as
   fixtures 2–10. Confirm this is acceptable.

4. **Repo visibility.** Created 2026-11-02 as **private**: github.com/mattnero/TradePoint,
   local at `~/Documents/Matts stuff/TradePoint`. Flip to public when the math module
   is something Matt is happy to have read.

5. **Drive move.** When do these docs go to Google Drive, and does the Drive copy
   become the source of truth or a snapshot?

## Decided (2026-11-02)

Remaining mockup questions were given defaults in the repo's PLAN.md (comps a tap
away; no "keep it" chart line; advertised price visible, optional; share as link
first). Reverse there, not here.

From mockup review: app is light-only (white background); 36-month chart is Pro and
the cliff list is free; verdict thresholds are 3% (amber) / 8% (red) of implied
all-in. Remaining mockup questions: comps inline or a tap away on Garage; "keep it"
cost as a third chart line; advertised price collapsed by default; share as image or
link.


| # | Question | Decision |
|---|----------|----------|
| 1 | Scope | **Canada first** (Ontario rules first) |
| 2 | Name | **TradePoint** (check store + domain availability before launch) |
| 3 | Referral policy | **Yes**: independent-benchmark referrals only (outside trade offer, pre-approval), inline disclosure, never dealer leads or add-ons |
| 4 | FMV in v1 | **User-entered comps** + deep links; no data source |
| 5 | Lease | **Later** |
| 6 | First users | **Matt.** Nobody else buying right now. Matt is both use cases at once: companion for the Santa Fe trade-in, decoder for the van purchase coming soon |
| 7 | Open source | **Yes** for the math module |
| 8 | Where it lives | **github.com/mattnero**, same account as the Alfred project |
| 9 | Santa Fe numbers | Deferred; see open q1 |
| 10 | Time budget | **3 hours/week** |
| — | Product lead | **Companion leads**, decoder is a mode |
| — | Pro | **~$4.99 one-time**, no subscription |
| — | B2B | **No** |

## What 3 hours/week means

Phase 0 as written in 02 (math + fixtures, companion with one vehicle and cliff
timeline, decoder mode, web build) is roughly 40–60 hours of evening work for one
person who knows the stack. At 3 hours/week that is **3–5 months**, landing around
**Feb–Apr 2027**.

Matt's van purchase is "soon". If soon is before Feb 2027, the thing Matt needs
first is the decoder, not the companion. Recommendation: **product leads with the
companion, build order leads with the decoder.**

| Weeks | Build | Why first |
|-------|-------|-----------|
| 1–3 | Loan + tax math module with tests; CLI or bare web page that decodes a deal | Matt can use it on the van deal even if nothing else exists |
| 4–6 | Decoder UI, share link, Ontario HST with trade-in credit | Still useful for the van; also the free-tier core |
| 7–10 | Vehicle model, warranty table, odometer + warranty cliff timeline (Santa Fe is the fixture) | Companion free tier |
| 11–14 | Depreciation curve, equity projection, "your window" | First Pro feature |
| 15+ | Capacitor store builds, IAP | Phase 1 |

If the van happens in weeks 1–6, Matt still gets what he needed. If it slips to
2027, the companion is far enough along to pre-fill the trade side of the decoder.
