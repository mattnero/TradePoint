import {
  emptyGarage,
  eraseGarage,
  loadGarage,
  readUnreadableCopy,
  saveGarage,
  type Garage,
  type KeyValueStore,
} from "./garage";
import type { Vehicle } from "../model/vehicle";

function browserStorage(): KeyValueStore {
  try {
    const probe = "tradepoint.probe";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => void memory.set(key, value),
      removeItem: (key) => void memory.delete(key),
    };
  }
}

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
    return current.vehicles[0];
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
