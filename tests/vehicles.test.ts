import { createVehicle, type Vehicle } from "../src/model/vehicle";
import { emptyGarage, type Garage } from "../src/store/garage";
import {
  addVehicle,
  canAddVehicle,
  isUsable,
  removeVehicle,
  replaceVehicle,
  selectVehicle,
  selectedVehicle,
  vehicleLabel,
} from "../src/store/vehicles";

const car = (id: string, year: number, make: string, model: string): Vehicle =>
  createVehicle({ year, make, model, odometer: { date: "2026-11-02", km: 100000 } }, id);

const santaFe = car("a", 2019, "Hyundai", "Santa Fe");
const carnival = car("b", 2024, "Kia", "Carnival");
const model3 = car("c", 2022, "Tesla", "Model 3");

const three: Garage = { ...emptyGarage(), vehicles: [santaFe, carnival, model3] };

describe("selectedVehicle", () => {
  it("is the first vehicle until one is chosen", () => {
    expect(selectedVehicle(three)).toBe(santaFe);
  });

  it("is the chosen vehicle", () => {
    expect(selectedVehicle({ ...three, selectedVehicleId: "b" })).toBe(carnival);
  });

  it("falls back to the first vehicle when the chosen id is gone", () => {
    expect(selectedVehicle({ ...three, selectedVehicleId: "zzz" })).toBe(santaFe);
  });

  it("is undefined for an empty garage", () => {
    expect(selectedVehicle(emptyGarage())).toBeUndefined();
  });
});

describe("selectVehicle", () => {
  it("records the choice", () => {
    expect(selectVehicle(three, "c").selectedVehicleId).toBe("c");
  });

  it("ignores an id no vehicle has", () => {
    expect(selectVehicle(three, "zzz")).toBe(three);
  });
});

describe("addVehicle", () => {
  it("appends the vehicle and selects it", () => {
    const next = addVehicle({ ...emptyGarage(), vehicles: [santaFe] }, carnival);
    expect(next.vehicles).toEqual([santaFe, carnival]);
    expect(selectedVehicle(next)).toBe(carnival);
  });

  it("works on an empty garage", () => {
    const next = addVehicle(emptyGarage(), santaFe);
    expect(next.vehicles).toEqual([santaFe]);
    expect(selectedVehicle(next)).toBe(santaFe);
  });

  it("leaves the other vehicles and the deals alone", () => {
    const deal = { id: "d", label: "x" } as never;
    const next = addVehicle({ ...three, deals: [deal] }, car("d", 2020, "Honda", "Civic"));
    expect(next.vehicles.slice(0, 3)).toEqual([santaFe, carnival, model3]);
    expect(next.deals).toEqual([deal]);
  });
});

describe("replaceVehicle", () => {
  it("swaps the vehicle with the same id and nothing else", () => {
    const updated = { ...carnival, trim: "SX" };
    const next = replaceVehicle({ ...three, selectedVehicleId: "b" }, updated);
    expect(next.vehicles).toEqual([santaFe, updated, model3]);
    expect(next.selectedVehicleId).toBe("b");
  });

  it("ignores a vehicle that isn't in the garage", () => {
    expect(replaceVehicle(three, car("zzz", 2000, "X", "Y"))).toBe(three);
  });
});

describe("removeVehicle", () => {
  it("removes one vehicle and keeps the selection when another was removed", () => {
    const next = removeVehicle({ ...three, selectedVehicleId: "b" }, "c");
    expect(next.vehicles).toEqual([santaFe, carnival]);
    expect(next.selectedVehicleId).toBe("b");
  });

  it("falls back to the first remaining vehicle when the selected one is removed", () => {
    const next = removeVehicle({ ...three, selectedVehicleId: "b" }, "b");
    expect(next.vehicles).toEqual([santaFe, model3]);
    expect(next).not.toHaveProperty("selectedVehicleId");
    expect(selectedVehicle(next)).toBe(santaFe);
  });

  it("removing the implicit first vehicle makes the next one selected", () => {
    expect(selectedVehicle(removeVehicle(three, "a"))).toBe(carnival);
  });

  it("clears everything for the last vehicle", () => {
    const next = removeVehicle({ ...emptyGarage(), vehicles: [santaFe], selectedVehicleId: "a" }, "a");
    expect(next).toEqual(emptyGarage());
  });

  it("ignores an unknown id", () => {
    expect(removeVehicle(three, "zzz")).toBe(three);
  });

  it("keeps saved deals", () => {
    const deal = { id: "d" } as never;
    expect(removeVehicle({ ...three, deals: [deal] }, "a").deals).toEqual([deal]);
  });
});

describe("what Pro changes", () => {
  it("lets anyone add a first vehicle, and only Pro add more", () => {
    expect(canAddVehicle(emptyGarage(), false)).toBe(true);
    expect(canAddVehicle({ ...emptyGarage(), vehicles: [santaFe] }, false)).toBe(false);
    expect(canAddVehicle({ ...emptyGarage(), vehicles: [santaFe] }, true)).toBe(true);
  });

  it("makes every vehicle usable with Pro", () => {
    for (const v of three.vehicles) expect(isUsable(three, v.id, true)).toBe(true);
  });

  it("without Pro, only the selected vehicle is usable and the rest are read-only", () => {
    const g = { ...three, selectedVehicleId: "b" };
    expect(isUsable(g, "b", false)).toBe(true);
    expect(isUsable(g, "a", false)).toBe(false);
    expect(isUsable(g, "c", false)).toBe(false);
  });

  it("without Pro and with no choice made, the first vehicle is the usable one", () => {
    expect(isUsable(three, "a", false)).toBe(true);
    expect(isUsable(three, "b", false)).toBe(false);
  });

  it("never loses a vehicle just because Pro is off", () => {
    expect(three.vehicles).toHaveLength(3);
    expect(selectedVehicle(three)).toBeDefined();
  });
});

describe("vehicleLabel", () => {
  it("is year and model, with the trim when there is one", () => {
    expect(vehicleLabel(santaFe)).toBe("2019 Santa Fe");
    expect(vehicleLabel({ ...carnival, trim: "SX" })).toBe("2024 Carnival SX");
  });

  it("keeps the make out of it to stay short", () => {
    expect(vehicleLabel(model3)).not.toContain("Tesla");
  });
});
