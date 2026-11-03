import { daysBetween, monthOf, wholeMonthsBetween, type IsoDate } from "./dates";
import type { Cliff, PastCliff } from "./cliffs";
import { formatCAD } from "./money";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatKm(km: number): string {
  return km.toLocaleString("en-CA");
}

function monthName(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export function monthYear(date: IsoDate): string {
  const { year, month } = monthOf(date);
  return `${monthName(month)} ${year}`;
}

export function whenLabel(cliff: Cliff, asOf: IsoDate): { big: string; small: string } {
  if (cliff.date === null) return { big: "?", small: "date" };
  const months = wholeMonthsBetween(asOf, cliff.date);
  if (months >= 1) return { big: String(months), small: "mo" };
  const days = Math.max(0, daysBetween(asOf, cliff.date));
  return { big: String(days), small: days === 1 ? "day" : "days" };
}

export function cliffTitle(cliff: Cliff): string {
  switch (cliff.kind) {
    case "equity":
      return "Equity crosses positive";
    case "warranty":
      if (cliff.coverages.length === 2) return "Factory warranty ends";
      return cliff.coverages[0] === "powertrain" ? "Powertrain warranty ends" : "Comprehensive warranty ends";
    case "odometer":
      return `${formatKm(cliff.km)} km`;
    case "maintenance":
      return cliff.item;
    case "season":
      return cliff.reason;
  }
}

export function cliffDetail(cliff: Cliff, make: string): string {
  switch (cliff.kind) {
    case "equity":
      return "Loan balance drops below estimated value";
    case "warranty": {
      const km = cliff.km === null ? "unlimited km" : `${formatKm(cliff.km)} km`;
      const terms = `${make} Canada ${cliff.years} yr / ${km}`;
      const when = monthYear(cliff.date);
      if (cliff.limitedBy === "km") return `${terms} · you'd hit the km limit first, around ${when}`;
      if (cliff.limitedBy === "date-or-km") return `${terms} · ${when} or ${km}, whichever comes first`;
      return `${terms} · ${when}`;
    }
    case "odometer":
      return cliff.km === 100_000 ? "Listing filter cutoff and wholesale price step" : "Mileage milestone";
    case "maintenance":
      return `Typically ${formatCAD(cliff.typicalCost)}, due around ${formatKm(cliff.km)} km`;
    case "season": {
      const start = monthOf(cliff.date).month;
      const end = monthOf(cliff.endDate).month;
      return `${monthName(start)} to ${monthName(end)}`;
    }
  }
}

function coverageName(coverages: ("comprehensive" | "powertrain")[]): string {
  if (coverages.length === 2) return "Factory warranty";
  return coverages[0] === "powertrain" ? "Powertrain warranty" : "Comprehensive warranty";
}

export function pastLine(past: PastCliff): string {
  switch (past.kind) {
    case "warranty": {
      const name = coverageName(past.coverages);
      return past.date === null
        ? `${name} used up: over the km limit`
        : `${name} ended ${monthYear(past.date)}`;
    }
    case "odometer":
      return `${formatKm(past.km)} km passed`;
    case "equity":
      return "Equity is already positive";
  }
}

export function activeSeasonLine(season: { endDate: IsoDate; reason: string }): string {
  return `In season now: ${season.reason}, through ${monthYear(season.endDate)}`;
}

export function updatedLabel(readingDate: IsoDate, today: IsoDate): string {
  if (readingDate === today) return "Updated today";
  const [year, month, day] = readingDate.split("-").map(Number);
  const base = `Updated ${monthName(month ?? 1)} ${day}`;
  return year === monthOf(today).year ? base : `${base}, ${year}`;
}
