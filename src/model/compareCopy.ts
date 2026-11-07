import type { Comparison, DealSide } from "./compare";
import { cents, formatCAD, type Cents } from "./money";
import { headline } from "./verdict";
import { formatPercent } from "./verdictCopy";

export interface CompareCell {
  value: string;
  note?: string;
}

export interface CompareRow {
  label: string;
  a: CompareCell;
  b: CompareCell;
}

const FREQUENCY_WORD = { monthly: "monthly", biweekly: "bi-weekly", weekly: "weekly" } as const;

function paymentCell(side: DealSide): CompareCell {
  const { quote } = side.deal;
  const word = FREQUENCY_WORD[quote.frequency];
  const value = formatCAD(quote.payment, { showCents: true });
  if (quote.frequency === "monthly") return { value, note: word };
  return { value, note: `${word}, about ${formatCAD(side.monthlyPayment, { showCents: true })} a month` };
}

function gapCell(side: DealSide): CompareCell {
  const gap = side.figures.unexplainedGap;
  return gap === undefined ? { value: "No price entered" } : { value: formatCAD(gap, { signed: true }) };
}

function row(label: string, a: CompareCell, b: CompareCell): CompareRow {
  return { label, a, b };
}

function moneyRow(label: string, a: Cents, b: Cents): CompareRow {
  return row(label, { value: formatCAD(a) }, { value: formatCAD(b) });
}

export function compareRows({ a, b }: Comparison): CompareRow[] {
  return [
    row("Payment", paymentCell(a), paymentCell(b)),
    row("Term", { value: `${a.deal.quote.termMonths} months` }, { value: `${b.deal.quote.termMonths} months` }),
    row("Rate", { value: formatPercent(a.deal.quote.apr) }, { value: formatPercent(b.deal.quote.apr) }),
    moneyRow("Amount financed", a.figures.amountFinanced, b.figures.amountFinanced),
    moneyRow("All-in price", a.figures.impliedAllIn, b.figures.impliedAllIn),
    moneyRow("Total interest", a.figures.totalInterest, b.figures.totalInterest),
    moneyRow("Total paid", a.figures.totalPaid, b.figures.totalPaid),
    row("Gap vs advertised", gapCell(a), gapCell(b)),
    row("Verdict", { value: headline(a.level) }, { value: headline(b.level) }),
  ];
}

interface Difference {
  more: boolean;
  amount: string;
}

function difference(a: Cents, b: Cents): Difference | null {
  const amount = formatCAD(cents(Math.abs(b - a)));
  if (amount === formatCAD(cents(0))) return null;
  return { more: b > a, amount };
}

function joinClauses(clauses: string[]): string {
  if (clauses.length <= 1) return clauses.join("");
  return `${clauses.slice(0, -1).join(", ")} and ${clauses[clauses.length - 1]}`;
}

function totalsLine({ a, b }: Comparison): string {
  const parts: [string, Difference | null][] = [
    ["all-in", difference(a.figures.impliedAllIn, b.figures.impliedAllIn)],
    ["interest", difference(a.figures.totalInterest, b.figures.totalInterest)],
    ["in total paid", difference(a.figures.totalPaid, b.figures.totalPaid)],
  ];
  const clauses = parts.flatMap(([what, d]) => (d === null ? [] : [`${d.amount} ${d.more ? "more" : "less"} ${what}`]));
  if (clauses.length === 0) return "These two deals have the same all-in price, interest and total paid.";
  return `B is ${joinClauses(clauses)}.`;
}

function paymentLine({ a, b }: Comparison): string | null {
  const payment = difference(a.monthlyPayment, b.monthlyPayment);
  const months = b.deal.quote.termMonths - a.deal.quote.termMonths;
  const span = Math.abs(months);
  const unit = span === 1 ? "month" : "months";
  if (payment === null) {
    return months === 0 ? null : `The payments match, and B runs ${span} ${unit} ${months > 0 ? "longer" : "shorter"}.`;
  }
  const base = `B's payment is ${payment.amount} a month ${payment.more ? "higher" : "lower"}`;
  if (months === 0) return `${base}.`;
  const longer = months > 0;
  const connector = payment.more === longer ? "and" : "but";
  return `${base}, ${connector} it ${longer ? "runs" : "ends"} ${span} ${unit} ${longer ? "longer" : "sooner"}.`;
}

export function differenceLines(comparison: Comparison): string[] {
  const payment = paymentLine(comparison);
  return payment === null ? [totalsLine(comparison)] : [totalsLine(comparison), payment];
}
