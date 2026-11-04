import { cents } from "../src/model/money";
import type { ValueBasis } from "../src/model/value";
import { valueBasisLine } from "../src/model/valueCopy";

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
    ["comps", "Mid-size SUV average curve, re-anchored to your comps from Oct 2026."],
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
