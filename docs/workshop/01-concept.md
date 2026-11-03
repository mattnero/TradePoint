# 01 — Concept

## The problem, stated honestly

Dealer finance offices win because they control three things the buyer doesn't:
the framing (payment, not price), the clock (you're in the chair, kids are tired,
"this price is good today only"), and the information (what the car is worth, what
your trade is worth, what rate you actually qualify for).

Payment framing is the tactic the original idea targets. It is real, but it is one of
several that stack:

| Tactic | What it hides |
|--------|---------------|
| Quote monthly (or bi-weekly) payment, never price | Total cost, fees, add-ons |
| Stretch the term (84, 96 months) | A higher price looks like the same payment |
| Bi-weekly quotes | $199 bi-weekly is $431/month, not $398 |
| Rate markup over your approved rate | Dealer reserve; 2 points over 84 months is ~$2,400 on a $29k loan |
| Lowball the trade, "make it up" on price | Net you're paying |
| Roll negative equity into the new loan | You're financing a car you no longer own |
| Add-ons bundled into the payment | Etching, nitrogen, protection packages, extended warranty at $10–40/month each |
| "Four-square" worksheet | Mixes price, trade, down, payment so no single number is pinned |

An app that only reverses the payment into a price solves one row. The useful version
solves the table: decompose the deal into its parts, show which parts are off, and do
it fast enough that the buyer can say "the number I'm seeing doesn't match, explain
the gap" while still in the chair.

## Who it's for

Primary: a private buyer financing a new or used car at a franchise or independent
dealer in Canada (Ontario first, because that's where the regulatory knowledge is
easiest to get right; see 06). Not fleet, not leasing on day one.

Secondary: the buyer's partner or friend who is not on the lot but gets a text saying
"they want $450/mo for 84 months, is that ok?". Shareable deal links matter for this.

## Two moments of use

**Before the lot (prep).** This is where most of the value actually is, and it's the
part the original idea skips. Pre-commitment beats in-the-moment math:
- Get a pre-approval rate from your bank or credit union. That becomes the benchmark.
- Price the trade at two independent sources. Write it down.
- Set a walk-away all-in number.
- Know your province's rules (Ontario: advertised price must be all-in except HST and
  licensing; "admin fee" added at the desk is an OMVIC violation).

**On the lot (verify).** Two minutes, one hand, poor signal:
- Enter what they said: payment, frequency, term, rate, down, trade allowance, trade
  payoff.
- See: amount financed, implied all-in price, total paid, total interest.
- Compare to advertised price plus tax. Gap = fees and add-ons. Ask for the itemized
  bill of sale.
- Compare quoted rate to pre-approval. Gap in dollars.
- Compare trade allowance to your two prices. Gap in dollars.
- One screen, one verdict: green / yellow / red with the three biggest gaps named.

## What "good" looks like for the user

They leave the dealership having either (a) signed knowing exactly what they paid and
why, or (b) walked out with a saved deal snapshot they can review at home and a script
for what to ask next time. The app does not need to win the negotiation. It needs to
remove the information gap and give the buyer permission to pause.

## What this is not

- Not a car-shopping marketplace. No listings, no leads to dealers.
- Not a financing broker (that would make it the thing it's warning against).
- Not a lease calculator in v1. Lease math (money factor, residual, cap cost) is a
  different product. Park it.
