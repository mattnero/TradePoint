import { warrantyFor } from "../src/model/warranty";

describe("warrantyFor: the mockup's 2022 Santa Fe", () => {
  const w = warrantyFor("Hyundai", "2022-06-15", 86800, "2026-11-02");

  it("knows Hyundai Canada's 5 yr / 100,000 km terms", () => {
    expect(w?.make).toBe("Hyundai");
    expect(w?.powertrain.years).toBe(5);
    expect(w?.powertrain.km).toBe(100000);
  });

  it("powertrain runs to June 2027 by date with 13,200 km left", () => {
    expect(w?.powertrain).toMatchObject({ endsOn: "2027-06-15", kmRemaining: 13200, expired: null });
  });

  it("comprehensive is still active too", () => {
    expect(w?.comprehensive.expired).toBeNull();
  });
});

describe("warrantyFor: Matt's 2019 Santa Fe", () => {
  it("is expired by date even before 100,000 km", () => {
    const w = warrantyFor("Hyundai", "2019-04-01", 90000, "2026-11-02");
    expect(w?.comprehensive).toMatchObject({ endsOn: "2024-04-01", expired: "date" });
    expect(w?.powertrain).toMatchObject({ endsOn: "2024-04-01", expired: "date", kmRemaining: 10000 });
  });

  it("reports km when the km limit was the one that ran out", () => {
    const w = warrantyFor("Hyundai", "2023-04-01", 118000, "2026-11-02");
    expect(w?.powertrain).toMatchObject({ expired: "km", kmRemaining: 0 });
  });

  it("reports date when both have run out, because the date is the one the owner can't argue with", () => {
    const w = warrantyFor("Hyundai", "2019-04-01", 118000, "2026-11-02");
    expect(w?.powertrain.expired).toBe("date");
  });
});

describe("warrantyFor: boundaries", () => {
  it("ends on the anniversary itself", () => {
    expect(warrantyFor("Hyundai", "2021-06-15", 1, "2026-06-14")?.powertrain.expired).toBeNull();
    expect(warrantyFor("Hyundai", "2021-06-15", 1, "2026-06-15")?.powertrain.expired).toBe("date");
  });

  it("ends at exactly the km limit", () => {
    expect(warrantyFor("Hyundai", "2025-01-01", 99999, "2026-01-01")?.powertrain.expired).toBeNull();
    expect(warrantyFor("Hyundai", "2025-01-01", 100000, "2026-01-01")?.powertrain.expired).toBe("km");
  });

  it("handles a leap-day in-service date", () => {
    expect(warrantyFor("Hyundai", "2024-02-29", 1, "2026-01-01")?.powertrain.endsOn).toBe("2029-02-28");
  });
});

describe("warrantyFor: make lookup", () => {
  it.each(["hyundai", " HYUNDAI ", "Hyundai"])("matches %j regardless of case and spacing", (make) => {
    expect(warrantyFor(make, "2022-06-15", 1, "2026-11-02")?.make).toBe("Hyundai");
  });

  it.each([
    ["Chevy", "Chevrolet"],
    ["VW", "Volkswagen"],
  ])("knows %s means %s", (alias, make) => {
    expect(warrantyFor(alias, "2022-06-15", 1, "2026-11-02")?.make).toBe(make);
  });

  it("returns null for a make it has no data for, rather than guessing", () => {
    expect(warrantyFor("Lada", "2022-06-15", 1, "2026-11-02")).toBeNull();
  });

  it("carries the source and verification date", () => {
    const w = warrantyFor("Hyundai", "2022-06-15", 1, "2026-11-02");
    expect(w?.source).toMatch(/^https:\/\/www\.hyundaicanada\.com\//);
    expect(w?.verifiedOn).toBe("2026-11-02");
  });
});

describe("warrantyFor: unlimited distance (Mazda Canada)", () => {
  const w = warrantyFor("Mazda", "2023-05-01", 250000, "2026-11-02");

  it("never expires by km", () => {
    expect(w?.comprehensive).toMatchObject({ km: null, kmRemaining: null, expired: "date", endsOn: "2026-05-01" });
    expect(w?.powertrain).toMatchObject({ km: null, kmRemaining: null, expired: null, endsOn: "2028-05-01" });
  });
});

describe("warrantyFor: the 3 yr / 60,000 km and 5 yr / 100,000 km pattern (Toyota Canada)", () => {
  it("expires comprehensive by km while powertrain is still running", () => {
    const w = warrantyFor("Toyota", "2025-01-15", 61000, "2026-11-02");
    expect(w?.comprehensive).toMatchObject({ endsOn: "2028-01-15", expired: "km", kmRemaining: 0 });
    expect(w?.powertrain).toMatchObject({ endsOn: "2030-01-15", expired: null, kmRemaining: 39000 });
  });
});
