import { isNativeApp, nativePlatform } from "../native/platform";
import { openAppStorage } from "../store/appStorage";
import { browserStorage } from "../store/browserStorage";
import { createWebEntitlement, parseProOpen, type ProEntitlement } from "./entitlement";
import type { ProFeature } from "./features";
import { createProGate, type ProGate } from "./gate";
import { PRO_PRICE } from "./copy";
import { apiKeyFor, createRevenueCatStore } from "./revenueCatStore";
import { createStoreEntitlement, createUnavailableStore, type ProStore } from "./storeEntitlement";

export const PRO_OPEN = parseProOpen(import.meta.env.VITE_PRO_OPEN);

let entitlement: ProEntitlement = createWebEntitlement({ open: PRO_OPEN, storage: browserStorage() });
let gate: ProGate = createProGate(entitlement);
let snapshot = $state(gate.snapshot());
let price = $state<string | null>(null);
let canRestore = $state(false);

function follow(): void {
  const refresh = () => {
    snapshot = gate.snapshot();
    price = entitlement.price();
  };
  gate.subscribe(refresh);
  canRestore = entitlement.canRestore;
  refresh();
}

follow();

async function openStore(): Promise<ProStore> {
  const key = apiKeyFor(nativePlatform(), import.meta.env);
  if (key === null) return createUnavailableStore();
  try {
    return await createRevenueCatStore(key);
  } catch {
    return createUnavailableStore();
  }
}

export async function startPro(): Promise<void> {
  if (!isNativeApp()) return;
  const storage = await openAppStorage(() => {});
  const next = createStoreEntitlement({ open: PRO_OPEN, storage, store: await openStore() });
  entitlement = next;
  gate = createProGate(next);
  follow();
  void next.ready();
}

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
  get notice(): string | null {
    return snapshot.notice;
  },
  get price(): string {
    return price ?? PRO_PRICE;
  },
  get canRestore(): boolean {
    return canRestore;
  },
  get testingLock(): boolean {
    return PRO_OPEN && !snapshot.isPro;
  },
  setTestingLock(locked: boolean): void {
    entitlement.setTestingLock(locked);
  },
  unlock: () => gate.unlock(),
  restore: () => gate.restore(),
  dismiss: () => gate.dismiss(),
};

export function requirePro(feature: ProFeature): boolean {
  return gate.request(feature);
}
