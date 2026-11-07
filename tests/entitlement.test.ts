import { createWebEntitlement, parseProOpen, TESTING_LOCK_KEY } from "../src/pro/entitlement";
import type { KeyValueStore } from "../src/store/garage";

function fakeStorage(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("parseProOpen", () => {
  it("defaults to open when the flag is missing or empty", () => {
    expect(parseProOpen(undefined)).toBe(true);
    expect(parseProOpen("")).toBe(true);
  });

  it("is closed only for an explicit false", () => {
    expect(parseProOpen("false")).toBe(false);
    expect(parseProOpen("FALSE")).toBe(false);
    expect(parseProOpen("0")).toBe(false);
    expect(parseProOpen("true")).toBe(true);
    expect(parseProOpen("1")).toBe(true);
  });
});

describe("web entitlement", () => {
  it("is Pro for everyone while the build flag is open", () => {
    expect(createWebEntitlement({ open: true, storage: fakeStorage() }).isPro()).toBe(true);
  });

  it("is not Pro when the flag is closed", () => {
    expect(createWebEntitlement({ open: false, storage: fakeStorage() }).isPro()).toBe(false);
  });

  it("purchase makes a closed build Pro and tells subscribers", async () => {
    const entitlement = createWebEntitlement({ open: false, storage: fakeStorage() });
    const calls: number[] = [];
    entitlement.subscribe(() => calls.push(1));
    await entitlement.purchase();
    expect(entitlement.isPro()).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("restore with nothing to restore leaves a closed build locked", async () => {
    const entitlement = createWebEntitlement({ open: false, storage: fakeStorage() });
    await entitlement.restore();
    expect(entitlement.isPro()).toBe(false);
  });

  it("stops notifying after unsubscribe", async () => {
    const entitlement = createWebEntitlement({ open: false, storage: fakeStorage() });
    const calls: number[] = [];
    const stop = entitlement.subscribe(() => calls.push(1));
    stop();
    await entitlement.purchase();
    expect(calls).toHaveLength(0);
  });

  describe("testing lock", () => {
    it("locks an open build and remembers it across loads", () => {
      const storage = fakeStorage();
      const first = createWebEntitlement({ open: true, storage });
      first.setTestingLock(true);
      expect(first.isPro()).toBe(false);
      expect(first.testingLock()).toBe(true);
      expect(createWebEntitlement({ open: true, storage }).isPro()).toBe(false);
    });

    it("unlocks again and forgets the stored lock", () => {
      const storage = fakeStorage();
      const entitlement = createWebEntitlement({ open: true, storage });
      entitlement.setTestingLock(true);
      entitlement.setTestingLock(false);
      expect(entitlement.isPro()).toBe(true);
      expect(storage.data.has(TESTING_LOCK_KEY)).toBe(false);
    });

    it("is ignored on a closed build, even if a stale value is stored", () => {
      const storage = fakeStorage({ [TESTING_LOCK_KEY]: "1" });
      const entitlement = createWebEntitlement({ open: false, storage });
      entitlement.setTestingLock(true);
      expect(entitlement.testingLock()).toBe(false);
      expect(storage.data.get(TESTING_LOCK_KEY)).toBe("1");
    });

    it("lets a purchase override the lock", async () => {
      const entitlement = createWebEntitlement({ open: true, storage: fakeStorage() });
      entitlement.setTestingLock(true);
      await entitlement.purchase();
      expect(entitlement.isPro()).toBe(true);
      expect(entitlement.testingLock()).toBe(false);
    });

    it("notifies subscribers when it changes", () => {
      const entitlement = createWebEntitlement({ open: true, storage: fakeStorage() });
      const calls: number[] = [];
      entitlement.subscribe(() => calls.push(1));
      entitlement.setTestingLock(true);
      expect(calls).toHaveLength(1);
    });

    it("survives storage that throws", () => {
      const broken: KeyValueStore = {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      };
      const entitlement = createWebEntitlement({ open: true, storage: broken });
      expect(entitlement.isPro()).toBe(true);
      entitlement.setTestingLock(true);
      expect(entitlement.isPro()).toBe(false);
    });
  });
});
