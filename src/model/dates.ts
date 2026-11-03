export type IsoDate = string;

const MS_PER_DAY = 86_400_000;

function parts(date: IsoDate): [number, number, number] {
  const [y = 0, m = 0, d = 0] = date.split("-").map(Number);
  return [y, m, d];
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = parts(value);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

export function wholeMonthsBetween(from: IsoDate, to: IsoDate): number {
  if (daysBetween(from, to) <= 0) return 0;
  const [fy, fm, fd] = parts(from);
  const [ty, tm, td] = parts(to);
  const anniversary = Math.min(fd, daysInMonth(ty, tm));
  return (ty - fy) * 12 + (tm - fm) - (td < anniversary ? 1 : 0);
}
