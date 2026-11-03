# TradePoint

Know when to trade your car, and check the deal when you do.

An ownership companion for Canadian car owners: tracks the cliffs that move your
car's value (warranty expiry, odometer thresholds, equity crossover, big maintenance,
season), and decodes a dealer's payment-framed offer into the real all-in price while
you're still at the desk.

Status: Phase 0, math module only. Agent-facing docs: `CLAUDE.md`, `PLAN.md`,
`docs/spec.md`. Background: `docs/workshop/`.

## Rules this project keeps

- Verdicts say "numbers match / don't match", never "good deal / bad deal".
- Referrals only for things that give the user an independent benchmark (an outside
  trade-in offer, a bank pre-approval), disclosed inline. Never dealer leads, never
  add-ons.
- The timing recommendation is never tuned toward "trade now". "Keep your car" is a
  valid and frequent answer.
- No ads. No selling user data.

## Math

`src/math/` is plain TypeScript with no dependencies. The worked example in
`tests/fixtures/worked-example.json` is the first fixture; every real deal sheet
added later becomes another.

    npm install
    npm test
