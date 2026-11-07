import type { KeyValueStore } from "../store/garage";

export interface Entitlement {
  isPro(): boolean;
  purchase(): Promise<void>;
  restore(): Promise<void>;
  subscribe(listener: () => void): () => void;
}

export interface WebEntitlement extends Entitlement {
  testingLock(): boolean;
  setTestingLock(locked: boolean): void;
}

export const TESTING_LOCK_KEY = "tradepoint.testingLock";

export function parseProOpen(value: string | undefined): boolean {
  if (value === undefined) return true;
  const flag = value.trim().toLowerCase();
  return flag !== "false" && flag !== "0";
}

function readLock(storage: KeyValueStore): boolean {
  try {
    return storage.getItem(TESTING_LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

function writeLock(storage: KeyValueStore, locked: boolean): void {
  try {
    if (locked) storage.setItem(TESTING_LOCK_KEY, "1");
    else storage.removeItem(TESTING_LOCK_KEY);
  } catch {
    return;
  }
}

export function createWebEntitlement(options: { open: boolean; storage: KeyValueStore }): WebEntitlement {
  const { open, storage } = options;
  const listeners = new Set<() => void>();
  let purchased = false;
  let locked = open && readLock(storage);

  const isPro = () => purchased || (open && !locked);
  const notify = () => listeners.forEach((listener) => listener());

  return {
    isPro,
    async purchase() {
      purchased = true;
      notify();
    },
    async restore() {},
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    testingLock: () => open && !isPro(),
    setTestingLock(next) {
      if (!open) return;
      locked = next;
      if (next) purchased = false;
      writeLock(storage, next);
      notify();
    },
  };
}
