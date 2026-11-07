import { amountFinanced, paymentFor, periodCount, periodicRate, totalInterest, totalOfPayments, type LoanQuote } from "./loan";
import { expectedAllIn, salesTax, TAX_RULES, type Province } from "./tax";

export interface DealInputs extends LoanQuote {
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  province: Province;
  advertisedPrice?: number;
}

export interface DealBreakdown {
  amountFinanced: number;
  netTradeEquity: number;
  impliedAllIn: number;
  totalPaid: number;
  totalInterest: number;
  expectedAllIn?: number;
  unexplainedGap?: number;
}

export function decodeDeal(d: DealInputs): DealBreakdown {
  const financed = amountFinanced(d);
  const netTradeEquity = d.tradeAllowance - d.tradePayoff;
  const cashIn = d.downPayment + netTradeEquity;
  const out: DealBreakdown = {
    amountFinanced: financed,
    netTradeEquity,
    impliedAllIn: financed + cashIn,
    totalPaid: totalOfPayments(d) + cashIn,
    totalInterest: totalInterest(d),
  };
  if (d.advertisedPrice !== undefined) {
    out.expectedAllIn = expectedAllIn(d.advertisedPrice, d.tradeAllowance, d.province);
    out.unexplainedGap = out.impliedAllIn - out.expectedAllIn;
  }
  return out;
}

export interface PlanInputs extends Omit<LoanQuote, "payment"> {
  downPayment: number;
  tradeAllowance: number;
  tradePayoff: number;
  province: Province;
  advertisedPrice: number;
}

export interface PaymentPlan {
  salesTax: number;
  licensing: number;
  allIn: number;
  netTradeEquity: number;
  amountFinanced: number;
  payment: number;
  totalInterest: number;
  totalPaid: number;
}

export function planPayment(p: PlanInputs): PaymentPlan {
  const tax = salesTax(p.advertisedPrice, p.tradeAllowance, p.province);
  const licensing = TAX_RULES[p.province].licensingEstimate;
  const allIn = p.advertisedPrice + tax + licensing;
  const netTradeEquity = p.tradeAllowance - p.tradePayoff;
  const cashIn = p.downPayment + netTradeEquity;
  const financed = Math.max(0, allIn - cashIn);
  const n = periodCount(p.termMonths, p.frequency);
  const payment = financed === 0 ? 0 : paymentFor(financed, periodicRate(p.apr, p.frequency), n);
  return {
    salesTax: tax,
    licensing,
    allIn,
    netTradeEquity,
    amountFinanced: financed,
    payment,
    totalInterest: payment * n - financed,
    totalPaid: payment * n + cashIn,
  };
}
