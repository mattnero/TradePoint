import { cents } from "../src/model/money";
import type { ValueBasis } from "../src/model/value";
import { equityPill, valueBasisLine } from "../src/model/valueCopy";

const basis = (overrides: Partial<ValueBasis> = {}): ValueBasis => ({
  source: "purchase",
  date: "2023-03-15",
  value: cents(3299500),
  segment: "mid-suv",
  ageEstimated: false,
  ...overrides,
});

describe("valueBasisLine", () => {
  it("names the curve and the purchase it is anchored to", () => {
    expect(valueBasisLine(basis())).toBe("Mid-size SUV average curve, anchored to what you paid in Mar 2023.");
  });

  it.each([
    ["comps", "Mid-size SUV average curve, re-anchored to your comps from Oct 2026 (asking prices)."],
    ["offer", "Mid-size SUV average curve, re-anchored to the outside offer from Oct 2026."],
    ["manual", "Mid-size SUV average curve, re-anchored to the value you entered for Oct 2026."],
  ] as const)("names a %s anchor", (source, line) => {
    expect(valueBasisLine(basis({ source, date: "2026-10-28" }))).toBe(line);
  });

  it("says when the car's age is a guess", () => {
    expect(valueBasisLine(basis({ ageEstimated: true }))).toBe(
      "Mid-size SUV average curve, anchored to what you paid in Mar 2023. The car's age is estimated.",
    );
  });
});

describe("equityPill", () => {
  const today = { month: 0, date: "2026-11-02", value: cents(1417422), balance: cents(1510000), equity: cents(-92578) };
  const crossing = { month: 3, date: "2027-02-02", value: cents(1370817), balance: cents(1366499), equity: cents(4318) };

  it("shows the shortfall and how long until it turns", () => {
    expect(equityPill({ points: [today], crossover: crossing }, "2026-11-02")).toEqual({
      text: "−$926 · positive in ~3 months",
      tone: "bad",
    });
  });

  it("says within a month when the crossing is days away", () => {
    const soon = { ...crossing, date: "2026-11-20" };
    expect(equityPill({ points: [today], crossover: soon }, "2026-11-02").text).toBe("−$926 · positive within a month");
  });

  it("says one month, singular", () => {
    const next = { ...crossing, date: "2026-12-02" };
    expect(equityPill({ points: [today], crossover: next }, "2026-11-02").text).toBe("−$926 · positive in ~1 month");
  });

  it("shows only the shortfall when it stays under water", () => {
    expect(equityPill({ points: [today], crossover: null }, "2026-11-02")).toEqual({ text: "−$926", tone: "bad" });
  });

  it("shows positive equity as a gain", () => {
    const up = { ...today, equity: cents(150000) };
    expect(equityPill({ points: [up], crossover: up }, "2026-11-02")).toEqual({ text: "+$1,500", tone: "good" });
  });
});
