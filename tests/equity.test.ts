import { cliffsFor } from "../src/model/cliffs";
import { projectEquity } from "../src/model/equity";
import type { Loan } from "../src/model/loan";
import { cents } from "../src/model/money";
import { valueCurve } from "../src/model/value";
import type { Vehicle } from "../src/model/vehicle";

const AS_OF = "2026-11-02";

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
  loan: { kind: "snapshot", balance: cents(1510000), apr: 0.0449, monthsRemaining: 30, asOf: AS_OF },
  valueAnchors: [{ date: "2026-10-28", value: cents(1420000), source: "comps" }],
};

describe("projectEquity by hand", () => {
  const loan: Loan = { kind: "snapshot", balance: cents(1200000), apr: 0, monthsRemaining: 24, asOf: "2027-01-01" };
  const compact: Vehicle = {
    id: "h1",
    year: 2021,
    make: "Honda",
    model: "Civic",
    segment: "compact-car",
    inServiceDate: "2022-01-01",
    odometer: [{ date: "2027-01-01", km: 60000 }],
    valueAnchors: [{ date: "2027-01-01", value: cents(1000000), source: "manual" }],
  };
  const projection = projectEquity({ loan, valueAt: valueCurve(compact)!.at, asOf: "2027-01-01", months: 12 });

  it("starts at the anchor and the balance, $2,000 under water", () => {
    expect(projection.points[0]).toEqual({
      month: 0,
      date: "2027-01-01",
      value: 1000000,
      balance: 1200000,
      equity: -200000,
    });
  });

  it("is still under water at month 5: $9,466.05 against $9,500 owing", () => {
    expect(projection.points[5]).toMatchObject({ date: "2027-06-01", value: 946605, balance: 950000, equity: -3395 });
  });

  it("crosses at month 6: 0.989^(181 days / 30.4375) of $10,000 is $9,363.41, against $9,000 owing", () => {
    expect(projection.crossover).toEqual({
      month: 6,
      date: "2027-07-01",
      value: 936341,
      balance: 900000,
      equity: 36341,
    });
  });

  it("returns one point per month including month 0", () => {
    expect(projection.points).toHaveLength(13);
    expect(projection.points.map((p) => p.month)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe("the mockup's 2022 Santa Fe on its anchored mid-SUV curve", () => {
  const projection = projectEquity({
    loan: mockupSantaFe.loan!,
    valueAt: valueCurve(mockupSantaFe)!.at,
    asOf: AS_OF,
    months: 36,
  });

  it("is about $926 under water today, five days of decline after the $14,200 comps anchor", () => {
    expect(projection.points[0]).toMatchObject({ value: 1417422, balance: 1510000, equity: -92578 });
  });

  it("crosses positive at month 3, February 2027, by about $44", () => {
    expect(projection.crossover).toEqual({
      month: 3,
      date: "2027-02-02",
      value: 1370817,
      balance: 1366499,
      equity: 4318,
    });
  });

  it("gives the cliff list the same crossover", () => {
    const report = cliffsFor({ vehicle: mockupSantaFe, asOf: AS_OF, valueAt: valueCurve(mockupSantaFe)!.at });
    const { date, value, balance } = projection.crossover!;
    expect(report.upcoming[0]).toEqual({ kind: "equity", date, value, balance });
  });

  it("owes nothing after the 30th payment and keeps the value line going", () => {
    expect(projection.points[30]!.balance).toBe(0);
    expect(projection.points[36]!.equity).toBe(projection.points[36]!.value);
  });
});

describe("projectEquity edges", () => {
  const loan: Loan = { kind: "snapshot", balance: cents(500000), apr: 0.05, monthsRemaining: 12, asOf: AS_OF };

  it("crosses at month 0 when equity is already positive", () => {
    const projection = projectEquity({ loan, valueAt: () => cents(1000000), asOf: AS_OF, months: 12 });
    expect(projection.crossover?.month).toBe(0);
  });

  it("has no crossover when value stays under the balance through the horizon", () => {
    const projection = projectEquity({ loan, valueAt: () => cents(0), asOf: AS_OF, months: 6 });
    expect(projection.crossover).toBeNull();
  });

  it("counts equal value and balance as crossed", () => {
    const projection = projectEquity({ loan, valueAt: () => cents(500000), asOf: AS_OF, months: 1 });
    expect(projection.crossover?.month).toBe(0);
  });
});
