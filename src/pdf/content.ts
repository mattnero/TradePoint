import { monthName } from "../model/cliffCopy";
import type { IsoDate } from "../model/dates";
import { dealFigures, type DealQuote } from "../model/deal";
import { formatCAD } from "../model/money";
import { headline, verdict, type Benchmarks, type VerdictLevel } from "../model/verdict";
import { askFor, formatExact, formatPercent, gapRows, subtitle, type GapRow } from "../model/verdictCopy";

export interface DealPdfInput {
  label?: string;
  quote: DealQuote;
  benchmarks: Benchmarks;
  date: IsoDate;
}

export interface DealPdfContent {
  brand: string;
  dateLine: string;
  label: string;
  headline: string;
  level: VerdictLevel;
  subtitle: string;
  quoteLines: string[];
  gaps: GapRow[];
  breakdown: { label: string; value: string }[];
  askFor: string[];
  notAdvice: string;
}

const FREQUENCY_WORD = { monthly: "monthly", biweekly: "bi-weekly", weekly: "weekly" } as const;

function longDate(date: IsoDate): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${monthName(month ?? 1)} ${day}, ${year}`;
}

function quoteLines(quote: DealQuote, benchmarks: Benchmarks): string[] {
  const lines = [
    `${formatExact(quote.payment)} ${FREQUENCY_WORD[quote.frequency]} for ${quote.termMonths} months at ${formatPercent(quote.apr)} APR`,
  ];
  const trade =
    quote.tradeAllowance > 0 || quote.tradePayoff > 0
      ? ` Trade-in: ${formatCAD(quote.tradeAllowance)} allowance, ${formatCAD(quote.tradePayoff)} owing.`
      : "";
  lines.push(`Down payment ${formatCAD(quote.downPayment)}.${trade}`);
  if (quote.advertisedPrice !== undefined) lines.push(`Advertised price ${formatCAD(quote.advertisedPrice)}.`);
  const used: string[] = [];
  if (benchmarks.preApprovalApr !== undefined) used.push(`${formatPercent(benchmarks.preApprovalApr)} pre-approval`);
  if (benchmarks.outsideTradeOffer !== undefined) used.push(`${formatCAD(benchmarks.outsideTradeOffer)} outside trade offer`);
  if (used.length > 0) lines.push(`Benchmarks used: ${used.join(", ")}.`);
  return lines;
}

export function dealPdfContent({ label, quote, benchmarks, date }: DealPdfInput): DealPdfContent {
  const result = verdict(quote, benchmarks);
  const figures = dealFigures(quote);
  return {
    brand: "TradePoint deal check",
    dateLine: `Prepared ${longDate(date)}`,
    label: label?.trim() || "Dealer quote",
    headline: headline(result.level),
    level: result.level,
    subtitle: subtitle(result),
    quoteLines: quoteLines(quote, benchmarks),
    gaps: gapRows(quote, benchmarks, result),
    breakdown: [
      { label: "Amount financed", value: formatCAD(figures.amountFinanced) },
      { label: "Down + net trade equity", value: formatCAD(figures.cashIn) },
      { label: "Implied all-in price", value: formatCAD(figures.impliedAllIn) },
      { label: "Total interest", value: formatCAD(figures.totalInterest) },
      { label: "Total you pay over the term", value: formatCAD(figures.totalPaid) },
    ],
    askFor: askFor(quote, result),
    notAdvice:
      "TradePoint does arithmetic on the numbers entered. It isn't financial, legal or tax advice. Figures use Ontario rules: HST on the price after the trade-in, plus an estimate for licensing.",
  };
}

export function pdfSafe(text: string): string {
  return text
    .replace(/[  ]/g, " ")
    .replace(/−/g, "-")
    .replace(/[^ -~¡-ÿ]/g, "?");
}

export function pdfFileName(label: string | undefined, date: IsoDate): string {
  const slug = (label ?? "")
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `TradePoint-${slug || "deal-check"}-${date}.pdf`;
}
