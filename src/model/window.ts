import type { Cliff, CliffReport } from "./cliffs";
import { addMonths, type IsoDate } from "./dates";
import type { EquityProjection } from "./equity";
import { loanBalanceAt, monthlyPayment, monthsRemainingAt, type Loan } from "./loan";
import { cents, type Cents } from "./money";

export type Deadline = Extract<Cliff, { kind: "warranty" | "odometer" }> & { date: IsoDate };

export type TradeWindow =
  | { kind: "window"; opens: IsoDate | "now"; closes: Deadline }
  | { kind: "late"; opens: IsoDate; closes: Deadline }
  | { kind: "open"; opens: IsoDate | "now" }
  | { kind: "underwater"; closes: Deadline | null };

export interface KeepCost {
  depreciation: Cents;
  interest: Cents;
}

const LISTING_CUTOFF_KM = 100_000;

function isDeadline(cliff: Cliff): cliff is Deadline {
  if (cliff.date === null) return false;
  return cliff.kind === "warranty" || (cliff.kind === "odometer" && cliff.km === LISTING_CUTOFF_KM);
}

export function tradeWindow(report: CliffReport, projection: EquityProjection): TradeWindow {
  const deadline = report.upcoming.find(isDeadline) ?? null;
  const { crossover } = projection;
  if (crossover === null) return { kind: "underwater", closes: deadline };
  const opens = crossover.month === 0 ? "now" : crossover.date;
  if (deadline === null) return { kind: "open", opens };
  if (opens !== "now" && deadline.date <= opens) return { kind: "late", opens, closes: deadline };
  return { kind: "window", opens, closes: deadline };
}

export function keepCost(valueAt: (date: IsoDate) => Cents, loan: Loan | undefined, asOf: IsoDate): KeepCost {
  const yearOn = addMonths(asOf, 12);
  const depreciation = cents(Math.max(0, valueAt(asOf) - valueAt(yearOn)));
  if (loan === undefined) return { depreciation, interest: cents(0) };
  const payments = Math.min(12, monthsRemainingAt(loan, asOf));
  const principalPaid = loanBalanceAt(loan, asOf) - loanBalanceAt(loan, yearOn);
  return { depreciation, interest: cents(Math.max(0, payments * monthlyPayment(loan) - principalPaid)) };
}
