import provinces from "../src/data/provinces.json";
import segments from "../src/data/segments.json";
import warranty from "../src/data/warranty.json";
import { isIsoDate } from "../src/model/dates";
import { segmentFor, SEGMENTS } from "../src/model/segments";
import { TAX_RULES, expectedAllIn } from "../src/math/tax";

describe("provinces.json", () => {
  it("drives the Ontario tax rule", () => {
    expect(TAX_RULES.ON).toEqual({ rate: 0.13, tradeInReducesBase: true, licensingEstimate: 150 });
  });

  it("keeps the worked example's expected all-in at $33,004", () => {
    expect(Math.round(expectedAllIn(29995, 8000, "ON"))).toBe(33004);
  });

  it("records a dated source for every fact", () => {
    for (const p of Object.values(provinces)) {
      expect(p.sources.length).toBeGreaterThan(0);
      for (const s of p.sources) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(isIsoDate(s.verifiedOn)).toBe(true);
      }
    }
  });
});

describe("segments.json", () => {
  it("has the six planned segments", () => {
    expect(Object.keys(segments).sort()).toEqual(["compact-car", "ev", "luxury", "mid-suv", "minivan", "pickup"]);
  });

  it.each(Object.entries(segments))("%s is marked rough and has sane rates", (_key, s) => {
    expect(s.rough).toBe(true);
    expect(s.firstYearDrop).toBeGreaterThan(0);
    expect(s.firstYearDrop).toBeLessThan(0.5);
    expect(s.monthlyRate).toBeGreaterThan(0);
    expect(s.monthlyRate).toBeLessThan(0.03);
    expect(s.lateMonthlyRate).toBeLessThan(s.monthlyRate);
    expect(s.flattensAfterMonths).toBeGreaterThan(12);
  });

  it.each(Object.entries(segments))("%s has a valid season and maintenance table", (_key, s) => {
    if (s.season !== null) {
      expect(s.season.startMonth).toBeGreaterThanOrEqual(1);
      expect(s.season.endMonth).toBeLessThanOrEqual(12);
    }
    for (const m of s.maintenance) {
      expect(Number.isSafeInteger(m.km)).toBe(true);
      expect(Number.isSafeInteger(m.typicalCostCents)).toBe(true);
    }
  });

  it("matches the mockup for a mid-size SUV: 1.1% a month, Sep to Dec, transmission fluid at 96k for $350", () => {
    const s = segmentFor("mid-suv");
    expect(s.monthlyRate).toBe(0.011);
    expect(s.season).toEqual({ startMonth: 9, endMonth: 12, reason: "AWD demand peaks" });
    expect(s.maintenance).toEqual([{ item: "Transmission fluid service", km: 96000, typicalCostCents: 35000 }]);
  });

  it("exposes the keys as a typed list", () => {
    expect(SEGMENTS).toContain("minivan");
  });
});

describe("warranty.json", () => {
  const rows = Object.entries(warranty);

  it("has the top 15 makes", () => {
    expect(rows).toHaveLength(15);
  });

  it("contains no placeholder rows", () => {
    expect(JSON.stringify(warranty)).not.toMatch(/placeholder/i);
  });

  it.each(rows)("%s cites a manufacturer Canadian page and a verification date", (_make, row) => {
    expect(row.source).toMatch(/^https:\/\//);
    expect(isIsoDate(row.verifiedOn)).toBe(true);
    expect(row.quote.length).toBeGreaterThan(10);
  });

  it.each(rows)("%s has whole-number terms where comprehensive is no longer than powertrain", (_make, row) => {
    for (const c of [row.comprehensive, row.powertrain]) {
      expect(Number.isInteger(c.years)).toBe(true);
      expect(c.years).toBeGreaterThan(0);
      if (c.km !== null) {
        expect(Number.isSafeInteger(c.km)).toBe(true);
        expect(c.km).toBeGreaterThan(0);
      }
    }
    expect(row.comprehensive.years).toBeLessThanOrEqual(row.powertrain.years);
    if (row.comprehensive.km !== null && row.powertrain.km !== null) {
      expect(row.comprehensive.km).toBeLessThanOrEqual(row.powertrain.km);
    }
  });
});
