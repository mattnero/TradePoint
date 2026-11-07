import type { Entitlement } from "./entitlement";
import type { ProFeature } from "./features";

export interface GateSnapshot {
  isPro: boolean;
  sheetOpen: boolean;
  feature: ProFeature | null;
  working: boolean;
  error: string | null;
}

export interface ProGate {
  request(feature: ProFeature): boolean;
  dismiss(): void;
  unlock(): Promise<void>;
  snapshot(): GateSnapshot;
  subscribe(listener: () => void): () => void;
}

export const PURCHASE_FAILED = "The purchase didn't go through. Try again in a moment.";

export function createProGate(entitlement: Entitlement): ProGate {
  const listeners = new Set<() => void>();
  let sheetOpen = false;
  let feature: ProFeature | null = null;
  let working = false;
  let error: string | null = null;
  let suppressed = false;

  const notify = () => listeners.forEach((listener) => listener());

  entitlement.subscribe(() => {
    if (entitlement.isPro()) {
      sheetOpen = false;
      feature = null;
      error = null;
    }
    notify();
  });

  return {
    request(requested) {
      if (entitlement.isPro()) return true;
      if (!suppressed) {
        sheetOpen = true;
        feature = requested;
        error = null;
        notify();
      }
      return false;
    },
    dismiss() {
      suppressed = true;
      sheetOpen = false;
      feature = null;
      error = null;
      notify();
    },
    async unlock() {
      if (working) return;
      working = true;
      error = null;
      notify();
      try {
        await entitlement.purchase();
        sheetOpen = false;
        feature = null;
      } catch {
        error = PURCHASE_FAILED;
      } finally {
        working = false;
        notify();
      }
    },
    snapshot: () => ({ isPro: entitlement.isPro(), sheetOpen, feature, working, error }),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
