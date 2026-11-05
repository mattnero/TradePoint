import { formatCAD } from "./money";
import type { Prep } from "./prep";

export function preApprovalStatus(prep: Prep | undefined): string {
  if (prep?.preApprovalApr === undefined) return "Not yet";
  return `${(prep.preApprovalApr * 100).toFixed(2)}% pre-approved`;
}

export function tradeStatus(prep: Prep | undefined): string {
  const offers = prep?.tradeOffers ?? [];
  if (offers.length === 0) return "None yet";
  const best = offers.reduce((a, b) => (b.amount > a.amount ? b : a));
  const line = `${formatCAD(best.amount)} from ${best.source}`;
  return offers.length === 1 ? `1 of 2 · ${line}` : `Best ${line}`;
}

export function walkAwayStatus(prep: Prep | undefined): string {
  return prep?.walkAway === undefined ? "Not set" : `${formatCAD(prep.walkAway)} all-in`;
}

export function rulesStatus(prep: Prep | undefined): string {
  return prep?.rulesReadOn === undefined ? "Not read yet · 1 minute" : "Read";
}
