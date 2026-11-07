import { decodeDeal, planPayment, type DealInputs } from "../math/deal";
import { periodCount, type PaymentFrequency } from "../math/loan";
import type { Province } from "../math/tax";
import { cents, fromDollars, toDollars, type Cents } from "./money";

export interface DealQuote {
  payment: Cents;
  frequency: PaymentFrequency;
  termMonths: number;
  apr: number;
  downPayment: Cents;
  tradeAllowance: Cents;
  tradePayoff: Cents;
  province: Province;
  advertisedPrice?: Cents;
}

export interface DealFigures {
  amountFinanced: Cents;
  netTradeEquity: Cents;
  cashIn: Cents;
  impliedAllIn: Cents;
  totalInterest: Cents;
  totalPaid: Cents;
  expectedAllIn?: Cents;
  unexplainedGap?: Cents;
}

export function toDollarInputs(q: DealQuote): DealInputs {
  const inputs: DealInputs = {
    payment: toDollars(q.payment),
    frequency: q.frequency,
    termMonths: q.termMonths,
    apr: q.apr,
    downPayment: toDollars(q.downPayment),
    tradeAllowance: toDollars(q.tradeAllowance),
    tradePayoff: toDollars(q.tradePayoff),
    province: q.province,
  };
  if (q.advertisedPrice !== undefined) inputs.advertisedPrice = toDollars(q.advertisedPrice);
  return inputs;
}

export function dealFigures(q: DealQuote): DealFigures {
  const b = decodeDeal(toDollarInputs(q));
  const figures: DealFigures = {
    amountFinanced: fromDollars(b.amountFinanced),
    netTradeEquity: fromDollars(b.netTradeEquity),
    cashIn: cents(q.downPayment + q.tradeAllowance - q.tradePayoff),
    impliedAllIn: fromDollars(b.impliedAllIn),
    totalInterest: fromDollars(b.totalInterest),
    totalPaid: fromDollars(b.totalPaid),
  };
  if (b.expectedAllIn !== undefined) figures.expectedAllIn = fromDollars(b.expectedAllIn);
  if (b.unexplainedGap !== undefined) figures.unexplainedGap = fromDollars(b.unexplainedGap);
  return figures;
}

export interface PlanQuote {
  frequency: PaymentFrequency;
  termMonths: number;
  apr: number;
  downPayment: Cents;
  tradeAllowance: Cents;
  tradePayoff: Cents;
  province: Province;
  advertisedPrice: Cents;
}

export interface PlanFigures {
  advertisedPrice: Cents;
  salesTax: Cents;
  licensing: Cents;
  allIn: Cents;
  downPayment: Cents;
  netTradeEquity: Cents;
  amountFinanced: Cents;
  payment: Cents;
  totalInterest: Cents;
  totalPaid: Cents;
}

export function paymentPlan(q: PlanQuote): PlanFigures {
  const plan = planPayment({
    frequency: q.frequency,
    termMonths: q.termMonths,
    apr: q.apr,
    downPayment: toDollars(q.downPayment),
    tradeAllowance: toDollars(q.tradeAllowance),
    tradePayoff: toDollars(q.tradePayoff),
    province: q.province,
    advertisedPrice: toDollars(q.advertisedPrice),
  });
  const payment = fromDollars(plan.payment);
  const salesTax = fromDollars(plan.salesTax);
  const licensing = fromDollars(plan.licensing);
  const allIn = cents(q.advertisedPrice + salesTax + licensing);
  const netTradeEquity = cents(q.tradeAllowance - q.tradePayoff);
  const cashIn = q.downPayment + netTradeEquity;
  const amountFinanced = cents(Math.max(0, allIn - cashIn));
  const paid = payment * periodCount(q.termMonths, q.frequency);
  return {
    advertisedPrice: q.advertisedPrice,
    salesTax,
    licensing,
    allIn,
    downPayment: q.downPayment,
    netTradeEquity,
    amountFinanced,
    payment,
    totalInterest: cents(paid - amountFinanced),
    totalPaid: cents(paid + cashIn),
  };
}
