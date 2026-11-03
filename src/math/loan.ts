export type PaymentFrequency = "monthly" | "biweekly" | "weekly";

export const PERIODS_PER_YEAR: Record<PaymentFrequency, number> = {
  monthly: 12,
  biweekly: 26,
  weekly: 52,
};

export interface LoanQuote {
  payment: number;
  frequency: PaymentFrequency;
  termMonths: number;
  apr: number;
}

export function periodicRate(apr: number, frequency: PaymentFrequency): number {
  return apr / PERIODS_PER_YEAR[frequency];
}

export function periodCount(termMonths: number, frequency: PaymentFrequency): number {
  return Math.round((termMonths * PERIODS_PER_YEAR[frequency]) / 12);
}

export function presentValue(payment: number, rate: number, periods: number): number {
  if (rate === 0) return payment * periods;
  return (payment * (1 - Math.pow(1 + rate, -periods))) / rate;
}

export function paymentFor(principal: number, rate: number, periods: number): number {
  if (rate === 0) return principal / periods;
  return (principal * rate) / (1 - Math.pow(1 + rate, -periods));
}

export function amountFinanced(q: LoanQuote): number {
  return presentValue(q.payment, periodicRate(q.apr, q.frequency), periodCount(q.termMonths, q.frequency));
}

export function totalOfPayments(q: LoanQuote): number {
  return q.payment * periodCount(q.termMonths, q.frequency);
}

export function totalInterest(q: LoanQuote): number {
  return totalOfPayments(q) - amountFinanced(q);
}

export function monthlyEquivalent(payment: number, frequency: PaymentFrequency): number {
  return (payment * PERIODS_PER_YEAR[frequency]) / 12;
}

export function remainingBalance(principal: number, rate: number, periods: number, paid: number): number {
  if (paid >= periods) return 0;
  const p = paymentFor(principal, rate, periods);
  if (rate === 0) return principal - p * paid;
  return principal * Math.pow(1 + rate, paid) - (p * (Math.pow(1 + rate, paid) - 1)) / rate;
}
