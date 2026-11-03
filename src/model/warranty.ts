import warranty from "../data/warranty.json";
import { addYears, type IsoDate } from "./dates";

export interface CoverageTerms {
  years: number;
  km: number | null;
}

interface WarrantyRow {
  comprehensive: CoverageTerms;
  powertrain: CoverageTerms;
  aliases: string[];
  source: string;
  quote: string;
  verifiedOn: IsoDate;
  notes: string;
}

export interface CoverageStatus extends CoverageTerms {
  endsOn: IsoDate;
  kmRemaining: number | null;
  expired: "date" | "km" | null;
}

export interface WarrantyStatus {
  make: string;
  comprehensive: CoverageStatus;
  powertrain: CoverageStatus;
  source: string;
  verifiedOn: IsoDate;
  notes: string;
}

const TABLE: Record<string, WarrantyRow> = warranty;

function normalise(name: string): string {
  return name.trim().toLowerCase();
}

const LOOKUP = new Map<string, string>();
for (const [make, row] of Object.entries(TABLE)) {
  LOOKUP.set(normalise(make), make);
  for (const alias of row.aliases) LOOKUP.set(normalise(alias), make);
}

function coverage(terms: CoverageTerms, inServiceDate: IsoDate, km: number, asOf: IsoDate): CoverageStatus {
  const endsOn = addYears(inServiceDate, terms.years);
  const kmRemaining = terms.km === null ? null : Math.max(0, terms.km - km);
  const expired = asOf >= endsOn ? "date" : kmRemaining === 0 ? "km" : null;
  return { ...terms, endsOn, kmRemaining, expired };
}

export function warrantyFor(
  make: string,
  inServiceDate: IsoDate,
  km: number,
  asOf: IsoDate,
): WarrantyStatus | null {
  const canonical = LOOKUP.get(normalise(make));
  const row = canonical === undefined ? undefined : TABLE[canonical];
  if (canonical === undefined || row === undefined) return null;
  return {
    make: canonical,
    comprehensive: coverage(row.comprehensive, inServiceDate, km, asOf),
    powertrain: coverage(row.powertrain, inServiceDate, km, asOf),
    source: row.source,
    verifiedOn: row.verifiedOn,
    notes: row.notes,
  };
}

export function knownMakes(): string[] {
  return Object.keys(TABLE).sort();
}
