import { addDays, addMonths, addYears, firstDayOfMonth, lastDayOfMonth, monthOf, type IsoDate } from "./dates";
import { projectEquity } from "./equity";
import { cents, type Cents } from "./money";
import { segmentFor } from "./segments";
import { kmPerDay, latestReading, type OdometerReading, type Vehicle } from "./vehicle";
import { warrantyFor, type CoverageTerms } from "./warranty";

export type Coverage = "comprehensive" | "powertrain";
export type WarrantyLimit = "date" | "km" | "date-or-km";

export type Cliff =
  | { kind: "equity"; date: IsoDate; value: Cents; balance: Cents }
  | {
      kind: "warranty";
      date: IsoDate;
      coverages: Coverage[];
      limitedBy: WarrantyLimit;
      years: number;
      km: number | null;
    }
  | { kind: "odometer"; date: IsoDate | null; km: number }
  | { kind: "maintenance"; date: IsoDate | null; km: number; item: string; typicalCost: Cents }
  | { kind: "season"; date: IsoDate; endDate: IsoDate; reason: string };

export type PastCliff =
  | { kind: "equity"; value: Cents; balance: Cents }
  | { kind: "warranty"; date: IsoDate | null; coverages: Coverage[]; limitedBy: "date" | "km" }
  | { kind: "odometer"; km: number };

export type Need = "inServiceDate" | "odometerRate" | "segment" | "value" | "warrantyTerms";

export interface CliffReport {
  upcoming: Cliff[];
  past: PastCliff[];
  activeSeason: { endDate: IsoDate; reason: string } | null;
  needs: Need[];
}

export interface CliffInputs {
  vehicle: Vehicle;
  asOf: IsoDate;
  valueAt?: (date: IsoDate) => Cents;
  horizonMonths?: number;
}

export const ODOMETER_THRESHOLDS = [100_000, 150_000, 200_000];
export const DEFAULT_HORIZON_MONTHS = 36;
const COVERAGES: Coverage[] = ["comprehensive", "powertrain"];
const KIND_ORDER: Cliff["kind"][] = ["equity", "warranty", "odometer", "maintenance", "season"];

interface Odometer {
  reading: OdometerReading;
  perDay: number | null;
}

function dateAtKm(odo: Odometer, km: number): IsoDate | null {
  if (odo.perDay === null || odo.perDay <= 0) return null;
  const days = (km - odo.reading.km) / odo.perDay;
  return addDays(odo.reading.date, days >= 0 ? Math.ceil(days) : Math.floor(days));
}

interface CoverageEnd {
  coverage: Coverage;
  terms: CoverageTerms;
  date: IsoDate | null;
  limitedBy: WarrantyLimit;
}

function coverageEnd(
  coverage: Coverage,
  terms: CoverageTerms,
  inService: IsoDate,
  odo: Odometer,
  asOf: IsoDate,
): CoverageEnd {
  const byDate = addYears(inService, terms.years);
  if (terms.km === null) return { coverage, terms, date: byDate, limitedBy: "date" };
  const byKm = dateAtKm(odo, terms.km);
  if (byKm !== null) {
    return byKm < byDate
      ? { coverage, terms, date: byKm, limitedBy: "km" }
      : { coverage, terms, date: byDate, limitedBy: "date" };
  }
  if (odo.reading.km >= terms.km) {
    return byDate <= asOf
      ? { coverage, terms, date: byDate, limitedBy: "date" }
      : { coverage, terms, date: null, limitedBy: "km" };
  }
  const parked = odo.perDay !== null && odo.perDay <= 0;
  return { coverage, terms, date: byDate, limitedBy: parked ? "date" : "date-or-km" };
}

function warrantyCliffs(vehicle: Vehicle, odo: Odometer, asOf: IsoDate, report: CliffReport): Cliff[] {
  if (vehicle.inServiceDate === undefined) {
    report.needs.push("inServiceDate");
    return [];
  }
  const status = warrantyFor(vehicle.make, vehicle.inServiceDate, odo.reading.km, asOf);
  if (status === null) {
    report.needs.push("warrantyTerms");
    return [];
  }
  const inService = vehicle.inServiceDate;
  const ends = COVERAGES.map((c) => coverageEnd(c, status[c], inService, odo, asOf));
  const groups = new Map<string, CoverageEnd[]>();
  for (const end of ends) {
    const key = `${end.date}|${end.limitedBy}`;
    groups.set(key, [...(groups.get(key) ?? []), end]);
  }

  const cliffs: Cliff[] = [];
  for (const group of groups.values()) {
    const first = group[0]!;
    const coverages = group.map((g) => g.coverage);
    const ended = first.date === null || first.date <= asOf;
    if (ended) {
      const limitedBy = first.limitedBy === "date-or-km" ? "date" : first.limitedBy;
      report.past.push({ kind: "warranty", date: first.date, coverages, limitedBy });
    } else {
      const longest = group.reduce((a, b) => (b.terms.years > a.terms.years ? b : a));
      cliffs.push({
        kind: "warranty",
        date: first.date!,
        coverages,
        limitedBy: first.limitedBy,
        years: longest.terms.years,
        km: longest.terms.km,
      });
    }
  }
  return cliffs;
}

function odometerCliff(odo: Odometer, asOf: IsoDate, report: CliffReport): Cliff[] {
  let passed: number | null = null;
  for (const km of ODOMETER_THRESHOLDS) {
    const date = odo.reading.km >= km ? odo.reading.date : dateAtKm(odo, km);
    if (date !== null && date <= asOf) {
      passed = km;
      continue;
    }
    if (passed !== null) report.past.push({ kind: "odometer", km: passed });
    return [{ kind: "odometer", date, km }];
  }
  if (passed !== null) report.past.push({ kind: "odometer", km: passed });
  return [];
}

function maintenanceCliffs(vehicle: Vehicle, odo: Odometer, asOf: IsoDate): Cliff[] {
  if (vehicle.segment === undefined) return [];
  return segmentFor(vehicle.segment).maintenance.map((m) => {
    let km = (Math.floor(odo.reading.km / m.km) + 1) * m.km;
    let date = dateAtKm(odo, km);
    while (date !== null && date <= asOf) {
      km += m.km;
      date = dateAtKm(odo, km);
    }
    return { kind: "maintenance", date, km, item: m.item, typicalCost: cents(m.typicalCostCents) };
  });
}

function inWindow(month: number, start: number, end: number): boolean {
  return start <= end ? month >= start && month <= end : month >= start || month <= end;
}

function seasonCliff(vehicle: Vehicle, asOf: IsoDate, report: CliffReport): Cliff[] {
  if (vehicle.segment === undefined) {
    report.needs.push("segment");
    return [];
  }
  const season = segmentFor(vehicle.segment).season;
  if (season === null) return [];
  const { year, month } = monthOf(asOf);
  const wraps = season.startMonth > season.endMonth;
  if (inWindow(month, season.startMonth, season.endMonth)) {
    const endYear = wraps && month >= season.startMonth ? year + 1 : year;
    report.activeSeason = { endDate: lastDayOfMonth(endYear, season.endMonth), reason: season.reason };
  }
  const startYear = month < season.startMonth ? year : year + 1;
  const endYear = wraps ? startYear + 1 : startYear;
  return [
    {
      kind: "season",
      date: firstDayOfMonth(startYear, season.startMonth),
      endDate: lastDayOfMonth(endYear, season.endMonth),
      reason: season.reason,
    },
  ];
}

function equityCliff(inputs: CliffInputs, horizon: number, report: CliffReport): Cliff[] {
  const { vehicle, asOf, valueAt } = inputs;
  if (vehicle.loan === undefined) return [];
  if (valueAt === undefined) {
    report.needs.push("value");
    return [];
  }
  const { crossover } = projectEquity({ loan: vehicle.loan, valueAt, asOf, months: horizon });
  if (crossover === null) return [];
  const { date, value, balance } = crossover;
  if (crossover.month === 0) {
    report.past.push({ kind: "equity", value, balance });
    return [];
  }
  return [{ kind: "equity", date, value, balance }];
}

function compare(a: Cliff, b: Cliff): number {
  if (a.date !== b.date) {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date < b.date ? -1 : 1;
  }
  return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
}

export function cliffsFor(inputs: CliffInputs): CliffReport {
  const { vehicle, asOf } = inputs;
  const horizon = inputs.horizonMonths ?? DEFAULT_HORIZON_MONTHS;
  const report: CliffReport = { upcoming: [], past: [], activeSeason: null, needs: [] };
  const odo: Odometer = { reading: latestReading(vehicle), perDay: kmPerDay(vehicle) };
  if (odo.perDay === null) report.needs.push("odometerRate");

  const candidates = [
    ...equityCliff(inputs, horizon, report),
    ...warrantyCliffs(vehicle, odo, asOf, report),
    ...odometerCliff(odo, asOf, report),
    ...maintenanceCliffs(vehicle, odo, asOf),
    ...seasonCliff(vehicle, asOf, report),
  ];
  const limit = addMonths(asOf, horizon);
  report.upcoming = candidates.filter((c) => c.date === null || c.date <= limit).sort(compare);
  return report;
}
