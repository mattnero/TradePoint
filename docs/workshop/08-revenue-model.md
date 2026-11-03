# 08 — Revenue Model

Matt's intent (2026-11-02, revised same day): a paid hobby. Revenue is welcome, not
required, and he will not pitch institutions. This doc sizes that honestly; the B2B
section is kept below for the record but is out of scope.

## The structural problem

A deal decoder is used at one moment every 5–8 years. Nobody subscribes to that, and
paid-download conversion for "calculator" apps is poor. Any revenue plan has to solve
one of two things: (a) earn at the single moment of use, or (b) create a reason to
keep the app during ownership so there is something to sell over time. The trade-in
timing feature (09) is what makes (b) possible. Without it, (a) is the only option
and it's small.

## Market sizing (Canada, back of envelope)

| Figure | Estimate |
|--------|----------|
| New vehicle sales / year | ~1.8M |
| Used dealer sales / year | ~2.5–3M |
| Transactions where a buyer could use this | ~4.5M |
| Reach at 0.1% of buyers | ~4,500 users / year |
| Reach at 1% (very good for an indie app) | ~45,000 users / year |

At 1% reach and a 10% conversion to a $9.99 one-time unlock, net of 15% store fee:
roughly **$38k/year**. At 0.1%: **$3.8k/year**. That's the ceiling for consumer
paid-unlock alone in Canada. US expands it ~10× and puts you against CarEdge.

Conclusion: consumer paid unlock is a floor, not a business. The upside is in the
other lines below.

## Revenue lines, ranked by realism

### 1. Freemium with one-time Pro unlock (consumer) — the plan
Free: companion with one vehicle and the cliff timeline, decoder, verdict, share
link. Pro (**$4.99 one-time**, Matt's call): equity projection and window
recommendation, multi-vehicle, saved deals, PDF export, lease later.

Hobby arithmetic at $4.99: store keeps 15%, you net ~$4.25. Apple's fee is US$99/yr,
so roughly **35 Pro sales a year to break even on the store alone**. At 2,000
installs/year and 5% conversion that's 100 sales, ~$425. At 10,000 installs it's
~$2,100. Fine for a hobby; set expectations there. $4.99 vs $9.99 roughly doubles
conversion in most indie data, so the lower price is probably neutral-to-positive on
revenue and better for reviews.
Why one-time and not subscription: the honest value is episodic. A subscription for a
once-a-decade event will churn to zero and earn bad reviews. Exception: see line 4.

### 2. Aligned referrals (consumer)
Pay-per-lead exists for exactly the two things the prep checklist tells the user to
do anyway:
- **Outside trade-in offer**: Clutch, Canada Drives, AutoTrader instant offer, Kijiji
  Autos. Referral fees for a submitted vehicle are real and the user *wants* this
  number as a benchmark.
- **Pre-approval**: credit unions and online lenders pay for funded loans.
Rule: only refer things that produce an *independent benchmark the user needs*. Never
dealer leads, never extended warranty, never "find this car cheaper". Disclose every
referral inline. This keeps the trust position intact; it's the same line CarEdge
walks, and they walk it fine.

### 3. B2B white-label / sponsorship — OUT OF SCOPE (Matt, 2026-11-02)
Kept for the record. Do not build theming or institution hooks for it.
Credit unions and banks want auto-loan volume and lose it to dealer financing at the
desk. A branded "bring us to the dealership" tool that benchmarks the dealer's rate
against *their* pre-approval is a direct hit on that problem. Also plausible: CAA
member benefit, insurers (Desjardins, TD Insurance), employee-benefit platforms.
Pricing model: annual licence per institution ($10–50k) or per-funded-loan. One
credit union deal outweighs the whole consumer line.
Not pursuing. Noted only so a future "should I?" has the reasoning already written.

### 4. Subscription — not doing
One-time Pro only. A hobby doesn't need recurring-billing support burden, and the
companion's honest cadence (a few opens a year) doesn't justify it.

### Not doing
- Ads. Wrong for a two-minute, high-stress use; also kills the B2B story.
- Selling data. Deal sheets are the users' financial data. No.
- Dealer-facing anything.

## Store economics

| Item | Cost |
|------|------|
| Apple Developer Program | US$99/year |
| Google Play | US$25 one-time |
| Store commission | 15% (Apple Small Business Program and Google first $1M) |
| Business registration | Not required to receive store payouts as an individual in Canada; report as income. Register a sole prop only if it ever matters |
| Privacy policy, terms, financial-tool disclaimer | time, not money |

Web purchases are a complication: Apple does not allow selling an in-app digital
unlock via an external payment inside the iOS app. Simplest: Pro is sold only through
store IAP, the web version stays free-decoder-only. That also gives the web user a
reason to install.

## What this changes about the plan

- Stores in Phase 1 (05). Web build stays as the free share-link landing and the
  decoder funnel.
- Companion leads; decoder is a mode inside it (02, 09).
- Size the effort as a hobby: the Phase 0 goal is Matt's own Santa Fe in the app
  with a correct timeline, not a launch.
