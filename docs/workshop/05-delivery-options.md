# 05 — Delivery Options

## Constraints that drive the choice

- Used on a dealer lot, one-handed, possibly with bad signal and a dead-ish battery.
- First use is likely *at* the desk, from a friend's text: "use this". Install
  friction kills that.
- Shareable snapshot for the partner-at-home case.
- Side project; one developer; evenings. Minimise platforms and review queues.
- No backend needed for the MVP. Everything is client-side math.

## Options

| Option | For | Against |
|--------|-----|---------|
| **PWA (TS + Vite, plain or Svelte/Preact)** | Zero install, shareable URL, works offline once cached, no store review, one codebase, Matt already has Vite/TS from voyager-addin | iOS PWA limitations (no push, modest home-screen UX); less discoverable than a store listing |
| Native Android (Kotlin/Compose) | Matt has Android experience (Garage25 widget); widget possible | Android-only; store review; no instant share-to-use |
| Flutter / React Native | Both stores from one codebase | Heavier toolchain for what is a calculator; store review on both |
| .NET MAUI / Blazor Hybrid | Matches day-job stack | MAUI tooling pain on Mac, large install, weak PWA story. Wrong tool |
| Blazor WASM | .NET in the browser | Multi-MB initial download is exactly wrong for "bad signal on a lot" |

## Recommendation (revised 2026-11-02: stores are required for revenue, see 08)

**Web core, wrapped for stores.** Build the app as a PWA and ship it to both stores
via Capacitor. One TypeScript codebase; the web build is the free decoder and the
share-link landing page; the store builds carry the Pro unlock through native IAP
(RevenueCat or the store SDKs directly). Store presence is for trust, discoverability
and payment, not instead of the web funnel.

Why not Flutter / React Native / Kotlin now: they'd give a marginally better native
feel at the cost of a second codebase for the web funnel, and the web funnel is the
growth loop. Revisit only if the equity tracker needs background work (km from
Android Auto, notifications) that Capacitor plugins can't cover.

The original PWA-first reasoning still holds for the free tier:

**PWA first.** Single page, client-side only, TypeScript + Vite, static hosting
(Cloudflare Pages / GitHub Pages / Netlify, all free). Service worker so it works
offline after first load. Deal snapshot encoded in the URL fragment so sharing needs
no server and no account.

Store builds ship in Phase 1 (see 02), not Phase 3.

.NET stays out of the client. If an FMV service or saved-deal sync ever needs a
backend, a small .NET minimal API is fine there.

## Visual direction (decided 2026-11-02)

Light-only. White background, no dark mode. Mockups in `mockups/tradepoint-mockups.html`.
Teal accent for the app's own voice; green / amber / red reserved for verdict state.
Condensed display face for numbers, humanist sans for text.

## Suggested structure

    /app
      index.html
      src/
        math/loan.ts          pure functions, unit tested first
        math/tax.ts           per-province rules, Ontario only in v0
        math/depreciation.ts  segment curves + re-anchoring (09)
        data/warranty.json    make → powertrain / comprehensive terms (09)
        ui/                   decoder, verdict, prep checklist
        share/url-state.ts    encode/decode deal in fragment
      tests/                  fixtures from real deal sheets (see 03)

Build the math module and its tests before any UI. The decoder's credibility is the
product.

## Monetisation

Superseded by 08. Short version: free decoder, one-time Pro unlock via store IAP,
referrals only for independent benchmarks (outside trade offer, pre-approval) with
inline disclosure, B2B white-label as the upside. No ads, no dealer leads.
