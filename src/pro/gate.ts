import type { Entitlement } from "./entitlement";
import type { ProFeature } from "./features";

export interface GateSnapshot {
  isPro: boolean;
  sheetOpen: boolean;
  feature: ProFeature | null;
  working: boolean;
  error: string | null;
  notice: string | null;
}

export interface ProGate {
  request(feature: ProFeature): boolean;
  dismiss(): void;
  unlock(): Promise<void>;
  restore(): Promise<void>;
  snapshot(): GateSnapshot;
  subscribe(listener: () => void): () => void;
}

export const PURCHASE_FAILED = "The purchase didn't go through. Try again in a moment.";
export const PURCHASE_PENDING = "Your purchase is waiting for approval. Pro unlocks as soon as it goes through.";
export const RESTORE_FAILED = "Couldn't reach the store. Try again when you have signal.";
export const NOTHING_TO_RESTORE = "No Pro purchase found for this store account.";

export function createProGate(entitlement: Entitlement): ProGate {
  const listeners = new Set<() => void>();
  let sheetOpen = false;
  let feature: ProFeature | null = null;
  let working = false;
  let error: string | null = null;
  let notice: string | null = null;
  let suppressed = false;

  const notify = () => listeners.forEach((listener) => listener());

  entitlement.subscribe(() => {
    if (entitlement.isPro()) {
      sheetOpen = false;
      feature = null;
      error = null;
      notice = null;
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
        notice = null;
        notify();
      }
      return false;
    },
    dismiss() {
      suppressed = true;
      sheetOpen = false;
      feature = null;
      error = null;
      notice = null;
      notify();
    },
    async unlock() {
      if (working) return;
      working = true;
      error = null;
      notice = null;
      notify();
      try {
        const outcome = await entitlement.purchase();
        if (outcome === "purchased") {
          sheetOpen = false;
          feature = null;
        } else if (outcome === "pending") {
          notice = PURCHASE_PENDING;
        }
      } catch {
        error = PURCHASE_FAILED;
      } finally {
        working = false;
        notify();
      }
    },
    async restore() {
      if (working) return;
      working = true;
      error = null;
      notice = null;
      notify();
      try {
        const outcome = await entitlement.restore();
        if (outcome === "restored") {
          sheetOpen = false;
          feature = null;
        } else {
          notice = NOTHING_TO_RESTORE;
        }
      } catch {
        error = RESTORE_FAILED;
      } finally {
        working = false;
        notify();
      }
    },
    snapshot: () => ({ isPro: entitlement.isPro(), sheetOpen, feature, working, error, notice }),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
