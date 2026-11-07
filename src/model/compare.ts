import { monthlyEquivalent } from "../math/loan";
import { dealFigures, type DealFigures } from "./deal";
import { fromDollars, toDollars, type Cents } from "./money";
import type { SavedDeal } from "./savedDeal";
import { verdict, type VerdictLevel } from "./verdict";

export interface DealSide {
  deal: SavedDeal;
  figures: DealFigures;
  level: VerdictLevel;
  monthlyPayment: Cents;
}

export interface Comparison {
  a: DealSide;
  b: DealSide;
}

function sideOf(deal: SavedDeal): DealSide {
  const { quote, benchmarks } = deal;
  return {
    deal,
    figures: dealFigures(quote),
    level: verdict(quote, benchmarks).level,
    monthlyPayment: fromDollars(monthlyEquivalent(toDollars(quote.payment), quote.frequency)),
  };
}

export function compareDeals(a: SavedDeal, b: SavedDeal): Comparison {
  return { a: sideOf(a), b: sideOf(b) };
}
