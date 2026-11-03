# 02 — Features and MVP

## Feature inventory

### A. Deal decoder (core)
- Inputs: payment, frequency (monthly / bi-weekly / weekly), term, APR, down payment,
  trade allowance, trade payoff (lien), province.
- Outputs: amount financed, implied all-in price, implied pre-tax price, total paid,
  total interest, effective monthly payment.
- Reverse mode: given advertised price + province tax + your inputs, show what the
  payment *should* be. Difference from quoted payment = hidden dollars per month and
  in total.
- Term slider: same price at 48 / 60 / 72 / 84 / 96 showing payment and total
  interest side by side. Makes the stretch visible.
- Rate comparison: quoted APR vs user's pre-approval APR, in dollars over the term.

### B. Deal verdict
- Three gap lines, each in dollars: price gap (vs advertised or FMV), rate gap (vs
  pre-approval), trade gap (vs user's independent values).
- Colour verdict with a one-line reason. No scores out of 100; false precision
  invites argument.
- "Ask for this" prompts: itemized bill of sale, buy rate, trade appraisal sheet.

### C. Prep checklist
- Pre-approval rate (with links to where to get one, no affiliate in v1).
- Trade value from two sources (manual entry; see 04 for data options).
- Walk-away number.
- Province rules card (Ontario first).

### D. Pause tools
- "I need 10 minutes" script, copy-to-clipboard text to send to a partner.
- Share deal snapshot as a link or image.
- Save deals; compare two dealers side by side.

### E. Fair market value (hard; see 04)
- Target vehicle FMV range.
- Trade-in FMV range.

### F. Trade-in timing / equity tracker (see 09)
- Vehicle + loan + km rate → 36-month timeline of cliffs (warranty, odometer
  thresholds, equity crossover, big maintenance, seasonal window).
- Projected value vs loan balance; plain-language "window" recommendation.
- Quarterly value-refresh nudge. This is the retention feature and a Pro feature.

### G. Later / maybe
- Lease decoder.
- Add-on catalogue with typical price ranges (extended warranty, protection, etching).
- Photo capture of the four-square worksheet → OCR → prefilled inputs. Gimmicky; only
  if OCR is reliable enough to not be slower than typing six numbers.
- Multi-province tax rules.

## MVP cut (revised 2026-11-02: companion-led, paid hobby)

The companion (F) is the front door. The decoder (A+B) is a mode inside it, and the
companion pre-fills the decoder's trade allowance, payoff and current value when the
user goes shopping. That integration is the one thing none of the garage apps do.

Free: one vehicle in the companion with the cliff *list* (warranty, km thresholds,
maintenance window, season), the full decoder and verdict, share link, prep checklist.
Pro (~$4.99 one-time): the 36-month chart, equity projection and "your window"
recommendation, more than one vehicle, saved deals and side-by-side, PDF export,
lease decoder when it exists.

Why the equity projection is the paid line: it's the feature with the clearest
"I'd pay five bucks for that" moment, and it's the one that needs the most ongoing
care (curves, re-anchoring), so it's fair to charge for it. The cliff timeline stays
free because it's the thing that gets the app recommended.

Skip E entirely in v1; let the user type in FMV
numbers they got from AutoTrader.ca / CarGurus / Canadian Black Book themselves. The
verdict still works because the gaps are computed against *user-supplied* benchmarks.

Reasoning: E is the expensive, licensed, slow-to-build part and the one competitors
have a moat on. A through D are a week of evenings and are the parts nobody has done
well for the Canadian market. If nobody uses the decoder, FMV data won't save it.

## Phase plan

| Phase | Scope | Signal to continue |
|-------|-------|--------------------|
| 0 | Decoder math + fixtures first (Matt's van purchase), then companion with one vehicle + cliff timeline; web build. ~3–5 months at 3 h/wk | Matt uses the decoder on the van deal; Santa Fe timeline is right |
| 1 | Store apps (Capacitor) with Pro: equity projection + window recommendation, multi-vehicle, saved deals; share link | Pro covers the Apple fee; anyone opens the app in month 3 |
| 2 | Aligned referrals (outside trade offer, pre-approval); other provinces; comps/deep links for value refresh | Referral revenue covers hosting; still fun to work on |
| 3 | Lease decoder; maintenance interval data by model; whatever users actually ask for | Only if 2 happened |

No B2B phase. If a credit union ever comes knocking, that's a different conversation
and a different Matt.
