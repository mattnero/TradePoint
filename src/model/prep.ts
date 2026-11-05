import { isIsoDate, type IsoDate } from "./dates";
import { cents, type Cents } from "./money";
import type { Benchmarks } from "./verdict";

export interface TradeOffer {
  source: string;
  amount: Cents;
  date?: IsoDate;
}

export interface Prep {
  preApprovalApr?: number;
  tradeOffers?: TradeOffer[];
  walkAway?: Cents;
  rulesReadOn?: IsoDate;
}

export interface PrepStatus {
  preApproval: boolean;
  tradeFigures: number;
  walkAway: boolean;
  rules: boolean;
  done: number;
  total: number;
}

export const MAX_TRADE_OFFERS = 2;

export function bestTradeOffer(offers: TradeOffer[] | undefined): Cents | undefined {
  if (offers === undefined || offers.length === 0) return undefined;
  return cents(Math.max(...offers.map((o) => o.amount)));
}

export function decoderBenchmarks(prep: Prep | undefined): Benchmarks {
  const benchmarks: Benchmarks = {};
  if (prep?.preApprovalApr !== undefined) benchmarks.preApprovalApr = prep.preApprovalApr;
  const best = bestTradeOffer(prep?.tradeOffers);
  if (best !== undefined) benchmarks.outsideTradeOffer = best;
  return benchmarks;
}

export function prepStatus(prep: Prep | undefined): PrepStatus {
  const preApproval = prep?.preApprovalApr !== undefined;
  const tradeFigures = prep?.tradeOffers?.length ?? 0;
  const walkAway = prep?.walkAway !== undefined;
  const rules = prep?.rulesReadOn !== undefined;
  const rows = [preApproval, tradeFigures >= MAX_TRADE_OFFERS, walkAway, rules];
  return { preApproval, tradeFigures, walkAway, rules, done: rows.filter(Boolean).length, total: rows.length };
}

export function addTradeOffer(prep: Prep, offer: TradeOffer): Prep {
  const offers = prep.tradeOffers ?? [];
  if (offers.length >= MAX_TRADE_OFFERS) throw new RangeError(`At most ${MAX_TRADE_OFFERS} trade figures`);
  return { ...prep, tradeOffers: [...offers, { ...offer }] };
}

export function removeTradeOffer(prep: Prep, index: number): Prep {
  const { tradeOffers, ...rest } = prep;
  const kept = (tradeOffers ?? []).filter((_, i) => i !== index);
  return kept.length === 0 ? rest : { ...rest, tradeOffers: kept };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseTradeOffer(value: unknown): TradeOffer | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.source !== "string" || o.source.trim() === "" || !isCount(o.amount)) return null;
  const offer: TradeOffer = { source: o.source, amount: cents(o.amount) };
  if (o.date !== undefined) {
    if (!isIsoDate(o.date)) return null;
    offer.date = o.date;
  }
  return offer;
}

export function parsePrep(value: unknown): Prep | null {
  if (typeof value !== "object" || value === null) return null;
  const p = value as Record<string, unknown>;
  const prep: Prep = {};
  if (p.preApprovalApr !== undefined) {
    if (typeof p.preApprovalApr !== "number" || p.preApprovalApr < 0 || p.preApprovalApr > 1) return null;
    prep.preApprovalApr = p.preApprovalApr;
  }
  if (p.tradeOffers !== undefined) {
    if (!Array.isArray(p.tradeOffers) || p.tradeOffers.length > MAX_TRADE_OFFERS) return null;
    const offers = p.tradeOffers.map(parseTradeOffer);
    if (offers.some((o) => o === null)) return null;
    prep.tradeOffers = offers as TradeOffer[];
  }
  if (p.walkAway !== undefined) {
    if (!isCount(p.walkAway)) return null;
    prep.walkAway = cents(p.walkAway);
  }
  if (p.rulesReadOn !== undefined) {
    if (!isIsoDate(p.rulesReadOn)) return null;
    prep.rulesReadOn = p.rulesReadOn;
  }
  return prep;
}

export function updatePrep(prep: Prep, patch: { [K in keyof Prep]?: Prep[K] | undefined }): Prep {
  const next: Record<string, unknown> = { ...prep, ...patch };
  for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
  return next as Prep;
}
