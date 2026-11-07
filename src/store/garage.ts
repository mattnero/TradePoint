import { parseSavedDeal, type SavedDeal } from "../model/savedDeal";
import { parseVehicle, type Vehicle } from "../model/vehicle";

export const STORAGE_KEY = "tradepoint.garage.v1";
export const BACKUP_KEY = "tradepoint.garage.backup";
export const CURRENT_SCHEMA_VERSION = 3;
export const V1_OFFER_SOURCE = "Outside offer";

export interface Garage {
  schemaVersion: number;
  vehicles: Vehicle[];
  deals: SavedDeal[];
  selectedVehicleId?: string;
}

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  garage: Garage;
  recovered: boolean;
}

type Migration = (blob: unknown) => unknown;

function v1BenchmarksToPrep(benchmarks: unknown): unknown {
  if (typeof benchmarks !== "object" || benchmarks === null) return benchmarks;
  const { outsideTradeOffer, ...rest } = benchmarks as Record<string, unknown>;
  if (outsideTradeOffer === undefined) return rest;
  return { ...rest, tradeOffers: [{ source: V1_OFFER_SOURCE, amount: outsideTradeOffer }] };
}

function isEmptyObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && Object.keys(value).length === 0;
}

function vehicleV1ToV2(vehicle: unknown): unknown {
  if (typeof vehicle !== "object" || vehicle === null || !("benchmarks" in vehicle)) return vehicle;
  const { benchmarks, ...rest } = vehicle as Record<string, unknown>;
  const prep = v1BenchmarksToPrep(benchmarks);
  return isEmptyObject(prep) ? rest : { ...rest, prep };
}

function garageV1ToV2(blob: unknown): unknown {
  const g = blob as Record<string, unknown>;
  const vehicles = Array.isArray(g.vehicles) ? g.vehicles.map(vehicleV1ToV2) : g.vehicles;
  return { ...g, schemaVersion: 2, vehicles };
}

function garageV2ToV3(blob: unknown): unknown {
  const g = blob as Record<string, unknown>;
  return { ...g, schemaVersion: 3, deals: Array.isArray(g.deals) ? [] : g.deals };
}

const MIGRATIONS: Record<number, Migration> = { 1: garageV1ToV2, 2: garageV2ToV3 };

export function emptyGarage(): Garage {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, vehicles: [], deals: [] };
}

function versionOf(blob: unknown): number | null {
  if (typeof blob !== "object" || blob === null) return null;
  const version = (blob as Record<string, unknown>).schemaVersion;
  return typeof version === "number" && Number.isInteger(version) ? version : null;
}

export function runMigrations(
  blob: unknown,
  migrations: Record<number, Migration>,
  target: number,
): unknown | null {
  let current = blob;
  let version = versionOf(current);
  while (version !== null && version < target) {
    const step = migrations[version];
    if (step === undefined) return null;
    current = step(current);
    const next = versionOf(current);
    if (next === null || next <= version) return null;
    version = next;
  }
  return version === target ? current : null;
}

function validate(blob: unknown): Garage | null {
  if (typeof blob !== "object" || blob === null) return null;
  const g = blob as Record<string, unknown>;
  if (!Array.isArray(g.vehicles) || !Array.isArray(g.deals)) return null;
  const vehicles: Vehicle[] = [];
  for (const raw of g.vehicles) {
    const vehicle = parseVehicle(raw);
    if (vehicle === null) return null;
    vehicles.push(vehicle);
  }
  const deals: SavedDeal[] = [];
  for (const raw of g.deals) {
    const deal = parseSavedDeal(raw);
    if (deal === null) return null;
    deals.push(deal);
  }
  const garage: Garage = { schemaVersion: CURRENT_SCHEMA_VERSION, vehicles, deals };
  const selected = g.selectedVehicleId;
  if (typeof selected === "string" && vehicles.some((v) => v.id === selected)) garage.selectedVehicleId = selected;
  return garage;
}

function parseStored(raw: string): Garage | null {
  let blob: unknown;
  try {
    blob = JSON.parse(raw);
  } catch {
    return null;
  }
  const migrated = runMigrations(blob, MIGRATIONS, CURRENT_SCHEMA_VERSION);
  return migrated === null ? null : validate(migrated);
}

function keepCopyOfUnreadable(storage: KeyValueStore, raw: string): void {
  try {
    storage.setItem(BACKUP_KEY, raw);
  } catch {
    return;
  }
}

export function loadGarage(storage: KeyValueStore): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { garage: emptyGarage(), recovered: false };
  }
  if (raw === null) return { garage: emptyGarage(), recovered: false };

  const garage = parseStored(raw);
  if (garage !== null) return { garage, recovered: false };

  keepCopyOfUnreadable(storage, raw);
  return { garage: emptyGarage(), recovered: true };
}

export function saveGarage(garage: Garage, storage: KeyValueStore): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(garage));
    return true;
  } catch {
    return false;
  }
}

export function readUnreadableCopy(storage: KeyValueStore): string | null {
  try {
    return storage.getItem(BACKUP_KEY);
  } catch {
    return null;
  }
}

export function eraseGarage(storage: KeyValueStore): boolean {
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}
