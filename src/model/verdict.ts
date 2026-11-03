import { rateGap } from "../math/loan";
import { dealFigures, toDollarInputs, type DealFigures, type DealQuote } from "./deal";
import { cents, fromDollars, type Cents } from "./money";

export type VerdictLevel = "match" | "ask" | "large";
export type GapKind = "price" | "rate" | "trade";

export interface Benchmarks {
  preApprovalApr?: number;
  outsideTradeOffer?: Cents;
}

export interface Gap {
  kind: GapKind;
  amount: Cents;
  level: VerdictLevel;
}

export interface Verdict {
  level: VerdictLevel;
  gaps: Gap[];
  askLine: Cents;
  largeLine: Cents;
  overAskLine: number;
  figures: DealFigures;
}

export const ASK_BASIS_POINTS = 300;
export const LARGE_BASIS_POINTS = 800;

const SEVERITY: Record<VerdictLevel, number> = { match: 0, ask: 1, large: 2 };

const HEADLINES: Record<VerdictLevel, string> = {
  match: "Numbers match",
  ask: "Numbers don't match",
  large: "Large gaps",
};

export function headline(level: VerdictLevel): string {
  return HEADLINES[level];
}

function exceeds(costToBuyer: Cents, allIn: Cents, basisPoints: number): boolean {
  return costToBuyer * 10_000 > allIn * basisPoints;
}

function levelFor(costToBuyer: Cents, allIn: Cents): VerdictLevel {
  if (exceeds(costToBuyer, allIn, LARGE_BASIS_POINTS)) return "large";
  if (exceeds(costToBuyer, allIn, ASK_BASIS_POINTS)) return "ask";
  return "match";
}

function lineAt(allIn: Cents, basisPoints: number): Cents {
  return cents(Math.round((allIn * basisPoints) / 10_000));
}

export function verdict(quote: DealQuote, benchmarks: Benchmarks = {}): Verdict {
  const figures = dealFigures(quote);
  const allIn = figures.impliedAllIn;
  const gaps: Gap[] = [];

  if (figures.unexplainedGap !== undefined) {
    const amount = figures.unexplainedGap;
    gaps.push({ kind: "price", amount, level: levelFor(amount, allIn) });
  }
  if (benchmarks.preApprovalApr !== undefined) {
    const amount = fromDollars(rateGap(toDollarInputs(quote), benchmarks.preApprovalApr));
    gaps.push({ kind: "rate", amount, level: levelFor(amount, allIn) });
  }
  if (benchmarks.outsideTradeOffer !== undefined) {
    const amount = cents(quote.tradeAllowance - benchmarks.outsideTradeOffer);
    gaps.push({ kind: "trade", amount, level: levelFor(cents(-amount), allIn) });
  }

  const level = gaps.reduce<VerdictLevel>(
    (worst, g) => (SEVERITY[g.level] > SEVERITY[worst] ? g.level : worst),
    "match",
  );

  return {
    level,
    gaps,
    askLine: lineAt(allIn, ASK_BASIS_POINTS),
    largeLine: lineAt(allIn, LARGE_BASIS_POINTS),
    overAskLine: gaps.filter((g) => g.level !== "match").length,
    figures,
  };
}
