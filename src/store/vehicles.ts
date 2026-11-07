import type { Vehicle } from "../model/vehicle";
import type { Garage } from "./garage";

export function selectedVehicle(garage: Garage): Vehicle | undefined {
  return garage.vehicles.find((v) => v.id === garage.selectedVehicleId) ?? garage.vehicles[0];
}

export function selectVehicle(garage: Garage, id: string): Garage {
  if (!garage.vehicles.some((v) => v.id === id)) return garage;
  return { ...garage, selectedVehicleId: id };
}

export function addVehicle(garage: Garage, vehicle: Vehicle): Garage {
  return { ...garage, vehicles: [...garage.vehicles, vehicle], selectedVehicleId: vehicle.id };
}

export function replaceVehicle(garage: Garage, vehicle: Vehicle): Garage {
  if (!garage.vehicles.some((v) => v.id === vehicle.id)) return garage;
  return { ...garage, vehicles: garage.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v)) };
}

export function removeVehicle(garage: Garage, id: string): Garage {
  if (!garage.vehicles.some((v) => v.id === id)) return garage;
  const { selectedVehicleId, ...rest } = garage;
  const next: Garage = { ...rest, vehicles: garage.vehicles.filter((v) => v.id !== id) };
  if (selectedVehicleId !== undefined && selectedVehicleId !== id) next.selectedVehicleId = selectedVehicleId;
  return next;
}

export function canAddVehicle(garage: Garage, isPro: boolean): boolean {
  return isPro || garage.vehicles.length === 0;
}

export function isUsable(garage: Garage, id: string, isPro: boolean): boolean {
  return isPro || selectedVehicle(garage)?.id === id;
}

export function vehicleLabel(vehicle: Vehicle): string {
  return [vehicle.year, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
}
