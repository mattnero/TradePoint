import { parseVehicle, type Vehicle } from "../model/vehicle";

export const STORAGE_KEY = "tradepoint.garage.v1";
export const BACKUP_KEY = "tradepoint.garage.backup";
export const CURRENT_SCHEMA_VERSION = 1;

export interface Garage {
  schemaVersion: number;
  vehicles: Vehicle[];
  deals: unknown[];
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

const MIGRATIONS: Record<number, Migration> = {};

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
  return { schemaVersion: CURRENT_SCHEMA_VERSION, vehicles, deals: g.deals };
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
