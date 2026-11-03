import { paymentFor, remainingBalance } from "../math/loan";
import { isIsoDate, wholeMonthsBetween, type IsoDate } from "./dates";
import { cents, fromDollars, toDollars, type Cents } from "./money";

export type Loan =
  | { kind: "terms"; principal: Cents; apr: number; termMonths: number; startDate: IsoDate }
  | { kind: "snapshot"; balance: Cents; apr: number; monthsRemaining: number; asOf: IsoDate };

interface Schedule {
  principal: number;
  monthlyRate: number;
  periods: number;
  startDate: IsoDate;
}

function scheduleOf(loan: Loan): Schedule {
  if (loan.kind === "terms") {
    return {
      principal: toDollars(loan.principal),
      monthlyRate: loan.apr / 12,
      periods: loan.termMonths,
      startDate: loan.startDate,
    };
  }
  return {
    principal: toDollars(loan.balance),
    monthlyRate: loan.apr / 12,
    periods: loan.monthsRemaining,
    startDate: loan.asOf,
  };
}

export function monthlyPayment(loan: Loan): Cents {
  const s = scheduleOf(loan);
  return fromDollars(paymentFor(s.principal, s.monthlyRate, s.periods));
}

export function loanBalanceAt(loan: Loan, date: IsoDate): Cents {
  const s = scheduleOf(loan);
  const paid = wholeMonthsBetween(s.startDate, date);
  return fromDollars(remainingBalance(s.principal, s.monthlyRate, s.periods, paid));
}

export function monthsRemainingAt(loan: Loan, date: IsoDate): number {
  const s = scheduleOf(loan);
  return Math.max(0, s.periods - wholeMonthsBetween(s.startDate, date));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRate(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1;
}

export function parseLoan(value: unknown): Loan | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!isRate(v.apr)) return null;
  if (v.kind === "terms") {
    if (!isCount(v.principal) || v.principal === 0) return null;
    if (!isCount(v.termMonths) || v.termMonths === 0) return null;
    if (!isIsoDate(v.startDate)) return null;
    return {
      kind: "terms",
      principal: cents(v.principal),
      apr: v.apr,
      termMonths: v.termMonths,
      startDate: v.startDate,
    };
  }
  if (v.kind === "snapshot") {
    if (!isCount(v.balance)) return null;
    if (!isCount(v.monthsRemaining) || v.monthsRemaining === 0) return null;
    if (!isIsoDate(v.asOf)) return null;
    return {
      kind: "snapshot",
      balance: cents(v.balance),
      apr: v.apr,
      monthsRemaining: v.monthsRemaining,
      asOf: v.asOf,
    };
  }
  return null;
}
