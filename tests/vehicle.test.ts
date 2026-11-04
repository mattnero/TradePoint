import { cents } from "../src/model/money";
import {
  addOdometerReading,
  addValueAnchor,
  removeValueAnchor,
  createVehicle,
  kmPerMonth,
  latestReading,
  parseVehicle,
  type Vehicle,
} from "../src/model/vehicle";

const santaFe = () =>
  createVehicle(
    { year: 2019, make: "Hyundai", model: "Santa Fe", odometer: { date: "2026-11-02", km: 118000 } },
    "v1",
  );

describe("createVehicle", () => {
  it("builds a vehicle from year, make, model and a first odometer reading", () => {
    expect(santaFe()).toEqual({
      id: "v1",
      year: 2019,
      make: "Hyundai",
      model: "Santa Fe",
      odometer: [{ date: "2026-11-02", km: 118000 }],
    });
  });

  it("trims text and keeps an optional trim", () => {
    const v = createVehicle(
      { year: 2019, make: " Hyundai ", model: " Santa Fe ", trim: " Luxury ", odometer: { date: "2026-11-02", km: 1 } },
      "v1",
    );
    expect([v.make, v.model, v.trim]).toEqual(["Hyundai", "Santa Fe", "Luxury"]);
  });

  it.each([
    ["blank make", { year: 2019, make: " ", model: "x", odometer: { date: "2026-11-02", km: 1 } }],
    ["blank model", { year: 2019, make: "x", model: "", odometer: { date: "2026-11-02", km: 1 } }],
    ["fractional year", { year: 2019.5, make: "x", model: "x", odometer: { date: "2026-11-02", km: 1 } }],
    ["year in the 1800s", { year: 1899, make: "x", model: "x", odometer: { date: "2026-11-02", km: 1 } }],
    ["negative km", { year: 2019, make: "x", model: "x", odometer: { date: "2026-11-02", km: -1 } }],
    ["fractional km", { year: 2019, make: "x", model: "x", odometer: { date: "2026-11-02", km: 1.5 } }],
    ["bad date", { year: 2019, make: "x", model: "x", odometer: { date: "2026-02-30", km: 1 } }],
  ])("rejects %s", (_name, input) => {
    expect(() => createVehicle(input, "v1")).toThrow(RangeError);
  });
});

describe("addOdometerReading", () => {
  it("appends a later reading", () => {
    const v = addOdometerReading(santaFe(), { date: "2027-02-02", km: 124000 });
    expect(v.odometer).toEqual([
      { date: "2026-11-02", km: 118000 },
      { date: "2027-02-02", km: 124000 },
    ]);
    expect(latestReading(v)).toEqual({ date: "2027-02-02", km: 124000 });
  });

  it("does not change the vehicle it was given", () => {
    const v = santaFe();
    addOdometerReading(v, { date: "2027-02-02", km: 124000 });
    expect(v.odometer).toHaveLength(1);
  });

  it("keeps readings in date order when one is back-dated", () => {
    const v = addOdometerReading(santaFe(), { date: "2027-02-02", km: 124000 });
    const filled = addOdometerReading(v, { date: "2026-12-15", km: 120000 });
    expect(filled.odometer.map((r) => r.date)).toEqual(["2026-11-02", "2026-12-15", "2027-02-02"]);
  });

  it("replaces the reading when the date matches (a correction)", () => {
    const v = addOdometerReading(santaFe(), { date: "2026-11-02", km: 118500 });
    expect(v.odometer).toEqual([{ date: "2026-11-02", km: 118500 }]);
  });

  it("rejects an odometer that goes backwards in time", () => {
    expect(() => addOdometerReading(santaFe(), { date: "2027-02-02", km: 117000 })).toThrow(RangeError);
  });

  it("rejects a back-dated reading higher than a later one", () => {
    expect(() => addOdometerReading(santaFe(), { date: "2026-01-01", km: 119000 })).toThrow(RangeError);
  });

  it("rejects a malformed reading", () => {
    expect(() => addOdometerReading(santaFe(), { date: "soon", km: 120000 })).toThrow(RangeError);
  });
});

describe("kmPerMonth", () => {
  const withReadings = (readings: { date: string; km: number }[]): Vehicle => ({
    ...santaFe(),
    odometer: readings,
  });

  it("is unknown with a single reading", () => {
    expect(kmPerMonth(santaFe())).toBeNull();
  });

  it("uses the last two readings: 6,000 km over 181 days is 1,009 a month", () => {
    const v = withReadings([
      { date: "2025-01-01", km: 45000 },
      { date: "2025-07-01", km: 51000 },
    ]);
    expect(kmPerMonth(v)).toBe(1009);
  });

  it("ignores older readings", () => {
    const v = withReadings([
      { date: "2023-01-01", km: 0 },
      { date: "2025-01-01", km: 45000 },
      { date: "2025-07-01", km: 51000 },
    ]);
    expect(kmPerMonth(v)).toBe(1009);
  });

  it("is zero when the car has not moved", () => {
    const v = withReadings([
      { date: "2025-01-01", km: 45000 },
      { date: "2025-07-01", km: 45000 },
    ]);
    expect(kmPerMonth(v)).toBe(0);
  });

  it("is unknown when the last two readings are under two weeks apart", () => {
    const v = withReadings([
      { date: "2025-01-01", km: 45000 },
      { date: "2025-01-10", km: 45400 },
    ]);
    expect(kmPerMonth(v)).toBeNull();
  });
});

describe("parseVehicle", () => {
  const full: Vehicle = {
    ...santaFe(),
    trim: "Luxury",
    segment: "mid-suv",
    inServiceDate: "2019-03-15",
    inServiceEstimated: true,
    purchase: { price: cents(3299500), date: "2019-03-15" },
    odometer: [
      { date: "2025-01-01", km: 45000 },
      { date: "2025-07-01", km: 51000 },
    ],
    loan: { kind: "terms", principal: cents(2888100), apr: 0.0799, termMonths: 84, startDate: "2019-03-15" },
    benchmarks: { preApprovalApr: 0.0599, outsideTradeOffer: cents(920000) },
    valueAnchors: [
      { date: "2025-07-01", value: cents(2100000), source: "comps" },
      { date: "2025-09-01", value: cents(1950000), source: "offer" },
    ],
  };

  it("round-trips through JSON", () => {
    expect(parseVehicle(JSON.parse(JSON.stringify(full)))).toEqual(full);
    expect(parseVehicle(JSON.parse(JSON.stringify(santaFe())))).toEqual(santaFe());
  });

  it("keeps a benchmark that holds only one of the two values", () => {
    const only = { ...santaFe(), benchmarks: { outsideTradeOffer: cents(920000) } };
    expect(parseVehicle(JSON.parse(JSON.stringify(only)))).toEqual(only);
  });

  it.each([
    ["null", null],
    ["a string", "vehicle"],
    ["missing id", { ...full, id: undefined }],
    ["empty id", { ...full, id: "" }],
    ["string year", { ...full, year: "2019" }],
    ["blank make", { ...full, make: "" }],
    ["numeric trim", { ...full, trim: 4 }],
    ["unknown segment", { ...full, segment: "spaceship" }],
    ["bad in-service date", { ...full, inServiceDate: "2019-02-30" }],
    ["non-boolean estimated flag", { ...full, inServiceEstimated: "yes" }],
    ["purchase without a date", { ...full, purchase: { price: 100 } }],
    ["fractional purchase price", { ...full, purchase: { price: 1.5, date: "2019-03-15" } }],
    ["no odometer readings", { ...full, odometer: [] }],
    ["odometer not an array", { ...full, odometer: 5 }],
    ["odometer going down", { ...full, odometer: [{ date: "2025-01-01", km: 9 }, { date: "2025-07-01", km: 5 }] }],
    ["odometer out of order", { ...full, odometer: [{ date: "2025-07-01", km: 9 }, { date: "2025-01-01", km: 5 }] }],
    ["bad loan", { ...full, loan: { kind: "terms" } }],
    ["benchmarks not an object", { ...full, benchmarks: 5 }],
    ["pre-approval rate over 100%", { ...full, benchmarks: { preApprovalApr: 1.5 } }],
    ["fractional outside offer", { ...full, benchmarks: { outsideTradeOffer: 1.5 } }],
    ["negative outside offer", { ...full, benchmarks: { outsideTradeOffer: -1 } }],
    ["value anchors not an array", { ...full, valueAnchors: { date: "2025-07-01" } }],
    ["value anchor with a bad date", { ...full, valueAnchors: [{ date: "2025-13-01", value: 100, source: "comps" }] }],
    ["value anchor with a fractional value", { ...full, valueAnchors: [{ date: "2025-07-01", value: 1.5, source: "comps" }] }],
    ["value anchor with an unknown source", { ...full, valueAnchors: [{ date: "2025-07-01", value: 100, source: "guess" }] }],
    ["value anchor sourced as the purchase", { ...full, valueAnchors: [{ date: "2025-07-01", value: 100, source: "purchase" }] }],
  ])("rejects %s", (_name, value) => {
    expect(parseVehicle(value)).toBeNull();
  });
});

describe("value anchors", () => {
  const anchor = (date: string, dollars: number, source: "comps" | "offer" | "manual" = "comps") => ({
    date,
    value: cents(dollars * 100),
    source,
  });

  it("adds an anchor to a vehicle that has none", () => {
    expect(addValueAnchor(santaFe(), anchor("2026-11-03", 14200)).valueAnchors).toEqual([anchor("2026-11-03", 14200)]);
  });

  it("keeps anchors in date order", () => {
    let v = addValueAnchor(santaFe(), anchor("2026-11-03", 14200));
    v = addValueAnchor(v, anchor("2026-06-01", 15000));
    expect(v.valueAnchors!.map((a) => a.date)).toEqual(["2026-06-01", "2026-11-03"]);
  });

  it("replaces the anchor already on that date, whatever its source", () => {
    let v = addValueAnchor(santaFe(), anchor("2026-11-03", 14200));
    v = addValueAnchor(v, anchor("2026-11-03", 13900, "offer"));
    expect(v.valueAnchors).toEqual([anchor("2026-11-03", 13900, "offer")]);
  });

  it("does not change the vehicle it was given", () => {
    const v = santaFe();
    addValueAnchor(v, anchor("2026-11-03", 14200));
    expect(v.valueAnchors).toBeUndefined();
  });

  it("removes an anchor by date, and drops the list when it empties", () => {
    let v = addValueAnchor(santaFe(), anchor("2026-11-03", 14200));
    v = addValueAnchor(v, anchor("2026-06-01", 15000));
    v = removeValueAnchor(v, "2026-11-03");
    expect(v.valueAnchors).toEqual([anchor("2026-06-01", 15000)]);
    expect("valueAnchors" in removeValueAnchor(v, "2026-06-01")).toBe(false);
  });

  it("ignores removing a date that has no anchor", () => {
    const v = addValueAnchor(santaFe(), anchor("2026-11-03", 14200));
    expect(removeValueAnchor(v, "2020-01-01")).toEqual(v);
  });
});
