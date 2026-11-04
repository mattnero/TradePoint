import { DAYS_PER_MONTH, daysBetween, type IsoDate } from "./dates";
import { cents, type Cents } from "./money";
import { segmentFor, type Segment, type SegmentKey } from "./segments";
import { estimatedInServiceDate, type ValueSource, type Vehicle } from "./vehicle";

export interface ValueBasis {
  source: ValueSource | "purchase";
  date: IsoDate;
  value: Cents;
  segment: SegmentKey;
  ageEstimated: boolean;
}

export interface ValueCurve {
  at: (date: IsoDate) => Cents;
  basis: ValueBasis;
}

export function retention(segment: Segment, ageMonths: number): number {
  const age = Math.max(0, ageMonths);
  const firstYear = Math.min(age, 12);
  const middle = Math.min(Math.max(age - 12, 0), segment.flattensAfterMonths - 12);
  const late = Math.max(age - segment.flattensAfterMonths, 0);
  return (
    Math.pow(1 - segment.firstYearDrop, firstYear / 12) *
    Math.pow(1 - segment.monthlyRate, middle) *
    Math.pow(1 - segment.lateMonthlyRate, late)
  );
}

type Anchor = Pick<ValueBasis, "source" | "date" | "value">;

function anchorsOf(vehicle: Vehicle): Anchor[] {
  const anchors: Anchor[] = [];
  if (vehicle.purchase !== undefined) {
    anchors.push({ source: "purchase", date: vehicle.purchase.date, value: vehicle.purchase.price });
  }
  anchors.push(...(vehicle.valueAnchors ?? []));
  return anchors.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function anchorFor(anchors: Anchor[], date: IsoDate): Anchor {
  let chosen = anchors[0]!;
  for (const anchor of anchors) {
    if (anchor.date <= date) chosen = anchor;
  }
  return chosen;
}

export function valueCurve(vehicle: Vehicle): ValueCurve | null {
  if (vehicle.segment === undefined) return null;
  const anchors = anchorsOf(vehicle);
  if (anchors.length === 0) return null;
  const segment = segmentFor(vehicle.segment);
  const inService = vehicle.inServiceDate ?? estimatedInServiceDate(vehicle.year);
  const retained = (date: IsoDate) => retention(segment, daysBetween(inService, date) / DAYS_PER_MONTH);
  const latest = anchors[anchors.length - 1]!;

  return {
    at(date) {
      const anchor = anchorFor(anchors, date);
      return cents(Math.round((anchor.value * retained(date)) / retained(anchor.date)));
    },
    basis: {
      ...latest,
      segment: vehicle.segment,
      ageEstimated: vehicle.inServiceDate === undefined || vehicle.inServiceEstimated === true,
    },
  };
}
