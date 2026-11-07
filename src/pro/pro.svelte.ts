import { browserStorage } from "../store/browserStorage";
import { createWebEntitlement, parseProOpen } from "./entitlement";
import type { ProFeature } from "./features";
import { createProGate } from "./gate";

export const PRO_OPEN = parseProOpen(import.meta.env.VITE_PRO_OPEN);

const entitlement = createWebEntitlement({ open: PRO_OPEN, storage: browserStorage() });
const gate = createProGate(entitlement);

let snapshot = $state(gate.snapshot());
gate.subscribe(() => {
  snapshot = gate.snapshot();
});

export const pro = {
  get isPro(): boolean {
    return snapshot.isPro;
  },
  get sheetOpen(): boolean {
    return snapshot.sheetOpen;
  },
  get working(): boolean {
    return snapshot.working;
  },
  get error(): string | null {
    return snapshot.error;
  },
  get testingLock(): boolean {
    return PRO_OPEN && !snapshot.isPro;
  },
  setTestingLock(locked: boolean): void {
    entitlement.setTestingLock(locked);
  },
  unlock: () => gate.unlock(),
  dismiss: () => gate.dismiss(),
};

export function requirePro(feature: ProFeature): boolean {
  return gate.request(feature);
}
