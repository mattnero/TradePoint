import type { Vehicle } from "./vehicle";
import { latestReading } from "./vehicle";

export const RADIUS_OPTIONS = [25, 50, 100, 250];

const POSTAL_CODE = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;
const KM_STEP = 5_000;
const MIN_KM_BAND = 15_000;
const KM_BAND_SHARE = 0.2;

export function normalizePostalCode(text: string): string | null {
  const cleaned = text.replace(/[\s-]/g, "").toUpperCase();
  return POSTAL_CODE.test(cleaned) ? cleaned : null;
}

export function kmBand(km: number): { from: number; to: number } {
  const band = Math.max(MIN_KM_BAND, km * KM_BAND_SHARE);
  return {
    from: Math.max(0, Math.floor((km - band) / KM_STEP) * KM_STEP),
    to: Math.ceil((km + band) / KM_STEP) * KM_STEP,
  };
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CompSearch {
  postalCode: string;
  radiusKm: number;
}

export function autoTraderUrl(vehicle: Vehicle, search: CompSearch): string {
  const { from, to } = kmBand(latestReading(vehicle).km);
  const params = new URLSearchParams({ kmfrom: String(from), kmto: String(to) });
  const postalCode = normalizePostalCode(search.postalCode);
  if (postalCode !== null) {
    params.set("zip", postalCode);
    params.set("zipr", String(search.radiusKm));
  }
  return `https://www.autotrader.ca/cars/${slug(vehicle.make)}/${slug(vehicle.model)}/my_${vehicle.year}?${params}`;
}

export function cargurusSearchUrl(vehicle: Vehicle): string {
  const query = `${vehicle.year} ${vehicle.make} ${vehicle.model} for sale site:cargurus.ca`;
  return `https://www.google.com/search?${new URLSearchParams({ q: query })}`;
}
