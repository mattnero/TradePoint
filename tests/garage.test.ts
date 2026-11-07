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
import { cents } from "../src/model/money";
import type { SavedDeal } from "../src/model/savedDeal";
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

const deal = (id: string, label: string, payment: number): SavedDeal => ({
  id,
  label,
  savedAt: "2026-11-07",
  quote: {
    payment: cents(payment),
    frequency: "monthly",
    termMonths: 84,
    apr: 0.0799,
    downPayment: cents(300000),
    tradeAllowance: cents(800000),
    tradePayoff: cents(500000),
    province: "ON",
    advertisedPrice: cents(2999500),
  },
  benchmarks: { preApprovalApr: 0.0599 },
  vehicleId: "v1",
});

const threeDeals = [deal("d1", "Honda", 45000), deal("d2", "Toyota", 43900), deal("d3", "Kia", 41250)];

describe("emptyGarage", () => {
  it("is version 3 with nothing in it", () => {
    expect(emptyGarage()).toEqual({ schemaVersion: 3, vehicles: [], deals: [] });
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
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

  it("brings three saved deals back after a reload, in order", () => {
    const storage = fakeStorage();
    saveGarage({ ...garageWithCar, deals: threeDeals }, storage);
    expect(loadGarage(storage)).toEqual({ garage: { ...garageWithCar, deals: threeDeals }, recovered: false });
  });

  it("keeps the selected vehicle when it is one of the garage's vehicles", () => {
    const storage = fakeStorage();
    const selected = { ...garageWithCar, selectedVehicleId: "v1" };
    saveGarage(selected, storage);
    expect(loadGarage(storage).garage).toEqual(selected);
  });

  it.each([
    ["an id no vehicle has", "v-gone"],
    ["something that is not text", 5],
  ])("forgets a selected vehicle that is %s instead of failing", (_name, selectedVehicleId) => {
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ ...garageWithCar, selectedVehicleId }),
    });
    expect(loadGarage(storage)).toEqual({ garage: garageWithCar, recovered: false });
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
    ["a version 2 garage with a non-array deals", JSON.stringify({ schemaVersion: 2, vehicles: [], deals: 4 })],
    ["a saved deal it can't read", JSON.stringify({ schemaVersion: 3, vehicles: [], deals: [{ anything: 1 }] })],
    [
      "one bad deal among good ones",
      JSON.stringify({ schemaVersion: 3, vehicles: [], deals: [threeDeals[0], { ...threeDeals[1], label: "" }] }),
    ],
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

describe("upgrading a version 1 garage", () => {
  const v1Vehicle = {
    id: "v-santa-fe",
    year: 2019,
    make: "Hyundai",
    model: "Santa Fe",
    trim: "Preferred",
    segment: "mid-suv",
    inServiceDate: "2019-03-15",
    inServiceEstimated: false,
    purchase: { price: 3299500, date: "2019-03-15" },
    odometer: [
      { date: "2026-10-01", km: 117200 },
      { date: "2026-11-02", km: 118000 },
    ],
    loan: { kind: "snapshot", balance: 1510000, apr: 0.0449, monthsRemaining: 30, asOf: "2026-11-02" },
    benchmarks: { preApprovalApr: 0.0599, outsideTradeOffer: 920000 },
    valueAnchors: [{ date: "2026-11-02", value: 1420000, source: "comps" }],
  };
  const { benchmarks: _, ...untouched } = v1Vehicle;
  const v1Blob = (vehicles: unknown[], deals: unknown[] = []) =>
    JSON.stringify({ schemaVersion: 1, vehicles, deals });

  it("keeps every vehicle field and moves the benchmarks into prep", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v1Blob([v1Vehicle]) });
    const { garage, recovered } = loadGarage(storage);
    expect(recovered).toBe(false);
    expect(garage.vehicles).toEqual([
      {
        ...untouched,
        prep: {
          preApprovalApr: 0.0599,
          tradeOffers: [{ source: "Outside offer", amount: 920000 }],
        },
      },
    ]);
  });

  it("keeps a vehicle that never had benchmarks exactly as it was", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v1Blob([untouched]) });
    expect(loadGarage(storage).garage.vehicles).toEqual([untouched]);
  });

  it("moves a lone pre-approval or a lone offer", () => {
    const rateOnly = { ...untouched, benchmarks: { preApprovalApr: 0 } };
    const offerOnly = { ...untouched, id: "v2", benchmarks: { outsideTradeOffer: 0 } };
    const storage = fakeStorage({ [STORAGE_KEY]: v1Blob([rateOnly, offerOnly]) });
    const [a, b] = loadGarage(storage).garage.vehicles;
    expect(a!.prep).toEqual({ preApprovalApr: 0 });
    expect(b!.prep).toEqual({ tradeOffers: [{ source: "Outside offer", amount: 0 }] });
  });

  it("drops empty benchmarks instead of leaving an empty prep", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v1Blob([{ ...untouched, benchmarks: {} }]) });
    expect(loadGarage(storage).garage.vehicles).toEqual([untouched]);
  });

  it("drops placeholder deals, which no version before 3 ever wrote, and keeps the vehicle", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v1Blob([untouched], [{ anything: 1 }]) });
    expect(loadGarage(storage)).toEqual({
      garage: { schemaVersion: 3, vehicles: [untouched], deals: [] },
      recovered: false,
    });
  });

  it("leaves the stored v1 text alone until the next save, then writes version 3", () => {
    const raw = v1Blob([v1Vehicle]);
    const storage = fakeStorage({ [STORAGE_KEY]: raw });
    const { garage } = loadGarage(storage);
    expect(storage.data.get(STORAGE_KEY)).toBe(raw);
    saveGarage(garage, storage);
    const saved = JSON.parse(storage.data.get(STORAGE_KEY)!);
    expect(saved.schemaVersion).toBe(3);
    expect(saved.vehicles[0]).not.toHaveProperty("benchmarks");
    expect(loadGarage(storage).garage).toEqual(garage);
  });

  it.each([
    ["an unreadable offer", { ...v1Vehicle, benchmarks: { outsideTradeOffer: "lots" } }],
    ["benchmarks that are not an object", { ...v1Vehicle, benchmarks: 5 }],
    ["a vehicle that is not an object", 7],
  ])("treats %s as unreadable and keeps a copy", (_name, vehicle) => {
    const raw = v1Blob([vehicle]);
    const storage = fakeStorage({ [STORAGE_KEY]: raw });
    expect(loadGarage(storage)).toEqual({ garage: emptyGarage(), recovered: true });
    expect(storage.data.get(BACKUP_KEY)).toBe(raw);
  });
});

describe("upgrading a version 2 garage", () => {
  const v2Vehicle = {
    id: "v-santa-fe",
    year: 2019,
    make: "Hyundai",
    model: "Santa Fe",
    trim: "Preferred",
    segment: "mid-suv",
    inServiceDate: "2019-03-15",
    inServiceEstimated: false,
    purchase: { price: 3299500, date: "2019-03-15" },
    odometer: [
      { date: "2026-10-01", km: 117200 },
      { date: "2026-11-02", km: 118000 },
    ],
    loan: { kind: "snapshot", balance: 500000, apr: 0.0449, monthsRemaining: 12, asOf: "2026-11-02" },
    prep: {
      preApprovalApr: 0.0599,
      tradeOffers: [
        { source: "Outside offer", amount: 920000 },
        { source: "Canada Drives", amount: 875000, date: "2026-11-04" },
      ],
      walkAway: 3300000,
      rulesReadOn: "2026-11-04",
    },
    valueAnchors: [{ date: "2026-11-02", value: 1420000, source: "comps" }],
  };
  const bareVehicle = {
    id: "v-van",
    year: 2024,
    make: "Kia",
    model: "Carnival",
    odometer: [{ date: "2026-11-05", km: 21000 }],
  };
  const v2Raw = JSON.stringify({ schemaVersion: 2, vehicles: [v2Vehicle, bareVehicle], deals: [] });

  it("keeps every vehicle exactly as it was", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v2Raw });
    expect(loadGarage(storage)).toEqual({
      garage: { schemaVersion: 3, vehicles: [v2Vehicle, bareVehicle], deals: [] },
      recovered: false,
    });
  });

  it("does not pick a selected vehicle; the first one stays the one shown", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v2Raw });
    expect(loadGarage(storage).garage).not.toHaveProperty("selectedVehicleId");
  });

  it("drops placeholder deals and keeps the vehicles", () => {
    const raw = JSON.stringify({ schemaVersion: 2, vehicles: [v2Vehicle], deals: [{ anything: 1 }, 7] });
    const storage = fakeStorage({ [STORAGE_KEY]: raw });
    expect(loadGarage(storage)).toEqual({
      garage: { schemaVersion: 3, vehicles: [v2Vehicle], deals: [] },
      recovered: false,
    });
  });

  it("leaves the stored v2 text alone until the next save, then writes version 3 that reads back the same", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v2Raw });
    const { garage } = loadGarage(storage);
    expect(storage.data.get(STORAGE_KEY)).toBe(v2Raw);
    expect(saveGarage(garage, storage)).toBe(true);
    expect(JSON.parse(storage.data.get(STORAGE_KEY)!).schemaVersion).toBe(3);
    expect(loadGarage(storage)).toEqual({ garage, recovered: false });
  });

  it("then takes three saved deals and keeps them and the vehicles through a reload", () => {
    const storage = fakeStorage({ [STORAGE_KEY]: v2Raw });
    const { garage } = loadGarage(storage);
    saveGarage({ ...garage, deals: threeDeals }, storage);
    const reloaded = loadGarage(storage).garage;
    expect(reloaded.vehicles).toEqual([v2Vehicle, bareVehicle]);
    expect(reloaded.deals).toEqual(threeDeals);
  });

  it("gives a version 1 garage the same result as upgrading it to 2 and then to 3", () => {
    const { prep: _, ...noPrep } = v2Vehicle;
    const v1Vehicle = { ...noPrep, benchmarks: { preApprovalApr: 0.0599, outsideTradeOffer: 920000 } };
    const v1Raw = JSON.stringify({ schemaVersion: 1, vehicles: [v1Vehicle, bareVehicle], deals: [] });
    const fromV1 = loadGarage(fakeStorage({ [STORAGE_KEY]: v1Raw }));
    expect(fromV1).toEqual({
      garage: {
        schemaVersion: 3,
        vehicles: [
          { ...noPrep, prep: { preApprovalApr: 0.0599, tradeOffers: [{ source: "Outside offer", amount: 920000 }] } },
          bareVehicle,
        ],
        deals: [],
      },
      recovered: false,
    });
  });

  it.each([
    ["an unreadable prep", { ...v2Vehicle, prep: { walkAway: "lots" } }],
    ["three trade offers", { ...v2Vehicle, prep: { tradeOffers: [1, 2, 3].map((n) => ({ source: "x", amount: n })) } }],
    ["a vehicle with no odometer", { ...v2Vehicle, odometer: [] }],
  ])("treats a v2 garage with %s as unreadable and keeps a copy", (_name, vehicle) => {
    const raw = JSON.stringify({ schemaVersion: 2, vehicles: [vehicle], deals: [] });
    const storage = fakeStorage({ [STORAGE_KEY]: raw });
    expect(loadGarage(storage)).toEqual({ garage: emptyGarage(), recovered: true });
    expect(storage.data.get(BACKUP_KEY)).toBe(raw);
    expect(storage.data.get(STORAGE_KEY)).toBe(raw);
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
