import { cents, type Cents } from "./money";

export function medianPrice(prices: Cents[]): Cents {
  const sorted = [...prices].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle]!;
  return cents(Math.round((sorted[middle - 1]! + sorted[middle]!) / 2));
}
