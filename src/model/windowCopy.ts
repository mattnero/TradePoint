import { cliffTitle, formatKm, monthName, monthYear } from "./cliffCopy";
import { DEFAULT_HORIZON_MONTHS } from "./cliffs";
import { monthOf, type IsoDate } from "./dates";
import { cents, formatCAD, type Cents } from "./money";
import type { Deadline, KeepCost, TradeWindow } from "./window";

export interface WindowSentence {
  title: string;
  body: string;
}

const HORIZON = `the next ${DEFAULT_HORIZON_MONTHS} months`;
const ROLLS_OVER = "rolls what you owe over its value into the next loan.";

function aboutTens(amount: Cents): Cents {
  return cents(Math.round(amount / 1000) * 1000);
}

function deadlinePhrase(deadline: Deadline): string {
  const when = monthYear(deadline.date);
  if (deadline.kind === "odometer") return `You pass ${formatKm(deadline.km)} km around ${when}`;
  return `${cliffTitle(deadline)} in ${when}`;
}

function opensLine(opens: IsoDate | "now"): string {
  return opens === "now" ? "Equity is already positive." : `Equity turns positive in ${monthYear(opens)}.`;
}

function span(opens: IsoDate | "now", closes: IsoDate): string {
  if (opens === "now") return `now to ${monthYear(closes)}`;
  const sameYear = monthOf(opens).year === monthOf(closes).year;
  const start = sameYear ? monthName(monthOf(opens).month) : monthYear(opens);
  return `${start} to ${monthYear(closes)}`;
}

function keepLine(keep: KeepCost): string {
  const depreciation = aboutTens(keep.depreciation);
  const interest = aboutTens(keep.interest);
  const total = formatCAD(cents(depreciation + interest));
  if (interest === 0) return `Keeping it costs about ${total} over the next year in depreciation.`;
  return (
    `Keeping it costs about ${total} over the next year: ` +
    `${formatCAD(depreciation)} in depreciation and ${formatCAD(interest)} in interest.`
  );
}

export function windowSentence(window: TradeWindow, keep: KeepCost): WindowSentence {
  const keeping = keepLine(keep);
  switch (window.kind) {
    case "window":
      return {
        title: `Your window: ${span(window.opens, window.closes.date)}`,
        body: `${opensLine(window.opens)} ${deadlinePhrase(window.closes)}. If you're going to trade, this is the stretch to do it. ${keeping}`,
      };
    case "late":
      return {
        title: `No clean window before ${monthYear(window.closes.date)}`,
        body:
          `${deadlinePhrase(window.closes)}, before equity turns positive in ${monthYear(window.opens)}. ` +
          `Trading before then ${ROLLS_OVER} ${keeping}`,
      };
    case "open":
      return {
        title: `No deadline in ${HORIZON}`,
        body:
          `${opensLine(window.opens)} No warranty end or 100,000 km mark comes up in ${HORIZON}, ` +
          `so there's no rush either way. ${keeping}`,
      };
    case "underwater": {
      const deadline = window.closes === null ? "" : `${deadlinePhrase(window.closes)}. `;
      return {
        title: `Under water for ${HORIZON}`,
        body: `The loan stays above the estimated value for ${HORIZON}. ${deadline}Trading ${ROLLS_OVER} ${keeping}`,
      };
    }
  }
}
