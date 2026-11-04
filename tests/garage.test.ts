import {
  BACKUP_KEY,
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  emptyGarage,
  eraseGarage,
  loadGarage,
  readUnreadableCopy,
  runMigrations,
  saveGarage,
  type Garage,
  type KeyValueStore,
} from "../src/store/garage";
import { createVehicle } from "../src/model/vehicle";

function fakeStorage(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const santaFe = createVehicle(
  { year: 2019, make: "Hyundai", model: "Santa Fe", odometer: { date: "2026-11-02", km: 118000 } },
  "v1",
);

const garageWithCar: Garage = { ...emptyGarage(), vehicles: [santaFe] };

describe("emptyGarage", () => {
  it("is version 1 with nothing in it", () => {
    expect(emptyGarage()).toEqual({ schemaVersion: 1, vehicles: [], deals: [] });
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});

describe("save and load", () => {
  it("returns an empty garage on first launch without writing anything", () => {
    const storage = fakeStorage();
    expect(loadGarage(storage)).toEqual({ garage: emptyGarage(), recovered: false });
    expect(storage.data.size).toBe(0);
  });

  it("brings a vehicle back after a reload", () => {
    const storage = fakeStorage();
    expect(saveGarage(garageWithCar, storage)).toBe(true);
    expect(loadGarage(storage)).toEqual({ garage: garageWithCar, recovered: false });
  });

  it("stores under tradepoint.garage.v1", () => {
    const storage = fakeStorage();
    saveGarage(garageWithCar, storage);
    expect(STORAGE_KEY).toBe("tradepoint.garage.v1");
    expect(storage.data.has(STORAGE_KEY)).toBe(true);
  });

  it("preserves saved deals it does not understand yet", () => {
    const storage = fakeStorage();
    const withDeals = { ...garageWithCar, deals: [{ anything: 1 }] };
    saveGarage(withDeals, storage);
    expect(loadGarage(storage).garage.deals).toEqual([{ anything: 1 }]);
  });

  it("reports failure instead of throwing when the store refuses a write", () => {
    const storage: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("full", "QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    expect(saveGarage(garageWithCar, storage)).toBe(false);
  });
});

describe("a broken stored blob", () => {
  const broken: [string, string][] = [
    ["invalid JSON", "{not json"],
    ["JSON null", "null"],
    ["an array", "[]"],
    ["a string", '"hello"'],
    ["no schemaVersion", JSON.stringify({ vehicles: [], deals: [] })],
    ["a non-array vehicles", JSON.stringify({ schemaVersion: 1, vehicles: {}, deals: [] })],
    ["a non-array deals", JSON.stringify({ schemaVersion: 1, vehicles: [], deals: {} })],
    ["a vehicle with no id", JSON.stringify({ schemaVersion: 1, vehicles: [{ year: 2019 }], deals: [] })],
    ["a schemaVersion from a newer app", JSON.stringify({ schemaVersion: 99, vehicles: [], deals: [] })],
  ];

  it.each(broken)("%s falls back to an empty garage", (_name, blob) => {
    const storage = fakeStorage({ [STORAGE_KEY]: blob });
    expect(loadGarage(storage)).toEqual({ garage: emptyGarage(), recovered: true });
  });

  it.each(broken)("%s is copied aside before anything can overwrite it", (_name, blob) => {
    const storage = fakeStorage({ [STORAGE_KEY]: blob });
    loadGarage(storage);
    expect(storage.data.get(BACKUP_KEY)).toBe(blob);
    expect(storage.data.get(STORAGE_KEY)).toBe(blob);
  });

  it("still loads when the backup write fails", () => {
    const storage: KeyValueStore = {
      getItem: () => "{not json",
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => undefined,
    };
    expect(loadGarage(storage)).toEqual({ garage: emptyGarage(), recovered: true });
  });

  it("does not throw when reading storage itself throws", () => {
    const storage: KeyValueStore = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(loadGarage(storage)).toEqual({ garage: emptyGarage(), recovered: false });
  });

  it("can be read back as the raw text that was copied aside", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: "{not json" });
    loadGarage(storage);
    expect(readUnreadableCopy(storage)).toBe("{not json");
  });
});

describe("readUnreadableCopy", () => {
  it("is null when nothing was ever copied aside", () => {
    expect(readUnreadableCopy(fakeStorage())).toBeNull();
  });

  it("is null instead of throwing when storage is blocked", () => {
    const storage: KeyValueStore = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(readUnreadableCopy(storage)).toBeNull();
  });
});

describe("eraseGarage", () => {
  it("removes the garage and the copied-aside data, so a reload starts empty", () => {
    const storage = fakeStorage({ [BACKUP_KEY]: "{old" });
    saveGarage(garageWithCar, storage);
    expect(eraseGarage(storage)).toBe(true);
    expect(storage.data.size).toBe(0);
    expect(loadGarage(storage)).toEqual({ garage: emptyGarage(), recovered: false });
  });

  it("reports failure instead of throwing when storage refuses", () => {
    const storage: KeyValueStore = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    expect(eraseGarage(storage)).toBe(false);
  });
});

describe("runMigrations", () => {
  const migrations = {
    1: (blob: unknown) => ({ ...(blob as object), schemaVersion: 2, renamed: true }),
    2: (blob: unknown) => ({ ...(blob as object), schemaVersion: 3 }),
  };

  it("leaves a current blob alone", () => {
    const blob = { schemaVersion: 3 };
    expect(runMigrations(blob, migrations, 3)).toBe(blob);
  });

  it("applies each step in order up to the target", () => {
    expect(runMigrations({ schemaVersion: 1 }, migrations, 3)).toEqual({ schemaVersion: 3, renamed: true });
  });

  it("returns null for a version it cannot reach", () => {
    expect(runMigrations({ schemaVersion: 0 }, migrations, 3)).toBeNull();
    expect(runMigrations({ schemaVersion: 4 }, migrations, 3)).toBeNull();
    expect(runMigrations({ schemaVersion: "1" }, migrations, 3)).toBeNull();
    expect(runMigrations(null, migrations, 3)).toBeNull();
  });

  it("returns null when a step fails to advance the version", () => {
    expect(runMigrations({ schemaVersion: 1 }, { 1: (b: unknown) => b }, 2)).toBeNull();
  });
});
