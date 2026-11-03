# 03 — Calculator Math

## Core formula

Standard amortized loan. Monthly rate r = APR / 12, n = number of monthly payments,
P = monthly payment.

Amount financed (present value of the payments):

    A = P × (1 − (1 + r)^−n) / r

Payment from a known amount:

    P = A × r / (1 − (1 + r)^−n)

Edge case: APR = 0 → A = P × n.

Payment frequency normalisation (dealers quote bi-weekly because it looks smaller):

    monthly equivalent = biweekly × 26 / 12
    monthly equivalent = weekly × 52 / 12

Compute the loan at the quoted frequency's periodic rate for exactness (bi-weekly:
r = APR/26, n = term_months × 26/12), but display the monthly equivalent. The
difference between the exact and approximate methods is a few dollars; the difference
between $398 and $431 a month is the point.

## From amount financed to "what you're really paying"

    net trade equity    = trade allowance − trade payoff     (can be negative)
    implied all-in cost = A + down payment + net trade equity
    total paid over term = P × n + down payment + net trade equity
    total interest       = P × n − A

"Implied all-in cost" is what the dealer is charging for the car, taxes, fees and
add-ons combined. Compare it to what the advertised price *should* produce:

    expected all-in = advertised price
                    + tax on (advertised price − trade allowance)   [Ontario: HST 13%,
                      trade-in reduces the taxable base]
                    + licensing (~$150)

    unexplained gap = implied all-in cost − expected all-in

If the gap is positive and nobody mentioned fees or add-ons, that's the question to
ask. Note: in Ontario the advertised price must already include admin/doc fees
(OMVIC all-in pricing), so a large gap is not just "fees", it may be a violation.

Implied pre-tax price (when the user has no advertised price):

    implied pre-tax ≈ (implied all-in − licensing + tax_rate × trade allowance) / (1 + tax_rate)

Approximate because fees and add-ons are taxed too, but good enough to compare to
FMV.

## Worked example

Dealer says: "$450 a month, 84 months, 7.99%, $3,000 down, we'll give you $8,000 for
your trade." You owe $5,000 on the trade. Advertised price was $29,995.

| Line | Value |
|------|-------|
| Monthly rate r | 0.0799 / 12 = 0.006658 |
| Amount financed A | $28,881 |
| Net trade equity | $8,000 − $5,000 = $3,000 |
| Implied all-in cost | 28,881 + 3,000 + 3,000 = **$34,881** |
| Total paid over 7 years | 450 × 84 + 3,000 + 3,000 = **$43,800** |
| Total interest | 37,800 − 28,881 = **$8,919** |
| Expected all-in from advertised price | 29,995 + 13% × (29,995 − 8,000) + 150 = **$33,004** |
| Unexplained gap | **$1,877** |

Three follow-up views the app should show without being asked:

**Rate gap.** Same $28,881 at a 5.99% pre-approval is $421.77/month. The 2-point
markup costs **$2,371** over the term.

**Term stretch.** Same $28,881 at 60 months is $585.46/month and $6,247 interest.
The 84-month term saves $135/month and costs $2,672 more in interest, plus two more
years of being underwater.

**Bi-weekly reframe.** If the same deal had been quoted as "$208 bi-weekly", the
monthly equivalent is $450.67, not $416. Show both.

## Verdict thresholds (decided 2026-11-02)

Gaps are judged relative to the implied all-in cost, so they scale with the car:

    amber (ask about it)  gap > 3% of implied all-in
    red (large gap)       gap > 8% of implied all-in
    match                 every gap under 3%

Applied to each of the three gaps (price, rate, trade). On the worked example the
amber line is $1,046 and red is $2,790; all three gaps land amber. On a $12,000
used car amber is $360. A fixed dollar threshold ($500 was the first draft) was
rejected: too twitchy on expensive cars, too loose on cheap ones.

## Things the math can't see

- Add-ons the buyer agreed to and wants (an extended warranty is not automatically a
  rip-off). The app flags the gap; the user decides.
- Manufacturer incentives tied to financing (0.99% only if you forgo a $2,000 cash
  rebate). Needs a "cash price vs finance price" toggle later.
- Negative equity disguised as a higher trade allowance with a correspondingly higher
  price. Trade gap and price gap together catch it; either alone doesn't.

## Validation

Build a test fixture of 10–15 real deal sheets (ask friends, anonymised) and check
the decoder reproduces the amount financed on the contract to within $5. If it can't,
the tool loses the argument at the desk.
