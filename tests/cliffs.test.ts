import { cliffsFor, type CliffReport } from "../src/model/cliffs";
import { wholeMonthsBetween, type IsoDate } from "../src/model/dates";
import type { Loan } from "../src/model/loan";
import { cents, fromDollars, type Cents } from "../src/model/money";
import type { Vehicle } from "../src/model/vehicle";

const AS_OF = "2026-11-02";

function decliningFrom(dollars: number, anchoredOn: IsoDate, monthlyRate: number) {
  return (date: IsoDate): Cents =>
    fromDollars(dollars * Math.pow(1 - monthlyRate, wholeMonthsBetween(anchoredOn, date)));
}

const mockupLoan: Loan = { kind: "snapshot", balance: cents(1510000), apr: 0.0449, monthsRemaining: 30, asOf: AS_OF };

const mockupSantaFe: Vehicle = {
  id: "mockup",
  year: 2022,
  make: "Hyundai",
  model: "Santa Fe",
  trim: "Preferred AWD",
  segment: "mid-suv",
  inServiceDate: "2022-06-15",
  odometer: [
    { date: "2026-05-02", km: 77800 },
    { date: "2026-11-02", km: 86800 },
  ],
  loan: mockupLoan,
};

const mockupValue = decliningFrom(14200, "2026-10-28", 0.011);

const kinds = (r: CliffReport) => r.upcoming.map((c) => c.kind);

describe("the mockup's 2022 Santa Fe", () => {
  const report = cliffsFor({ vehicle: mockupSantaFe, asOf: AS_OF, valueAt: mockupValue });

  it("yields the mockup's four cliffs in mockup order, with the maintenance window placed by date", () => {
    expect(kinds(report)).toEqual(["equity", "maintenance", "warranty", "odometer", "season"]);
    const mockupFour = kinds(report).filter((k) => k !== "maintenance");
    expect(mockupFour).toEqual(["equity", "warranty", "odometer", "season"]);
  });

  it("crosses into positive equity in February 2027 on a 1.1%/month curve", () => {
    expect(report.upcoming[0]).toEqual({
      kind: "equity",
      date: "2027-02-02",
      value: cents(1373654),
      balance: cents(1366499),
    });
  });

  it("ends comprehensive and powertrain together on the in-service anniversary", () => {
    expect(report.upcoming.find((c) => c.kind === "warranty")).toEqual({
      kind: "warranty",
      date: "2027-06-15",
      coverages: ["comprehensive", "powertrain"],
      limitedBy: "date",
      years: 5,
      km: 100000,
    });
  });

  it("reaches 100,000 km at 1,500 km a month at the end of July 2027", () => {
    expect(report.upcoming.find((c) => c.kind === "odometer")).toEqual({
      kind: "odometer",
      date: "2027-07-30",
      km: 100000,
    });
  });

  it("flags the transmission fluid service at 96,000 km with its typical cost", () => {
    expect(report.upcoming.find((c) => c.kind === "maintenance")).toEqual({
      kind: "maintenance",
      date: "2027-05-10",
      km: 96000,
      item: "Transmission fluid service",
      typicalCost: cents(35000),
    });
  });

  it("puts the next AWD season at September to December 2027, and notes the current one", () => {
    expect(report.upcoming.find((c) => c.kind === "season")).toEqual({
      kind: "season",
      date: "2027-09-01",
      endDate: "2027-12-31",
      reason: "AWD demand peaks",
    });
    expect(report.activeSeason).toEqual({ endDate: "2026-12-31", reason: "AWD demand peaks" });
  });

  it("has nothing past and needs nothing", () => {
    expect(report.past).toEqual([]);
    expect(report.needs).toEqual([]);
  });
});

describe("Matt's 2019 Santa Fe: warranty already gone", () => {
  const santaFe2019: Vehicle = {
    id: "matt",
    year: 2019,
    make: "Hyundai",
    model: "Santa Fe",
    segment: "mid-suv",
    inServiceDate: "2019-04-01",
    odometer: [
      { date: "2026-05-02", km: 112000 },
      { date: "2026-11-02", km: 118000 },
    ],
  };
  const report = cliffsFor({ vehicle: santaFe2019, asOf: AS_OF });

  it("invents no warranty cliff", () => {
    expect(kinds(report)).not.toContain("warranty");
  });

  it("reports the warranty as past, ended by date in April 2024", () => {
    expect(report.past).toContainEqual({
      kind: "warranty",
      date: "2024-04-01",
      coverages: ["comprehensive", "powertrain"],
      limitedBy: "date",
    });
  });

  it("reports 100,000 km as past and 150,000 km as next", () => {
    expect(report.past).toContainEqual({ kind: "odometer", km: 100000 });
    expect(report.upcoming.find((c) => c.kind === "odometer")?.km).toBe(150000);
  });

  it("has no equity cliff and needs no value without a loan", () => {
    expect(kinds(report)).not.toContain("equity");
    expect(report.needs).not.toContain("value");
  });

  it("skips the next transmission service when it is beyond the 36-month horizon", () => {
    expect(kinds(report)).not.toContain("maintenance");
    const longer = cliffsFor({ vehicle: santaFe2019, asOf: AS_OF, horizonMonths: 120 });
    expect(longer.upcoming.find((c) => c.kind === "maintenance")?.km).toBe(192000);
  });
});

describe("warranty edge cases", () => {
  const base: Vehicle = {
    id: "t",
    year: 2025,
    make: "Toyota",
    model: "RAV4",
    segment: "mid-suv",
    inServiceDate: "2025-01-15",
    odometer: [
      { date: "2026-05-02", km: 40000 },
      { date: "2026-11-02", km: 58000 },
    ],
  };

  it("ends comprehensive by km before its date, and keeps powertrain separate", () => {
    const report = cliffsFor({ vehicle: base, asOf: AS_OF });
    const warranty = report.upcoming.filter((c) => c.kind === "warranty");
    expect(warranty).toEqual([
      { kind: "warranty", date: "2026-11-23", coverages: ["comprehensive"], limitedBy: "km", years: 3, km: 60000 },
      { kind: "warranty", date: "2028-01-06", coverages: ["powertrain"], limitedBy: "km", years: 5, km: 100000 },
    ]);
  });

  it("names the date, not the km, when a single reading is over the limit and the date has also passed", () => {
    const old = { ...base, inServiceDate: "2019-04-01", odometer: [{ date: "2026-11-02", km: 118000 }] };
    const report = cliffsFor({ vehicle: old, asOf: AS_OF });
    expect(report.past.filter((p) => p.kind === "warranty")).toEqual([
      { kind: "warranty", date: "2022-04-01", coverages: ["comprehensive"], limitedBy: "date" },
      { kind: "warranty", date: "2024-04-01", coverages: ["powertrain"], limitedBy: "date" },
    ]);
  });

  it("reports a km-limited warranty as past when the odometer is already over the limit", () => {
    const over = { ...base, odometer: [{ date: "2026-11-02", km: 61000 }] };
    const report = cliffsFor({ vehicle: over, asOf: AS_OF });
    expect(report.past).toContainEqual({ kind: "warranty", date: null, coverages: ["comprehensive"], limitedBy: "km" });
  });

  it("uses the date limit, and says so, when the driving rate is unknown", () => {
    const single = { ...base, odometer: [{ date: "2026-11-02", km: 20000 }] };
    const report = cliffsFor({ vehicle: single, asOf: AS_OF });
    expect(report.upcoming.filter((c) => c.kind === "warranty")).toEqual([
      { kind: "warranty", date: "2028-01-15", coverages: ["comprehensive"], limitedBy: "date-or-km", years: 3, km: 60000 },
    ]);
    expect(report.needs).toContain("odometerRate");
  });

  it("never ends an unlimited-distance warranty by km", () => {
    const mazda: Vehicle = { ...base, make: "Mazda", model: "CX-5", odometer: [{ date: "2026-05-02", km: 100000 }, { date: "2026-11-02", km: 150000 }] };
    const report = cliffsFor({ vehicle: mazda, asOf: AS_OF });
    expect(report.upcoming.find((c) => c.kind === "warranty")).toEqual({
      kind: "warranty",
      date: "2028-01-15",
      coverages: ["comprehensive"],
      limitedBy: "date",
      years: 3,
      km: null,
    });
  });

  it("asks for the in-service date instead of guessing one", () => {
    const { inServiceDate: _, ...noDate } = base;
    const report = cliffsFor({ vehicle: noDate, asOf: AS_OF });
    expect(kinds(report)).not.toContain("warranty");
    expect(report.needs).toContain("inServiceDate");
  });

  it("says when it has no warranty terms for the make", () => {
    const report = cliffsFor({ vehicle: { ...base, make: "Lada" }, asOf: AS_OF });
    expect(kinds(report)).not.toContain("warranty");
    expect(report.needs).toContain("warrantyTerms");
  });
});

describe("equity edge cases", () => {
  it("is past, not a cliff, when the car is already worth more than the loan", () => {
    const report = cliffsFor({ vehicle: mockupSantaFe, asOf: AS_OF, valueAt: () => cents(2000000) });
    expect(kinds(report)).not.toContain("equity");
    expect(report.past).toContainEqual({ kind: "equity", value: cents(2000000), balance: cents(1510000) });
  });

  it("asks for a value when there is a loan but no value model", () => {
    const report = cliffsFor({ vehicle: mockupSantaFe, asOf: AS_OF });
    expect(kinds(report)).not.toContain("equity");
    expect(report.needs).toContain("value");
  });

  it("crosses no later than the month the loan is paid off", () => {
    const report = cliffsFor({ vehicle: mockupSantaFe, asOf: AS_OF, valueAt: () => cents(100) });
    expect(report.upcoming.find((c) => c.kind === "equity")).toMatchObject({ date: "2029-05-02", balance: 0 });
  });

  it("leaves the cliff out when the crossover is past the horizon", () => {
    const report = cliffsFor({ vehicle: mockupSantaFe, asOf: AS_OF, valueAt: () => cents(100), horizonMonths: 12 });
    expect(kinds(report)).not.toContain("equity");
  });
});

describe("season windows that wrap the new year", () => {
  it("handles a November to February window", async () => {
    const { segmentFor } = await import("../src/model/segments");
    const original = segmentFor("minivan").season;
    segmentFor("minivan").season = { startMonth: 11, endMonth: 2, reason: "Winter demand" };
    try {
      const van = { ...mockupSantaFe, segment: "minivan" as const };
      const january = cliffsFor({ vehicle: van, asOf: "2027-01-10", valueAt: mockupValue });
      expect(january.activeSeason).toEqual({ endDate: "2027-02-28", reason: "Winter demand" });
      expect(january.upcoming.find((c) => c.kind === "season")).toMatchObject({ date: "2027-11-01", endDate: "2028-02-29" });
      const november = cliffsFor({ vehicle: van, asOf: "2026-11-02", valueAt: mockupValue });
      expect(november.activeSeason).toEqual({ endDate: "2027-02-28", reason: "Winter demand" });
    } finally {
      segmentFor("minivan").season = original;
    }
  });
});

describe("odometer and maintenance edge cases", () => {
  it("lists the next threshold without a date when the rate is unknown", () => {
    const one: Vehicle = { ...mockupSantaFe, odometer: [{ date: AS_OF, km: 86800 }] };
    const report = cliffsFor({ vehicle: one, asOf: AS_OF, valueAt: mockupValue });
    expect(report.upcoming.find((c) => c.kind === "odometer")).toEqual({ kind: "odometer", date: null, km: 100000 });
    expect(report.upcoming.at(-1)?.date).toBeNull();
  });

  it("treats a threshold the projection has already passed as past", () => {
    const stale: Vehicle = {
      ...mockupSantaFe,
      odometer: [
        { date: "2025-05-02", km: 89000 },
        { date: "2025-11-02", km: 98000 },
      ],
    };
    const report = cliffsFor({ vehicle: stale, asOf: AS_OF, valueAt: mockupValue });
    expect(report.past).toContainEqual({ kind: "odometer", km: 100000 });
    expect(report.upcoming.find((c) => c.kind === "odometer")?.km).toBe(150000);
  });

  it("has no thresholds left past 200,000 km", () => {
    const old: Vehicle = { ...mockupSantaFe, odometer: [{ date: "2026-05-02", km: 205000 }, { date: AS_OF, km: 210000 }] };
    const report = cliffsFor({ vehicle: old, asOf: AS_OF, valueAt: mockupValue });
    expect(kinds(report)).not.toContain("odometer");
    expect(report.past).toContainEqual({ kind: "odometer", km: 200000 });
  });

  it("does not move when the car is parked", () => {
    const parked: Vehicle = { ...mockupSantaFe, odometer: [{ date: "2026-05-02", km: 86800 }, { date: AS_OF, km: 86800 }] };
    const report = cliffsFor({ vehicle: parked, asOf: AS_OF, valueAt: mockupValue });
    expect(report.upcoming.find((c) => c.kind === "odometer")).toEqual({ kind: "odometer", date: null, km: 100000 });
    expect(report.needs).not.toContain("odometerRate");
    expect(report.upcoming.find((c) => c.kind === "warranty")).toMatchObject({ date: "2027-06-15", limitedBy: "date" });
  });

  it("has no season or maintenance and asks for a segment when none is set", () => {
    const { segment: _, ...noSegment } = mockupSantaFe;
    const report = cliffsFor({ vehicle: noSegment, asOf: AS_OF, valueAt: mockupValue });
    expect(kinds(report)).not.toContain("season");
    expect(kinds(report)).not.toContain("maintenance");
    expect(report.activeSeason).toBeNull();
    expect(report.needs).toContain("segment");
  });

  it("has no season for a segment without one, and no current season outside the window", () => {
    const van = cliffsFor({ vehicle: { ...mockupSantaFe, segment: "minivan" }, asOf: AS_OF, valueAt: mockupValue });
    expect(kinds(van)).not.toContain("season");
    const spring = cliffsFor({ vehicle: mockupSantaFe, asOf: "2027-03-10", valueAt: mockupValue });
    expect(spring.activeSeason).toBeNull();
    expect(spring.upcoming.find((c) => c.kind === "season")?.date).toBe("2027-09-01");
  });
});
