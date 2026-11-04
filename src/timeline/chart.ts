import { monthName } from "../model/cliffCopy";
import type { Cliff } from "../model/cliffs";
import { DAYS_PER_MONTH, daysBetween, monthOf, type IsoDate } from "../model/dates";
import type { EquityPoint } from "../model/equity";
import { toDollars, type Cents } from "../model/money";

export const CHART = { width: 300, height: 170, left: 34, right: 8, top: 14, bottom: 26 };

const GRID_STEPS = 3;
const MARKER_LABEL_WIDTH = 44;

export interface ChartMarker {
  month: number;
  label: string;
}

export interface ChartInput {
  points: EquityPoint[];
  hasLoan: boolean;
  markers: ChartMarker[];
  crossoverMonth: number | null;
}

type Anchor = "start" | "middle" | "end";

export interface ChartGeometry {
  valuePath: string;
  areaPath: string;
  loanPath: string | null;
  grid: { y: number; label: string }[];
  markers: { x: number; label: string; row: number; anchor: Anchor }[];
  crossover: { x: number; y: number; anchor: Anchor } | null;
  xLabels: { x: number; label: string; anchor: Anchor }[];
  baseline: number;
}

export function chartMarkers(cliffs: Cliff[], asOf: IsoDate): ChartMarker[] {
  const markers: ChartMarker[] = [];
  for (const cliff of cliffs) {
    if (cliff.date === null) continue;
    const month = daysBetween(asOf, cliff.date) / DAYS_PER_MONTH;
    if (cliff.kind === "warranty") markers.push({ month, label: "Warranty" });
    if (cliff.kind === "odometer") markers.push({ month, label: `${cliff.km / 1000}k km` });
  }
  return markers;
}

function gridStep(maxDollars: number): number {
  return Math.max(1000, Math.ceil(maxDollars / GRID_STEPS / 1000) * 1000);
}

function shortMonth(date: string): string {
  const { year, month } = monthOf(date);
  return `${monthName(month)} ${String(year).slice(-2)}`;
}

export function chartGeometry({ points, hasLoan, markers, crossoverMonth }: ChartInput): ChartGeometry {
  const { width, height, left, right, top, bottom } = CHART;
  const months = Math.max(1, points.length - 1);
  const highest = Math.max(...points.map((p) => Math.max(toDollars(p.value), toDollars(p.balance))));
  const step = gridStep(highest);
  const yMax = step * GRID_STEPS;
  const x = (month: number) => left + ((width - left - right) * month) / months;
  const y = (dollars: number) => top + (height - top - bottom) * (1 - dollars / yMax);
  const path = (pick: (p: EquityPoint) => Cents) =>
    points.map((p, i) => `${i ? "L" : "M"}${x(p.month).toFixed(1)} ${y(toDollars(pick(p))).toFixed(1)}`).join(" ");

  const valuePath = path((p) => p.value);
  const baseline = y(0);
  const areaPath = `${valuePath} L${x(months).toFixed(1)} ${baseline.toFixed(1)} L${x(0).toFixed(1)} ${baseline.toFixed(1)} Z`;

  const placed: ChartGeometry["markers"] = [];
  for (const marker of [...markers].sort((a, b) => a.month - b.month)) {
    const mx = x(marker.month);
    const previous = placed[placed.length - 1];
    const crowded = previous !== undefined && previous.row === 0 && mx - previous.x < MARKER_LABEL_WIDTH;
    const anchor = mx + MARKER_LABEL_WIDTH > width - right ? "end" : "start";
    placed.push({ x: mx, label: marker.label, row: crowded ? 1 : 0, anchor });
  }

  const crossPoint = crossoverMonth === null ? undefined : points[crossoverMonth];
  const crossover =
    crossPoint === undefined
      ? null
      : {
          x: x(crossPoint.month),
          y: y(toDollars(crossPoint.value)),
          anchor: (crossPoint.month < months / 2 ? "start" : "end") as Anchor,
        };

  const xLabels = points
    .filter((p) => p.month % 12 === 0)
    .map((p) => ({
      x: x(p.month),
      label: shortMonth(p.date),
      anchor: (p.month === 0 ? "start" : p.month === months ? "end" : "middle") as Anchor,
    }));

  return {
    valuePath,
    areaPath,
    loanPath: hasLoan ? path((p) => p.balance) : null,
    grid: Array.from({ length: GRID_STEPS + 1 }, (_, i) => ({
      y: y(step * i),
      label: i === 0 ? "$0" : `$${(step * i) / 1000}k`,
    })),
    markers: placed,
    crossover,
    xLabels,
    baseline,
  };
}
