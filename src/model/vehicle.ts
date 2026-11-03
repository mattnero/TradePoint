import { daysBetween, isIsoDate, type IsoDate } from "./dates";
import { parseLoan, type Loan } from "./loan";
import { cents, type Cents } from "./money";

export interface OdometerReading {
  date: IsoDate;
  km: number;
}

export interface Purchase {
  price: Cents;
  date: IsoDate;
}

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  inServiceDate?: IsoDate;
  purchase?: Purchase;
  odometer: OdometerReading[];
  loan?: Loan;
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
const DAYS_PER_MONTH = 365.25 / 12;
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

export function latestReading(vehicle: Vehicle): OdometerReading {
  return vehicle.odometer[vehicle.odometer.length - 1]!;
}

export function kmPerMonth(vehicle: Vehicle): number | null {
  const [previous, latest] = vehicle.odometer.slice(-2);
  if (previous === undefined || latest === undefined) return null;
  const days = daysBetween(previous.date, latest.date);
  if (days < MIN_DAYS_FOR_RATE) return null;
  return Math.round((latest.km - previous.km) / (days / DAYS_PER_MONTH));
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
  if (v.inServiceDate !== undefined) {
    if (!isIsoDate(v.inServiceDate)) return null;
    vehicle.inServiceDate = v.inServiceDate;
  }
  if (v.purchase !== undefined) {
    const p = v.purchase as Record<string, unknown> | null;
    if (typeof p !== "object" || p === null || !isCount(p.price) || !isIsoDate(p.date)) return null;
    vehicle.purchase = { price: cents(p.price), date: p.date };
  }
  if (v.loan !== undefined) {
    const loan = parseLoan(v.loan);
    if (loan === null) return null;
    vehicle.loan = loan;
  }
  return vehicle;
}
