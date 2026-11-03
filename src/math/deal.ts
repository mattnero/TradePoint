import { amountFinanced, totalInterest, totalOfPayments, type LoanQuote } from "./loan";
import { expectedAllIn, type Province } from "./tax";

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
