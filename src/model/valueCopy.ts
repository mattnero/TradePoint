import { monthYear } from "./cliffCopy";
import { wholeMonthsBetween, type IsoDate } from "./dates";
import type { EquityProjection } from "./equity";
import { formatCAD } from "./money";
import { segmentFor } from "./segments";
import type { ValueBasis } from "./value";

function anchoredTo(basis: ValueBasis): string {
  const when = monthYear(basis.date);
  switch (basis.source) {
    case "purchase":
      return `anchored to what you paid in ${when}`;
    case "comps":
      return `re-anchored to your comps from ${when}`;
    case "offer":
      return `re-anchored to the outside offer from ${when}`;
    case "manual":
      return `re-anchored to the value you entered for ${when}`;
  }
}

export function valueBasisLine(basis: ValueBasis): string {
  const line = `${segmentFor(basis.segment).label} average curve, ${anchoredTo(basis)}.`;
  return basis.ageEstimated ? `${line} The car's age is estimated.` : line;
}

export interface EquityPill {
  text: string;
  tone: "good" | "bad";
}

export function equityPill(projection: EquityProjection, asOf: IsoDate): EquityPill {
  const now = projection.points[0]!;
  if (now.equity >= 0) return { text: formatCAD(now.equity, { signed: true }), tone: "good" };
  const shortfall = formatCAD(now.equity);
  const { crossover } = projection;
  if (crossover === null) return { text: shortfall, tone: "bad" };
  const months = wholeMonthsBetween(asOf, crossover.date);
  const when = months < 1 ? "within a month" : `in ~${months} ${months === 1 ? "month" : "months"}`;
  return { text: `${shortfall} · positive ${when}`, tone: "bad" };
}
