# TradePoint

Matt's paid-hobby mobile app. Car ownership companion for Canadian drivers: tracks the
cliffs that move a car's value (warranty expiry, odometer thresholds, equity crossover,
maintenance, season) and decodes a dealer's payment-framed offer into the real all-in
price at the desk. Companion leads the product; the decoder is a mode inside it.

## How Matt works with this repo

- Matt does not read docs. Everything under `docs/` and `PLAN.md` is written for the
  agent. Report to Matt in the terminal: outcome first, short, no doc links.
- Matt drives from the command line. Ask only blocking questions; otherwise pick the
  default in PLAN.md and say what you picked.
- About 3 hours a week. Work in PLAN.md sessions; finish the current one before
  starting the next; end every session green (`npm test`, `npm run typecheck`) and
  committed. Push is fine; this is Matt's personal repo.
- No code comments in source files. Names and tests carry the meaning.
- Matt is a .NET developer by day; explain TypeScript or Svelte idioms when they're
  non-obvious, once.

## Source of truth

1. `PLAN.md`: stack, working rules, session list with definitions of done, Phase 1/2
   sketch. Mark sessions done there as they finish.
2. `docs/spec.md`: product spec (tiers, screens, math, thresholds, data shapes).
   Authoritative when PLAN.md and the workshop docs disagree.
3. `docs/mockups/tradepoint-mockups.html`: six phone screens, live decoder. Open it in
   a browser for layout and copy; its CSS tokens are the palette.
4. `docs/workshop/`: the 2026-11-02 workshop record. Background only; decisions in it
   are superseded by spec.md where they differ.

## Locked decisions

- Canada first (Ontario rules first). Light-only UI, white background, no dark mode.
- Free: one vehicle, cliff list, full decoder + verdict, share link, prep checklist.
  Pro, $4.99 one-time via store IAP: 36-month chart, equity projection and window
  sentence, multi-vehicle, saved deals, PDF export. No subscription, no ads, no B2B.
- Verdict copy says "Numbers match / don't match / Large gaps", never good or bad deal.
  Thresholds: amber > 3% of implied all-in, red > 8%.
- Referrals only for independent benchmarks (outside trade offer, bank pre-approval),
  disclosed inline. Never dealer leads or add-ons. Timing advice is never tuned toward
  "trade now"; "keep it" is a normal answer and always shows its cost per year.
- FMV: user-entered comps and deep links. No scraping, no licensed data.
- No backend, no accounts in Phase 0. State in localStorage with a schemaVersion;
  share state in the URL fragment.
- Stack: TypeScript, Vite, Svelte 5, plain CSS tokens, Vitest, GitHub Pages; Phase 1
  Capacitor + RevenueCat.

## Safety

Never run destructive git operations (force-push, reset --hard, branch delete) without
Matt saying so in the session. Never commit secrets; RevenueCat and store keys go in
untracked `.env` files.

## Reference facts

- Repo: github.com/mattnero/TradePoint (private). GitHub auth on this Mac: no `gh`;
  an HTTPS token with repo scope is in the keychain via `git credential fill`.
- Matt's car: 2019 Hyundai Santa Fe. Its 5yr/100k warranty is already expired, so its
  timeline has odometer and equity cliffs only. Real km/loan figures not yet entered.
- Matt is shopping for a minivan soon; the decoder is for that purchase.
- Worked example (tests/fixtures/worked-example.json): $450/mo, 84 mo, 7.99%, $3,000
  down, $8,000 trade with $5,000 owing, advertised $29,995 → financed $28,881,
  all-in $34,881, expected $33,004, gap $1,877.
