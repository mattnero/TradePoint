import {
  emptyGarage,
  eraseGarage,
  loadGarage,
  readUnreadableCopy,
  saveGarage,
  type Garage,
} from "./garage";
import { browserStorage } from "./browserStorage";
import { addVehicle, removeVehicle, replaceVehicle, selectVehicle, selectedVehicle } from "./vehicles";
import type { SavedDeal } from "../model/savedDeal";
import type { Vehicle } from "../model/vehicle";

const storage = browserStorage();
const loaded = loadGarage(storage);

let current = $state<Garage>(loaded.garage);
let saveFailed = $state(false);
let recovered = $state(loaded.recovered);

export const garageStore = {
  get garage(): Garage {
    return current;
  },
  get vehicle(): Vehicle | undefined {
    return selectedVehicle(current);
  },
  get vehicles(): Vehicle[] {
    return current.vehicles;
  },
  select(id: string): void {
    this.update((g) => selectVehicle(g, id));
  },
  addVehicle(vehicle: Vehicle): void {
    this.update((g) => addVehicle(g, vehicle));
  },
  updateVehicle(vehicle: Vehicle): void {
    this.update((g) => replaceVehicle(g, vehicle));
  },
  removeVehicle(id: string): void {
    this.update((g) => removeVehicle(g, id));
  },
  get deals(): SavedDeal[] {
    return current.deals;
  },
  get recoveredFromBrokenData(): boolean {
    return recovered;
  },
  get saveFailed(): boolean {
    return saveFailed;
  },
  update(change: (garage: Garage) => Garage): void {
    current = change(current);
    saveFailed = !saveGarage(current, storage);
  },
  unreadableCopy(): string | null {
    return readUnreadableCopy(storage);
  },
  erase(): boolean {
    current = emptyGarage();
    recovered = false;
    return eraseGarage(storage);
  },
};
