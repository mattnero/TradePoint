import type { CliffReport, Cliff } from "../src/model/cliffs";
import type { EquityPoint, EquityProjection } from "../src/model/equity";
import type { Loan } from "../src/model/loan";
import { cents, type Cents } from "../src/model/money";
import { keepCost, tradeWindow, type Deadline, type KeepCost } from "../src/model/window";
import { windowSentence } from "../src/model/windowCopy";

const AS_OF = "2026-11-02";

const warrantyCliff: Deadline = {
  kind: "warranty",
  date: "2027-06-15",
  coverages: ["comprehensive", "powertrain"],
  limitedBy: "date",
  years: 5,
  km: 100000,
};
const hundredK: Deadline = { kind: "odometer", date: "2027-08-01", km: 100000 };
const season: Cliff = { kind: "season", date: "2027-09-01", endDate: "2027-12-31", reason: "AWD demand peaks" };

const report = (upcoming: Cliff[]): CliffReport => ({ upcoming, past: [], activeSeason: null, needs: [] });

const point = (month: number, date: string): EquityPoint => ({
  month,
  date,
  value: cents(1000000),
  balance: cents(900000),
  equity: cents(100000),
});
const crossingAt = (month: number, date: string): EquityProjection => ({ points: [], crossover: point(month, date) });
const positiveNow = crossingAt(0, AS_OF);
const underwater: EquityProjection = { points: [], crossover: null };

describe("keepCost", () => {
  const loan: Loan = { kind: "snapshot", balance: cents(1510000), apr: 0.0449, monthsRemaining: 30, asOf: AS_OF };
  const declining = (date: string): Cents => cents(date === AS_OF ? 1417422 : 1241350);

  it("adds the next 12 months of depreciation and interest", () => {
    expect(keepCost(declining, loan, AS_OF)).toEqual({
      depreciation: cents(176072),
      interest: cents(55881),
    });
  });

  it("is depreciation alone without a loan", () => {
    expect(keepCost(declining, undefined, AS_OF)).toEqual({ depreciation: cents(176072), interest: cents(0) });
  });

  it("counts only the payments left when the loan ends inside the year", () => {
    const short: Loan = { kind: "snapshot", balance: cents(120000), apr: 0, monthsRemaining: 3, asOf: AS_OF };
    expect(keepCost(declining, short, AS_OF).interest).toBe(0);
    const paidOff: Loan = { kind: "snapshot", balance: cents(100000), apr: 0.06, monthsRemaining: 2, asOf: "2026-01-01" };
    expect(keepCost(declining, paidOff, AS_OF).interest).toBe(0);
  });
});

describe("tradeWindow", () => {
  it("opens when equity turns positive and closes at the first warranty or 100,000 km deadline", () => {
    expect(tradeWindow(report([crossingAtCliff(), warrantyCliff, hundredK, season]), crossingAt(3, "2027-02-02"))).toEqual({
      kind: "window",
      opens: "2027-02-02",
      closes: warrantyCliff,
    });
  });

  it("is open now when equity is already positive", () => {
    expect(tradeWindow(report([hundredK]), positiveNow)).toEqual({ kind: "window", opens: "now", closes: hundredK });
  });

  it("is late when the deadline comes before equity turns positive", () => {
    expect(tradeWindow(report([warrantyCliff]), crossingAt(10, "2027-09-02"))).toEqual({
      kind: "late",
      opens: "2027-09-02",
      closes: warrantyCliff,
    });
  });

  it("has no deadline when only seasons, maintenance and later km marks are ahead", () => {
    const later: Cliff = { kind: "odometer", date: "2027-03-01", km: 150000 };
    const service: Cliff = { kind: "maintenance", date: "2027-01-01", km: 192000, item: "x", typicalCost: cents(1) };
    expect(tradeWindow(report([later, service, season]), positiveNow)).toEqual({ kind: "open", opens: "now" });
  });

  it("ignores a 100,000 km mark it cannot date", () => {
    const undated: Cliff = { kind: "odometer", date: null, km: 100000 };
    expect(tradeWindow(report([undated]), crossingAt(3, "2027-02-02"))).toEqual({ kind: "open", opens: "2027-02-02" });
  });

  it("is under water when equity never turns positive in the horizon", () => {
    expect(tradeWindow(report([warrantyCliff]), underwater)).toEqual({ kind: "underwater", closes: warrantyCliff });
    expect(tradeWindow(report([]), underwater)).toEqual({ kind: "underwater", closes: null });
  });
});

function crossingAtCliff(): Cliff {
  return { kind: "equity", date: "2027-02-02", value: cents(1370817), balance: cents(1366499) };
}

describe("windowSentence", () => {
  const keep: KeepCost = { depreciation: cents(176072), interest: cents(55881) };
  const keepLine = "Keeping it costs about $2,320 over the next year: $1,760 in depreciation and $560 in interest.";

  it("names the window, both ends and the keep-it cost", () => {
    expect(windowSentence({ kind: "window", opens: "2027-02-02", closes: warrantyCliff }, keep)).toEqual({
      title: "Your window: Feb to Jun 2027",
      body:
        "Equity turns positive in Feb 2027. Factory warranty ends in Jun 2027. " +
        `If you're going to trade, this is the stretch to do it. ${keepLine}`,
    });
  });

  it("gives both years when the window spans two", () => {
    const window = { kind: "window", opens: "2026-12-02", closes: warrantyCliff } as const;
    expect(windowSentence(window, keep).title).toBe("Your window: Dec 2026 to Jun 2027");
  });

  it("opens now when equity is already positive", () => {
    expect(windowSentence({ kind: "window", opens: "now", closes: hundredK }, keep)).toEqual({
      title: "Your window: now to Aug 2027",
      body:
        "Equity is already positive. You pass 100,000 km around Aug 2027. " +
        `If you're going to trade, this is the stretch to do it. ${keepLine}`,
    });
  });

  it("says plainly when the deadline comes first", () => {
    expect(windowSentence({ kind: "late", opens: "2027-09-02", closes: warrantyCliff }, keep)).toEqual({
      title: "No clean window before Jun 2027",
      body:
        "Factory warranty ends in Jun 2027, before equity turns positive in Sep 2027. " +
        `Trading before then rolls what you owe over its value into the next loan. ${keepLine}`,
    });
  });

  it("calls an open road no rush", () => {
    expect(windowSentence({ kind: "open", opens: "now" }, keep)).toEqual({
      title: "No deadline in the next 36 months",
      body:
        "Equity is already positive. No warranty end or 100,000 km mark comes up in the next 36 months, " +
        `so there's no rush either way. ${keepLine}`,
    });
    expect(windowSentence({ kind: "open", opens: "2027-02-02" }, keep).body).toMatch(/^Equity turns positive in Feb 2027\. /);
  });

  it("is honest about being under water", () => {
    expect(windowSentence({ kind: "underwater", closes: warrantyCliff }, keep)).toEqual({
      title: "Under water for the next 36 months",
      body:
        "The loan stays above the estimated value for the next 36 months. Factory warranty ends in Jun 2027. " +
        `Trading rolls what you owe over its value into the next loan. ${keepLine}`,
    });
    expect(windowSentence({ kind: "underwater", closes: null }, keep).body).not.toContain("warranty");
  });

  it("leaves interest out when there is none", () => {
    const noLoan = { depreciation: cents(176072), interest: cents(0) };
    expect(windowSentence({ kind: "open", opens: "now" }, noLoan).body).toMatch(
      /Keeping it costs about \$1,760 over the next year in depreciation\.$/,
    );
  });
});
