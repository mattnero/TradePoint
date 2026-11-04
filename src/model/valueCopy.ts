import { monthYear } from "./cliffCopy";
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
