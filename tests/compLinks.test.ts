import { autoTraderUrl, cargurusSearchUrl, kmBand, normalizePostalCode, RADIUS_OPTIONS } from "../src/model/compLinks";
import type { Vehicle } from "../src/model/vehicle";

const santaFe: Vehicle = {
  id: "v",
  year: 2019,
  make: "Hyundai",
  model: "Santa Fe",
  trim: "Preferred AWD",
  odometer: [{ date: "2026-11-03", km: 118000 }],
};

describe("normalizePostalCode", () => {
  it.each([
    ["M5V 2T6", "M5V2T6"],
    ["m5v2t6", "M5V2T6"],
    [" k1a-0b1 ", "K1A0B1"],
  ])("accepts %s", (input, out) => {
    expect(normalizePostalCode(input)).toBe(out);
  });

  it.each([["" ], ["12345"], ["M5V 2T"], ["D5V 2T6"], ["M5V 2U6"], ["M5V 2T6 9"]])("rejects %j", (input) => {
    expect(normalizePostalCode(input)).toBeNull();
  });
});

describe("kmBand", () => {
  it("is 20% either side, widened to whole 5,000s", () => {
    expect(kmBand(118000)).toEqual({ from: 90000, to: 145000 });
  });

  it("is at least 15,000 either side for a low-km car, and never below zero", () => {
    expect(kmBand(3000)).toEqual({ from: 0, to: 20000 });
  });
});

describe("autoTraderUrl", () => {
  it("searches the same model year and kilometre band near a postal code", () => {
    expect(autoTraderUrl(santaFe, { postalCode: "M5V 2T6", radiusKm: 100 })).toBe(
      "https://www.autotrader.ca/cars/hyundai/santa-fe/my_2019?kmfrom=90000&kmto=145000&zip=M5V2T6&zipr=100",
    );
  });

  it("searches nationwide without a postal code", () => {
    expect(autoTraderUrl(santaFe, { postalCode: "", radiusKm: 100 })).toBe(
      "https://www.autotrader.ca/cars/hyundai/santa-fe/my_2019?kmfrom=90000&kmto=145000",
    );
  });

  it("ignores a postal code it cannot read rather than sending it", () => {
    expect(autoTraderUrl(santaFe, { postalCode: "nope", radiusKm: 50 })).not.toContain("zip");
  });

  it.each([
    ["Mazda", "CX-5", "mazda/cx-5"],
    ["Toyota", "RAV4", "toyota/rav4"],
    ["Ford", "F-150", "ford/f-150"],
    ["Jeep", "Grand Cherokee", "jeep/grand-cherokee"],
    ["Chevrolet", "Silverado 1500", "chevrolet/silverado-1500"],
    ["Hyundai", "Ioniq 5", "hyundai/ioniq-5"],
    ["Citroën", "C4 Cactus", "citroen/c4-cactus"],
  ])("builds the path for %s %s", (make, model, path) => {
    const url = autoTraderUrl({ ...santaFe, make, model }, { postalCode: "", radiusKm: 100 });
    expect(url).toContain(`/cars/${path}/my_2019?`);
  });

  it("offers the radii AutoTrader.ca has", () => {
    expect(RADIUS_OPTIONS).toEqual([25, 50, 100, 250]);
  });
});

describe("cargurusSearchUrl", () => {
  it("is a web search restricted to cargurus.ca, since its own search needs internal model ids", () => {
    expect(cargurusSearchUrl(santaFe)).toBe(
      "https://www.google.com/search?q=2019+Hyundai+Santa+Fe+for+sale+site%3Acargurus.ca",
    );
  });
});
