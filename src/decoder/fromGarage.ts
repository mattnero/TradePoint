import { loanBalanceAt } from "../model/loan";
import { formatInputMoney } from "../model/money";
import { decoderBenchmarks } from "../model/prep";
import type { IsoDate } from "../model/dates";
import type { Vehicle } from "../model/vehicle";
import { formatPercentInput, type DecoderInputs } from "./inputs";

export type GarageField = "tradePayoff" | "preApprovalApr" | "outsideOffer" | "walkAway";

export type GarageValues = Partial<Pick<DecoderInputs, GarageField>>;

export const GARAGE_FIELDS: GarageField[] = ["tradePayoff", "preApprovalApr", "outsideOffer", "walkAway"];

export function garageDecoderValues(vehicle: Vehicle, today: IsoDate): GarageValues {
  const values: GarageValues = {};
  if (vehicle.loan !== undefined) {
    values.tradePayoff = formatInputMoney(loanBalanceAt(vehicle.loan, today));
  }
  const { preApprovalApr, outsideTradeOffer } = decoderBenchmarks(vehicle.prep);
  if (preApprovalApr !== undefined) values.preApprovalApr = formatPercentInput(preApprovalApr);
  if (outsideTradeOffer !== undefined) values.outsideOffer = formatInputMoney(outsideTradeOffer);
  if (vehicle.prep?.walkAway !== undefined) values.walkAway = formatInputMoney(vehicle.prep.walkAway);
  return values;
}

export function mergeGarageValues(current: DecoderInputs, previous: GarageValues, next: GarageValues): DecoderInputs {
  const merged = { ...current };
  for (const field of GARAGE_FIELDS) {
    const incoming = next[field];
    if (incoming === undefined) continue;
    if (current[field] === "" || current[field] === previous[field]) merged[field] = incoming;
  }
  return merged;
}
