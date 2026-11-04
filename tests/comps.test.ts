import { medianPrice } from "../src/model/comps";
import { cents } from "../src/model/money";

describe("medianPrice", () => {
  it("takes the middle of an odd count", () => {
    expect(medianPrice([1750000, 1590000, 1695000].map(cents))).toBe(1695000);
  });

  it("averages the middle two of an even count", () => {
    expect(medianPrice([1500000, 1600000, 1700000, 1800000].map(cents))).toBe(1650000);
  });

  it("rounds a half cent up", () => {
    expect(medianPrice([1000001, 1000002, 1000010, 1000020].map(cents))).toBe(1000006);
    expect(medianPrice([1, 2, 4, 5].map(cents))).toBe(3);
    expect(medianPrice([1, 2].map(cents))).toBe(2);
  });

  it("does not reorder or change the list it was given", () => {
    const prices = [3, 1, 2].map(cents);
    medianPrice(prices);
    expect(prices).toEqual([3, 1, 2]);
  });

  it("is not pulled by one wild listing", () => {
    expect(medianPrice([1500000, 1600000, 1650000, 1700000, 9900000].map(cents))).toBe(1650000);
  });
});
