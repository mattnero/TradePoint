import { DAYS_PER_MONTH, daysBetween } from "../src/model/dates";
import { cents } from "../src/model/money";
import { segmentFor } from "../src/model/segments";
import { retention, valueCurve } from "../src/model/value";
import type { Vehicle } from "../src/model/vehicle";

const compact = segmentFor("compact-car");

const civic = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: "c1",
  year: 2024,
  make: "Honda",
  model: "Civic",
  segment: "compact-car",
  inServiceDate: "2024-03-01",
  purchase: { price: cents(3000000), date: "2024-03-01" },
  odometer: [{ date: "2024-03-01", km: 10 }],
  ...overrides,
});

describe("retention", () => {
  it("is whole at age zero and before it", () => {
    expect(retention(compact, 0)).toBe(1);
    expect(retention(compact, -5)).toBe(1);
  });

  it("loses the first-year drop over the first 12 months", () => {
    expect(retention(compact, 12)).toBeCloseTo(0.8, 12);
    expect(retention(compact, 6)).toBeCloseTo(Math.sqrt(0.8), 12);
  });

  it("then loses the monthly rate each month", () => {
    expect(retention(compact, 24)).toBeCloseTo(0.8 * Math.pow(0.989, 12), 12);
  });

  it("flattens to the late rate after the flattening month", () => {
    const atFlat = 0.8 * Math.pow(0.989, 60);
    expect(retention(compact, 72)).toBeCloseTo(atFlat, 12);
    expect(retention(compact, 84)).toBeCloseTo(atFlat * Math.pow(0.994, 12), 12);
  });
});

describe("valueCurve with no value anchors", () => {
  it("follows the segment curve from the purchase price", () => {
    const curve = valueCurve(civic())!;
    expect(curve.at("2024-03-01")).toBe(3000000);
    expect(curve.at("2025-03-01")).toBe(2400367);
  });

  it("starts from the car's age at purchase when bought used", () => {
    const used = civic({ inServiceDate: "2020-03-01", purchase: { price: cents(2000000), date: "2024-03-01" } });
    const curve = valueCurve(used)!;
    const age = (date: string) => daysBetween("2020-03-01", date) / DAYS_PER_MONTH;
    const expected = (2000000 * retention(compact, age("2025-03-01"))) / retention(compact, age("2024-03-01"));
    expect(curve.at("2024-03-01")).toBe(2000000);
    expect(curve.at("2025-03-01")).toBe(Math.round(expected));
    expect(curve.at("2025-03-01")).toBeCloseTo(2000000 * Math.pow(0.989, 12), -3);
  });

  it("says where its number comes from", () => {
    expect(valueCurve(civic())!.basis).toEqual({
      source: "purchase",
      date: "2024-03-01",
      value: 3000000,
      segment: "compact-car",
      ageEstimated: false,
    });
  });
});

describe("valueCurve with value anchors", () => {
  const anchored = civic({
    valueAnchors: [{ date: "2026-06-15", value: cents(2200000), source: "comps" }],
  });

  it("passes through the anchor exactly", () => {
    expect(valueCurve(anchored)!.at("2026-06-15")).toBe(2200000);
  });

  it("keeps the segment curve's shape after the anchor", () => {
    const curve = valueCurve(anchored)!;
    const plain = valueCurve(civic())!;
    const ratio = curve.at("2027-06-15") / curve.at("2026-06-15");
    const plainRatio = plain.at("2027-06-15") / plain.at("2026-06-15");
    expect(ratio).toBeCloseTo(plainRatio, 4);
  });

  it("lets the latest anchor win for dates after it", () => {
    const twice = civic({
      valueAnchors: [
        { date: "2026-12-01", value: cents(1800000), source: "offer" },
        { date: "2026-06-15", value: cents(2200000), source: "comps" },
      ],
    });
    const curve = valueCurve(twice)!;
    expect(curve.at("2026-12-01")).toBe(1800000);
    expect(curve.at("2026-06-15")).toBe(2200000);
    expect(curve.basis).toMatchObject({ source: "offer", date: "2026-12-01", value: 1800000 });
  });

  it("uses each anchor for the stretch after it, not a later one", () => {
    const twice = civic({
      valueAnchors: [
        { date: "2026-06-15", value: cents(2200000), source: "comps" },
        { date: "2026-12-01", value: cents(1800000), source: "offer" },
      ],
    });
    const fromJune = valueCurve(civic({ valueAnchors: [twice.valueAnchors![0]!] }))!;
    expect(valueCurve(twice)!.at("2026-09-01")).toBe(fromJune.at("2026-09-01"));
  });

  it("prefers an anchor over the purchase price on the same day", () => {
    const sameDay = civic({ valueAnchors: [{ date: "2024-03-01", value: cents(2800000), source: "manual" }] });
    expect(valueCurve(sameDay)!.at("2024-03-01")).toBe(2800000);
  });

  it("works from an anchor alone, with no purchase price", () => {
    const { purchase: _, ...noPurchase } = anchored;
    expect(valueCurve(noPurchase)!.at("2026-06-15")).toBe(2200000);
  });

  it("projects backwards from the earliest anchor for dates before it", () => {
    const { purchase: _, ...noPurchase } = anchored;
    expect(valueCurve(noPurchase)!.at("2026-01-15")).toBeGreaterThan(2200000);
  });
});

describe("valueCurve gaps", () => {
  it("has no curve without a vehicle type", () => {
    const { segment: _, ...noSegment } = civic();
    expect(valueCurve(noSegment)).toBeNull();
  });

  it("has no curve without a purchase price or a value anchor", () => {
    const { purchase: _, ...nothing } = civic();
    expect(valueCurve(nothing)).toBeNull();
  });

  it("estimates the age from the model year when the in-service date is missing, and says so", () => {
    const { inServiceDate: _, ...noDate } = civic({ purchase: { price: cents(3000000), date: "2024-07-01" } });
    const curve = valueCurve(noDate)!;
    expect(curve.basis.ageEstimated).toBe(true);
    expect(curve.at("2025-07-01")).toBe(2400367);
  });

  it("flags an estimated in-service date as an estimated age", () => {
    expect(valueCurve(civic({ inServiceEstimated: true }))!.basis.ageEstimated).toBe(true);
  });
});
