import { DAYS_PER_MONTH, daysBetween, isIsoDate, type IsoDate } from "./dates";
import { parseLoan, type Loan } from "./loan";
import { cents, type Cents } from "./money";
import { SEGMENTS, type SegmentKey } from "./segments";
import type { Benchmarks } from "./verdict";

export interface OdometerReading {
  date: IsoDate;
  km: number;
}

export interface Purchase {
  price: Cents;
  date: IsoDate;
}

export const VALUE_SOURCES = ["comps", "offer", "manual"] as const;

export type ValueSource = (typeof VALUE_SOURCES)[number];

export interface ValueAnchor {
  date: IsoDate;
  value: Cents;
  source: ValueSource;
}

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  segment?: SegmentKey;
  inServiceDate?: IsoDate;
  inServiceEstimated?: boolean;
  purchase?: Purchase;
  odometer: OdometerReading[];
  loan?: Loan;
  benchmarks?: Benchmarks;
  valueAnchors?: ValueAnchor[];
}

export interface NewVehicle {
  year: number;
  make: string;
  model: string;
  trim?: string;
  odometer: OdometerReading;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MIN_DAYS_FOR_RATE = 14;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isReading(value: unknown): value is OdometerReading {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return isIsoDate(r.date) && isCount(r.km);
}

function isOrdered(readings: OdometerReading[]): boolean {
  return readings.every((r, i) => {
    const prev = readings[i - 1];
    return prev === undefined || (r.date > prev.date && r.km >= prev.km);
  });
}

function assertReading(reading: unknown): asserts reading is OdometerReading {
  if (!isReading(reading)) throw new RangeError("Odometer reading needs a valid date and whole kilometres");
}

export function createVehicle(input: NewVehicle, id: string): Vehicle {
  const make = input.make.trim();
  const model = input.model.trim();
  if (make === "" || model === "") throw new RangeError("Make and model are required");
  if (!Number.isInteger(input.year) || input.year < MIN_YEAR || input.year > MAX_YEAR) {
    throw new RangeError(`Model year out of range: ${input.year}`);
  }
  assertReading(input.odometer);
  const vehicle: Vehicle = { id, year: input.year, make, model, odometer: [{ ...input.odometer }] };
  const trim = input.trim?.trim();
  if (trim) vehicle.trim = trim;
  return vehicle;
}

export function addOdometerReading(vehicle: Vehicle, reading: OdometerReading): Vehicle {
  assertReading(reading);
  const others = vehicle.odometer.filter((r) => r.date !== reading.date);
  const odometer = [...others, { ...reading }].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!isOrdered(odometer)) throw new RangeError("Odometer cannot go down over time");
  return { ...vehicle, odometer };
}

export function addValueAnchor(vehicle: Vehicle, anchor: ValueAnchor): Vehicle {
  const others = (vehicle.valueAnchors ?? []).filter((a) => a.date !== anchor.date);
  const valueAnchors = [...others, { ...anchor }].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { ...vehicle, valueAnchors };
}

export function removeValueAnchor(vehicle: Vehicle, date: IsoDate): Vehicle {
  const { valueAnchors, ...rest } = vehicle;
  const kept = (valueAnchors ?? []).filter((a) => a.date !== date);
  return kept.length === 0 ? rest : { ...rest, valueAnchors: kept };
}

export function estimatedInServiceDate(year: number): IsoDate {
  return `${year}-07-01`;
}

export function latestReading(vehicle: Vehicle): OdometerReading {
  return vehicle.odometer[vehicle.odometer.length - 1]!;
}

export function kmPerDay(vehicle: Vehicle): number | null {
  const [previous, latest] = vehicle.odometer.slice(-2);
  if (previous === undefined || latest === undefined) return null;
  const days = daysBetween(previous.date, latest.date);
  if (days < MIN_DAYS_FOR_RATE) return null;
  return (latest.km - previous.km) / days;
}

export function kmPerMonth(vehicle: Vehicle): number | null {
  const perDay = kmPerDay(vehicle);
  return perDay === null ? null : Math.round(perDay * DAYS_PER_MONTH);
}

function parseBenchmarks(value: unknown): Benchmarks | null {
  if (typeof value !== "object" || value === null) return null;
  const b = value as Record<string, unknown>;
  const out: Benchmarks = {};
  if (b.preApprovalApr !== undefined) {
    if (typeof b.preApprovalApr !== "number" || b.preApprovalApr < 0 || b.preApprovalApr > 1) return null;
    out.preApprovalApr = b.preApprovalApr;
  }
  if (b.outsideTradeOffer !== undefined) {
    if (!isCount(b.outsideTradeOffer)) return null;
    out.outsideTradeOffer = cents(b.outsideTradeOffer);
  }
  return out;
}

function parseValueAnchor(value: unknown): ValueAnchor | null {
  if (typeof value !== "object" || value === null) return null;
  const a = value as Record<string, unknown>;
  if (!isIsoDate(a.date) || !isCount(a.value)) return null;
  if (!VALUE_SOURCES.includes(a.source as ValueSource)) return null;
  return { date: a.date, value: cents(a.value), source: a.source as ValueSource };
}

export function parseVehicle(value: unknown): Vehicle | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || v.id === "") return null;
  if (!Number.isInteger(v.year) || (v.year as number) < MIN_YEAR || (v.year as number) > MAX_YEAR) return null;
  if (typeof v.make !== "string" || v.make === "") return null;
  if (typeof v.model !== "string" || v.model === "") return null;
  if (!Array.isArray(v.odometer) || v.odometer.length === 0) return null;
  if (!v.odometer.every(isReading)) return null;
  const odometer = v.odometer.map((r) => ({ date: r.date, km: r.km }));
  if (!isOrdered(odometer)) return null;

  const vehicle: Vehicle = { id: v.id, year: v.year as number, make: v.make, model: v.model, odometer };

  if (v.trim !== undefined) {
    if (typeof v.trim !== "string") return null;
    vehicle.trim = v.trim;
  }
  if (v.segment !== undefined) {
    if (!SEGMENTS.includes(v.segment as SegmentKey)) return null;
    vehicle.segment = v.segment as SegmentKey;
  }
  if (v.inServiceDate !== undefined) {
    if (!isIsoDate(v.inServiceDate)) return null;
    vehicle.inServiceDate = v.inServiceDate;
  }
  if (v.inServiceEstimated !== undefined) {
    if (typeof v.inServiceEstimated !== "boolean") return null;
    vehicle.inServiceEstimated = v.inServiceEstimated;
  }
  if (v.purchase !== undefined) {
    const p = v.purchase as Record<string, unknown> | null;
    if (typeof p !== "object" || p === null || !isCount(p.price) || !isIsoDate(p.date)) return null;
    vehicle.purchase = { price: cents(p.price), date: p.date };
  }
  if (v.benchmarks !== undefined) {
    const benchmarks = parseBenchmarks(v.benchmarks);
    if (benchmarks === null) return null;
    vehicle.benchmarks = benchmarks;
  }
  if (v.valueAnchors !== undefined) {
    if (!Array.isArray(v.valueAnchors)) return null;
    const anchors = v.valueAnchors.map(parseValueAnchor);
    if (anchors.some((a) => a === null)) return null;
    vehicle.valueAnchors = anchors as ValueAnchor[];
  }
  if (v.loan !== undefined) {
    const loan = parseLoan(v.loan);
    if (loan === null) return null;
    vehicle.loan = loan;
  }
  return vehicle;
}
