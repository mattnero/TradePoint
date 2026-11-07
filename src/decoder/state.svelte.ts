import type { IsoDate } from "../model/dates";
import type { Vehicle } from "../model/vehicle";
import { garageDecoderValues, GARAGE_FIELDS, mergeGarageValues, type GarageField, type GarageValues } from "./fromGarage";
import { emptyDecoder, readDecoder, readPlan } from "./inputs";

export type DealerMode = "plan" | "check";

export const decoder = $state(emptyDecoder());

export const dealer = $state<{ mode: DealerMode }>({ mode: "plan" });

let garageValues = $state<GarageValues>({});

export function currentReading() {
  return readDecoder(decoder);
}

export function currentPlan() {
  return readPlan(decoder);
}

export function applyGarage(vehicle: Vehicle, today: IsoDate): void {
  const next = garageDecoderValues(vehicle, today);
  Object.assign(decoder, mergeGarageValues(decoder, garageValues, next));
  garageValues = next;
}

export function isFromGarage(field: GarageField): boolean {
  return decoder[field] !== "" && decoder[field] === garageValues[field];
}

export function anyFromGarage(): boolean {
  return GARAGE_FIELDS.some(isFromGarage);
}

export function resetDecoder(): void {
  Object.assign(decoder, emptyDecoder());
  garageValues = {};
  dealer.mode = "plan";
}
