import type { KeyValueStore } from "../store/garage";
import { readLock, writeLock, type ProEntitlement, type PurchaseOutcome, type RestoreOutcome } from "./entitlement";

export const PRO_OWNED_KEY = "tradepoint.proOwned";

export interface ProStore {
  customerHasPro(): Promise<boolean>;
  onChange(listener: (hasPro: boolean) => void): void;
  price(): Promise<string | null>;
  buy(): Promise<PurchaseOutcome>;
  restore(): Promise<boolean>;
}

export interface StoreEntitlement extends ProEntitlement {
  ready(): Promise<void>;
}

function readOwned(storage: KeyValueStore): boolean {
  try {
    return storage.getItem(PRO_OWNED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeOwned(storage: KeyValueStore, owned: boolean): void {
  try {
    if (owned) storage.setItem(PRO_OWNED_KEY, "1");
    else storage.removeItem(PRO_OWNED_KEY);
  } catch {
    return;
  }
}

export function createStoreEntitlement(options: {
  open: boolean;
  storage: KeyValueStore;
  store: ProStore;
}): StoreEntitlement {
  const { open, storage, store } = options;
  const listeners = new Set<() => void>();
  let owned = readOwned(storage);
  let locked = open && readLock(storage);
  let price: string | null = null;
  let knowledge = 0;

  const isPro = () => owned || (open && !locked);
  const notify = () => listeners.forEach((listener) => listener());

  const learn = (hasPro: boolean) => {
    knowledge += 1;
    if (hasPro === owned) return;
    owned = hasPro;
    writeOwned(storage, hasPro);
    notify();
  };

  store.onChange(learn);

  return {
    isPro,
    price: () => price,
    canRestore: true,
    async ready() {
      const startedAt = knowledge;
      const [status, found] = await Promise.allSettled([store.customerHasPro(), store.price()]);
      const priceChanged = found.status === "fulfilled" && found.value !== price;
      if (found.status === "fulfilled") price = found.value;
      if (status.status === "fulfilled" && knowledge === startedAt) learn(status.value);
      if (priceChanged) notify();
    },
    async purchase() {
      const outcome = await store.buy();
      if (outcome === "purchased") learn(true);
      return outcome;
    },
    async restore(): Promise<RestoreOutcome> {
      const found = await store.restore();
      learn(found);
      return found ? "restored" : "nothing";
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    testingLock: () => open && !isPro(),
    setTestingLock(next) {
      if (!open) return;
      locked = next;
      writeLock(storage, next);
      notify();
    },
  };
}

export function createUnavailableStore(): ProStore {
  const unavailable = () => Promise.reject(new Error("The store isn't available in this build"));
  return {
    customerHasPro: unavailable,
    onChange: () => {},
    price: async () => null,
    buy: unavailable,
    restore: unavailable,
  };
}
