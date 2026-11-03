import provinces from "../data/provinces.json";

export type Province = "ON";

export interface TaxRule {
  rate: number;
  tradeInReducesBase: boolean;
  licensingEstimate: number;
}

export const TAX_RULES: Record<Province, TaxRule> = {
  ON: {
    rate: provinces.ON.taxRate,
    tradeInReducesBase: provinces.ON.tradeInReducesBase,
    licensingEstimate: provinces.ON.licensingEstimateCents / 100,
  },
};

export function salesTax(price: number, tradeAllowance: number, province: Province): number {
  const rule = TAX_RULES[province];
  const base = rule.tradeInReducesBase ? Math.max(0, price - tradeAllowance) : price;
  return base * rule.rate;
}

export function expectedAllIn(advertisedPrice: number, tradeAllowance: number, province: Province): number {
  return advertisedPrice + salesTax(advertisedPrice, tradeAllowance, province) + TAX_RULES[province].licensingEstimate;
}
