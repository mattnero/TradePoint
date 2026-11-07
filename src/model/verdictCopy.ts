import type { PaymentFrequency } from "../math/loan";
import type { DealQuote } from "./deal";
import { cents, formatCAD, type Cents } from "./money";
import { ASK_BASIS_POINTS, type Benchmarks, type GapKind, type Verdict, type VerdictLevel } from "./verdict";

export interface GapRow {
  kind: GapKind;
  title: string;
  detail: string;
  amount: string;
  level: VerdictLevel;
}

const FREQUENCY_WORD: Record<PaymentFrequency, string> = {
  monthly: "monthly",
  biweekly: "bi-weekly",
  weekly: "weekly",
};

const ASK_PERCENT = ASK_BASIS_POINTS / 100;

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatExact(amount: Cents): string {
  return formatCAD(amount, { showCents: amount % 100 !== 0 });
}

export function subtitle(v: Verdict): string {
  if (v.overAskLine === 0) {
    return `Every gap is under ${ASK_PERCENT}% of the deal. Still ask for the bill of sale.`;
  }
  const noun = v.overAskLine === 1 ? "gap" : "gaps";
  return `${v.overAskLine} ${noun} over ${ASK_PERCENT}% of the deal (${formatCAD(v.askLine)}). Ask before you sign.`;
}

export function gapRows(quote: DealQuote, benchmarks: Benchmarks, v: Verdict): GapRow[] {
  return v.gaps.map((g) => {
    const amount = formatCAD(g.amount, { signed: true });
    switch (g.kind) {
      case "price":
        return {
          kind: g.kind,
          title: "Price gap",
          detail: "Implied all-in vs advertised + HST + licensing",
          amount,
          level: g.level,
        };
      case "rate":
        return {
          kind: g.kind,
          title: "Rate gap",
          detail: `${formatPercent(quote.apr)} quoted vs your ${formatPercent(benchmarks.preApprovalApr ?? 0)} pre-approval, over ${quote.termMonths} months`,
          amount,
          level: g.level,
        };
      case "trade":
        return {
          kind: g.kind,
          title: "Trade gap",
          detail: `${formatCAD(quote.tradeAllowance)} allowance vs your ${formatCAD(benchmarks.outsideTradeOffer ?? cents(0))} outside offer`,
          amount,
          level: g.level,
        };
    }
  });
}

export function askFor(quote: DealQuote, v: Verdict): string[] {
  const flagged = (kind: GapKind) => v.gaps.some((g) => g.kind === kind && g.level !== "match");
  const chips = ["Itemized bill of sale"];
  if (flagged("rate")) chips.push("The buy rate");
  if (flagged("trade")) chips.push("Trade appraisal sheet");
  if (quote.termMonths > 60) chips.push("Same price at 60 months");
  return chips;
}

export function tenMinutesText(quote: DealQuote, v: Verdict): string {
  const lines = [
    "I'm at the dealership and need 10 minutes before I sign anything.",
    `Their quote: ${formatExact(quote.payment)} ${FREQUENCY_WORD[quote.frequency]} for ${quote.termMonths} months at ${formatPercent(quote.apr)} APR, ${formatCAD(quote.downPayment)} down.`,
    `Reversed, that is ${formatCAD(v.figures.amountFinanced)} financed and ${formatCAD(v.figures.impliedAllIn)} all-in.`,
  ];
  const flagged = v.gaps.filter((g) => g.level !== "match");
  if (flagged.length > 0) {
    const parts = flagged.map((g) => `${g.kind} ${formatCAD(g.amount, { signed: true })}`);
    lines.push(`Gaps to ask about: ${parts.join(", ")}.`);
  }
  lines.push("Can you look it over with me?");
  return lines.join("\n");
}

export function walkAwayLine(allIn: Cents, walkAway: Cents): string {
  const difference = cents(allIn - walkAway);
  const limit = formatCAD(walkAway);
  if (formatCAD(difference) === formatCAD(cents(0))) return `Right at your walk-away of ${limit}.`;
  const side = difference > 0 ? "over" : "under";
  return `${formatCAD(cents(Math.abs(difference)))} ${side} your walk-away of ${limit}.`;
}
