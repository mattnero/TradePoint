import { addMonths, type IsoDate } from "./dates";
import { loanBalanceAt, type Loan } from "./loan";
import { cents, type Cents } from "./money";

export interface EquityPoint {
  month: number;
  date: IsoDate;
  value: Cents;
  balance: Cents;
  equity: Cents;
}

export interface EquityProjection {
  points: EquityPoint[];
  crossover: EquityPoint | null;
}

export interface EquityInputs {
  loan: Loan | undefined;
  valueAt: (date: IsoDate) => Cents;
  asOf: IsoDate;
  months: number;
}

export function projectEquity({ loan, valueAt, asOf, months }: EquityInputs): EquityProjection {
  const points: EquityPoint[] = [];
  for (let month = 0; month <= months; month++) {
    const date = addMonths(asOf, month);
    const value = valueAt(date);
    const balance = loan === undefined ? cents(0) : loanBalanceAt(loan, date);
    points.push({ month, date, value, balance, equity: cents(value - balance) });
  }
  return { points, crossover: points.find((p) => p.value >= p.balance) ?? null };
}
