import { cliffsFor } from "../src/model/cliffs";
import {
  activeSeasonLine,
  cliffDetail,
  cliffTitle,
  formatKm,
  monthYear,
  pastLine,
  updatedLabel,
  whenLabel,
} from "../src/model/cliffCopy";
import { cents } from "../src/model/money";
import type { Cliff } from "../src/model/cliffs";
import type { Vehicle } from "../src/model/vehicle";

const AS_OF = "2026-11-02";

describe("formatKm and monthYear", () => {
  it("groups thousands", () => {
    expect(formatKm(86800)).toBe("86,800");
    expect(formatKm(100000)).toBe("100,000");
  });

  it("names the month in three letters", () => {
    expect(monthYear("2027-06-15")).toBe("Jun 2027");
    expect(monthYear("2024-04-01")).toBe("Apr 2024");
  });
});

describe("whenLabel", () => {
  const warranty = (date: string | null): Cliff => ({ kind: "odometer", date, km: 100000 });

  it("counts whole months for far cliffs", () => {
    expect(whenLabel(warranty("2027-06-15"), AS_OF)).toEqual({ big: "7", small: "mo" });
  });

  it("counts days inside the first month", () => {
    expect(whenLabel(warranty("2026-11-23"), AS_OF)).toEqual({ big: "21", small: "days" });
    expect(whenLabel(warranty("2026-11-03"), AS_OF)).toEqual({ big: "1", small: "day" });
  });

  it("shows a question mark when the date is unknown", () => {
    expect(whenLabel(warranty(null), AS_OF)).toEqual({ big: "?", small: "date" });
  });
});

describe("cliff titles and details", () => {
  const equity: Cliff = { kind: "equity", date: "2027-03-02", value: cents(1400000), balance: cents(1360000) };
  const both: Cliff = {
    kind: "warranty",
    date: "2027-06-15",
    coverages: ["comprehensive", "powertrain"],
    limitedBy: "date",
    years: 5,
    km: 100000,
  };

  it("titles each kind", () => {
    expect(cliffTitle(equity)).toBe("Equity crosses positive");
    expect(cliffTitle(both)).toBe("Factory warranty ends");
    expect(cliffTitle({ ...both, coverages: ["powertrain"] })).toBe("Powertrain warranty ends");
    expect(cliffTitle({ ...both, coverages: ["comprehensive"] })).toBe("Comprehensive warranty ends");
    expect(cliffTitle({ kind: "odometer", date: null, km: 150000 })).toBe("150,000 km");
    expect(cliffTitle({ kind: "maintenance", date: null, km: 96000, item: "Transmission fluid service", typicalCost: cents(35000) })).toBe(
      "Transmission fluid service",
    );
    expect(cliffTitle({ kind: "season", date: "2027-09-01", endDate: "2027-12-31", reason: "AWD demand peaks" })).toBe("AWD demand peaks");
  });

  it("states the manufacturer terms and the date, as the mockup does", () => {
    expect(cliffDetail(both, "Hyundai")).toBe("Hyundai Canada 5 yr / 100,000 km · Jun 2027");
  });

  it("explains a km-limited and an unknown-pace warranty", () => {
    expect(cliffDetail({ ...both, limitedBy: "km", years: 3, km: 60000, date: "2026-11-23" }, "Toyota")).toBe(
      "Toyota Canada 3 yr / 60,000 km · you'd hit the km limit first, around Nov 2026",
    );
    expect(cliffDetail({ ...both, limitedBy: "date-or-km", years: 3, km: 60000, date: "2028-01-15" }, "Toyota")).toBe(
      "Toyota Canada 3 yr / 60,000 km · Jan 2028 or 60,000 km, whichever comes first",
    );
  });

  it("says unlimited distance for a null km limit", () => {
    expect(cliffDetail({ ...both, km: null, years: 3, coverages: ["comprehensive"] }, "Mazda")).toBe(
      "Mazda Canada 3 yr / unlimited km · Jun 2027",
    );
  });

  it("details the other kinds without telling the owner when to sell", () => {
    expect(cliffDetail(equity, "Hyundai")).toBe("Loan balance drops below estimated value");
    expect(cliffDetail({ kind: "odometer", date: "2027-07-30", km: 100000 }, "Hyundai")).toBe(
      "Listing filter cutoff and wholesale price step",
    );
    expect(cliffDetail({ kind: "odometer", date: null, km: 150000 }, "Hyundai")).toBe("Mileage milestone");
    expect(
      cliffDetail({ kind: "maintenance", date: "2027-05-10", km: 96000, item: "Transmission fluid service", typicalCost: cents(35000) }, "Hyundai"),
    ).toBe("Typically $350, due around 96,000 km");
    expect(cliffDetail({ kind: "season", date: "2027-09-01", endDate: "2027-12-31", reason: "AWD demand peaks" }, "Hyundai")).toBe(
      "Sep to Dec",
    );
  });
});

describe("pastLine", () => {
  it("says when a warranty ended", () => {
    expect(pastLine({ kind: "warranty", date: "2024-04-01", coverages: ["comprehensive", "powertrain"], limitedBy: "date" })).toBe(
      "Factory warranty ended Apr 2024",
    );
    expect(pastLine({ kind: "warranty", date: "2024-04-01", coverages: ["powertrain"], limitedBy: "date" })).toBe(
      "Powertrain warranty ended Apr 2024",
    );
  });

  it("says a warranty is used up when only the km limit is known", () => {
    expect(pastLine({ kind: "warranty", date: null, coverages: ["comprehensive"], limitedBy: "km" })).toBe(
      "Comprehensive warranty used up: over the km limit",
    );
  });

  it("covers milestones and equity", () => {
    expect(pastLine({ kind: "odometer", km: 100000 })).toBe("100,000 km passed");
    expect(pastLine({ kind: "equity", value: cents(1), balance: cents(0) })).toBe("Equity is already positive");
  });
});

describe("with a real report", () => {
  it("reads naturally for Matt's 2019 Santa Fe", () => {
    const v: Vehicle = {
      id: "m",
      year: 2019,
      make: "Hyundai",
      model: "Santa Fe",
      segment: "mid-suv",
      inServiceDate: "2019-04-01",
      odometer: [{ date: "2026-11-02", km: 118000 }],
    };
    const report = cliffsFor({ vehicle: v, asOf: AS_OF });
    expect(report.past.map(pastLine)).toEqual(["Factory warranty ended Apr 2024", "100,000 km passed"]);
  });
});

describe("activeSeasonLine", () => {
  it("keeps the reason's casing and names the month it runs to", () => {
    expect(activeSeasonLine({ endDate: "2026-12-31", reason: "AWD demand peaks" })).toBe(
      "In season now: AWD demand peaks, through Dec 2026",
    );
  });
});

describe("updatedLabel", () => {
  it("says today for a reading taken today", () => {
    expect(updatedLabel("2026-11-03", "2026-11-03")).toBe("Updated today");
  });

  it("names the day for an older reading in the same year", () => {
    expect(updatedLabel("2026-10-01", "2026-11-03")).toBe("Updated Oct 1");
  });

  it("includes the year when it is not this year", () => {
    expect(updatedLabel("2025-12-24", "2026-11-03")).toBe("Updated Dec 24, 2025");
  });
});
