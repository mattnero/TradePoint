import { cliffsFor, DEFAULT_HORIZON_MONTHS, type CliffReport } from "./cliffs";
import type { IsoDate } from "./dates";
import { projectEquity, type EquityProjection } from "./equity";
import { valueCurve, type ValueCurve } from "./value";
import type { Vehicle } from "./vehicle";
import { keepCost, tradeWindow, type KeepCost, type TradeWindow } from "./window";

export interface Outlook {
  report: CliffReport;
  curve: ValueCurve | null;
  projection: EquityProjection | null;
  window: TradeWindow | null;
  keep: KeepCost | null;
}

export function outlookFor(vehicle: Vehicle, asOf: IsoDate): Outlook {
  const curve = valueCurve(vehicle);
  if (curve === null) {
    return { report: cliffsFor({ vehicle, asOf }), curve, projection: null, window: null, keep: null };
  }
  const report = cliffsFor({ vehicle, asOf, valueAt: curve.at });
  const projection = projectEquity({ loan: vehicle.loan, valueAt: curve.at, asOf, months: DEFAULT_HORIZON_MONTHS });
  return {
    report,
    curve,
    projection,
    window: tradeWindow(report, projection),
    keep: keepCost(curve.at, vehicle.loan, asOf),
  };
}
