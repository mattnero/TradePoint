import { cents } from "../src/model/money";
import { outlookFor } from "../src/model/outlook";
import type { Vehicle } from "../src/model/vehicle";
import { windowSentence } from "../src/model/windowCopy";

const AS_OF = "2026-11-02";

const mockupSantaFe: Vehicle = {
  id: "mockup",
  year: 2022,
  make: "Hyundai",
  model: "Santa Fe",
  segment: "mid-suv",
  inServiceDate: "2022-06-15",
  odometer: [
    { date: "2026-05-02", km: 77800 },
    { date: "2026-11-02", km: 86800 },
  ],
  loan: { kind: "snapshot", balance: cents(1510000), apr: 0.0449, monthsRemaining: 30, asOf: AS_OF },
  valueAnchors: [{ date: "2026-10-28", value: cents(1420000), source: "comps" }],
};

describe("the mockup car's outlook", () => {
  const outlook = outlookFor(mockupSantaFe, AS_OF);

  it("opens the window on the same day the chart crosses and the cliff list dates equity", () => {
    expect(outlook.projection!.crossover!.date).toBe("2027-02-02");
    expect(outlook.report.upcoming[0]).toMatchObject({ kind: "equity", date: "2027-02-02" });
    expect(outlook.window).toMatchObject({ kind: "window", opens: "2027-02-02" });
  });

  it("closes the window at the warranty cliff the list shows", () => {
    const warranty = outlook.report.upcoming.find((c) => c.kind === "warranty");
    expect(outlook.window).toMatchObject({ closes: warranty });
  });

  it("projects 36 months for the chart", () => {
    expect(outlook.projection!.points).toHaveLength(37);
  });

  it("reads as the mockup's banner, with the honest keep-it cost", () => {
    const sentence = windowSentence(outlook.window!, outlook.keep!);
    expect(sentence.title).toBe("Your window: Feb to Jun 2027");
    expect(sentence.body).toContain("Keeping it costs about $2,320 over the next year");
  });
});

describe("a paid-off car past every deadline (like Matt's 2019 Santa Fe)", () => {
  const owned: Vehicle = {
    id: "matt",
    year: 2019,
    make: "Hyundai",
    model: "Santa Fe",
    segment: "mid-suv",
    inServiceDate: "2018-09-15",
    purchase: { price: cents(3500000), date: "2018-09-15" },
    odometer: [
      { date: "2026-05-02", km: 112000 },
      { date: "2026-11-02", km: 118000 },
    ],
  };
  const outlook = outlookFor(owned, AS_OF);

  it("has no deadline and still shows what keeping it costs", () => {
    expect(outlook.window).toEqual({ kind: "open", opens: "now" });
    expect(outlook.keep!.interest).toBe(0);
    expect(outlook.keep!.depreciation).toBeGreaterThan(0);
  });

  it("has a value line with nothing owed", () => {
    expect(outlook.projection!.points.every((p) => p.balance === 0)).toBe(true);
  });
});

describe("an outlook without a value curve", () => {
  it("has the cliff list but no projection, window or keep-it cost", () => {
    const { valueAnchors: _, ...noValue } = mockupSantaFe;
    const outlook = outlookFor(noValue, AS_OF);
    expect(outlook.curve).toBeNull();
    expect(outlook.projection).toBeNull();
    expect(outlook.window).toBeNull();
    expect(outlook.keep).toBeNull();
    expect(outlook.report.needs).toContain("value");
    expect(outlook.report.upcoming.length).toBeGreaterThan(0);
  });
});
