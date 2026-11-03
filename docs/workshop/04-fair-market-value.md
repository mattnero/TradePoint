# 04 — Fair Market Value

This is the feature that sounds essential and is the hardest to deliver. Be clear-eyed
about it before committing.

## What the user actually needs

Two numbers, each as a range:
1. What this vehicle (year/make/model/trim/km/condition) sells for at retail in my
   region right now.
2. What my trade is worth wholesale (what the dealer will realistically give) and
   retail (what I'd get selling private).

The dealer has Canadian Black Book and auction data. The buyer has AutoTrader.ca
search results. The gap is the information asymmetry.

## Source options (Canada)

| Source | Access | Cost | Notes |
|--------|--------|------|-------|
| Canadian Black Book | Partner/licensed API | $$$, contract | The dealer's number. Enterprise only; not realistic for a side project |
| CARFAX Canada Value Range | Consumer web only | Free to users, no API | Could deep-link the user to it |
| AutoTrader.ca / Kijiji Autos / CarGurus listings | Public pages; scraping violates ToS | Free until blocked | Comps, not valuations. Legal/ToS risk if automated |
| MarketCheck API | Commercial API, US-heavy with some CA coverage | Metered, starts ~$ hundreds/mo at volume; free tier exists | Listings-derived; most realistic third-party option |
| VinAudit / vehicle-history APIs | Commercial | Per-lookup | History, not value |
| User-entered comps | None | Free | User pastes 3–5 listing prices; app shows median and range |
| Deep-link to prefilled searches | None | Free | App builds the AutoTrader.ca / CarGurus URL with year/make/model/km/radius; user reads the range |

## Recommendation

Phase 0–1: **user-entered comps + deep links**. The app builds the search URL, the
user glances at the results and types a range or picks a median. It's honest, it's
free, it has no licensing exposure, and it reinforces the prep habit (you do this at
home the night before, not at the desk).

Phase 2: if users ask for it, trial MarketCheck's free tier for Canadian coverage
quality before paying for anything. If coverage is poor, stay with comps.

Do not scrape. The project dies the first time a cease-and-desist arrives or the
scraper breaks the week before a user needs it.

## Trade-in specifically

Dealer trade allowance is often inflated to make the deal look better while the price
absorbs it. The app's trade gap should compare the allowance to the user's
*independent* numbers, and the price gap should be computed separately. Showing both
is what defeats the four-square.

Prompt the user in prep to get a real offer from at least one outside buyer (Clutch,
Canada Drives, a second dealer). An actual offer beats any valuation API.
