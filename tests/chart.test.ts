import type { EquityPoint } from "../src/model/equity";
import { cents } from "../src/model/money";
import type { Cliff } from "../src/model/cliffs";
import { chartGeometry, chartMarkers, CHART } from "../src/timeline/chart";

const points = (values: number[], balances: number[]): EquityPoint[] =>
  values.map((v, month) => ({
    month,
    date: `2027-${String(month + 1).padStart(2, "0")}-01`,
    value: cents(v),
    balance: cents(balances[month]!),
    equity: cents(v - balances[month]!),
  }));

describe("chartGeometry", () => {
  const sample = points([1420000, 1400000, 1380000], [1510000, 1460000, 1400000]);

  it("rounds the top up to three even grid steps of whole thousands", () => {
    const g = chartGeometry({ points: sample, hasLoan: true, markers: [], crossoverMonth: null });
    expect(g.grid.map((l) => l.label)).toEqual(["$0", "$6k", "$12k", "$18k"]);
  });

  it("spans the plot width from the first to the last month", () => {
    const g = chartGeometry({ points: sample, hasLoan: true, markers: [], crossoverMonth: null });
    expect(g.valuePath.startsWith(`M${CHART.left.toFixed(1)} `)).toBe(true);
    expect(g.valuePath).toContain(`L${(CHART.width - CHART.right).toFixed(1)} `);
  });

  it("draws no loan line without a loan", () => {
    expect(chartGeometry({ points: sample, hasLoan: false, markers: [], crossoverMonth: null }).loanPath).toBeNull();
  });

  it("puts the crossover dot on the value line, labelled toward the open side", () => {
    const g = chartGeometry({ points: sample, hasLoan: true, markers: [], crossoverMonth: 2 });
    expect(g.crossover).toMatchObject({ x: CHART.width - CHART.right, anchor: "end" });
    const early = chartGeometry({ points: sample, hasLoan: true, markers: [], crossoverMonth: 0 });
    expect(early.crossover).toMatchObject({ x: CHART.left, anchor: "start" });
  });

  it("drops a second label row when two markers sit close together", () => {
    const g = chartGeometry({
      points: sample,
      hasLoan: true,
      markers: [
        { month: 0.5, label: "Warranty" },
        { month: 0.6, label: "100k km" },
        { month: 2, label: "150k km" },
      ],
      crossoverMonth: null,
    });
    expect(g.markers.map((m) => m.row)).toEqual([0, 1, 0]);
  });

  it("turns a marker label inward at the right edge", () => {
    const g = chartGeometry({
      points: sample,
      hasLoan: true,
      markers: [
        { month: 0.5, label: "Warranty" },
        { month: 1.9, label: "150k km" },
      ],
      crossoverMonth: null,
    });
    expect(g.markers.map((m) => m.anchor)).toEqual(["start", "end"]);
  });

  it("labels the start and every 12 months", () => {
    const year = points(
      Array.from({ length: 37 }, () => 1000000),
      Array.from({ length: 37 }, () => 0),
    ).map((p, i) => ({ ...p, date: ["2026-11-02", "2027-11-02", "2028-11-02", "2029-11-02"][i / 12] ?? p.date }));
    const g = chartGeometry({ points: year, hasLoan: false, markers: [], crossoverMonth: null });
    expect(g.xLabels.map((l) => [l.label, l.anchor])).toEqual([
      ["Nov 26", "start"],
      ["Nov 27", "middle"],
      ["Nov 28", "middle"],
      ["Nov 29", "end"],
    ]);
  });
});

describe("chartMarkers", () => {
  it("marks dated warranty and odometer cliffs by fractional month", () => {
    const cliffs: Cliff[] = [
      { kind: "equity", date: "2027-02-02", value: cents(1), balance: cents(1) },
      { kind: "warranty", date: "2027-06-15", coverages: ["powertrain"], limitedBy: "date", years: 5, km: 100000 },
      { kind: "odometer", date: "2027-08-01", km: 100000 },
      { kind: "odometer", date: null, km: 150000 },
      { kind: "season", date: "2027-09-01", endDate: "2027-12-31", reason: "x" },
    ];
    const markers = chartMarkers(cliffs, "2026-11-02");
    expect(markers.map((m) => m.label)).toEqual(["Warranty", "100k km"]);
    expect(markers[0]!.month).toBeCloseTo(225 / (365.25 / 12), 6);
  });
});
