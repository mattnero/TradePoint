import { PRO_OWNED_KEY, createStoreEntitlement, createUnavailableStore, type ProStore } from "../src/pro/storeEntitlement";
import { TESTING_LOCK_KEY } from "../src/pro/entitlement";
import { apiKeyFor, purchaseOutcomeFromError } from "../src/pro/revenueCatStore";
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeStore(overrides: Partial<ProStore> = {}) {
  let push: (hasPro: boolean) => void = () => {};
  const store: ProStore & { push(hasPro: boolean): void } = {
    customerHasPro: async () => false,
    onChange: (listener) => {
      push = listener;
    },
    price: async () => "$4.99",
    buy: async () => "purchased",
    restore: async () => false,
    push: (hasPro) => push(hasPro),
    ...overrides,
  };
  return store;
}

const open = (storage: KeyValueStore, store: ProStore, isOpen = false) =>
  createStoreEntitlement({ open: isOpen, storage, store });

describe("store entitlement at launch", () => {
  it("starts from what was remembered, so Pro is there before the store answers", () => {
    const entitlement = open(fakeStorage({ [PRO_OWNED_KEY]: "1" }), fakeStore());
    expect(entitlement.isPro()).toBe(true);
  });

  it("starts locked on a fresh install", () => {
    expect(open(fakeStorage(), fakeStore()).isPro()).toBe(false);
  });

  it("learns about an existing purchase from the store and remembers it", async () => {
    const storage = fakeStorage();
    const entitlement = open(storage, fakeStore({ customerHasPro: async () => true, price: async () => null }));
    const changes: number[] = [];
    entitlement.subscribe(() => changes.push(1));
    await entitlement.ready();
    expect(entitlement.isPro()).toBe(true);
    expect(storage.data.get(PRO_OWNED_KEY)).toBe("1");
    expect(changes).toHaveLength(1);
  });

  it("drops Pro when the store says the purchase is gone, as after a refund", async () => {
    const storage = fakeStorage({ [PRO_OWNED_KEY]: "1" });
    const entitlement = open(storage, fakeStore({ customerHasPro: async () => false, price: async () => null }));
    const changes: number[] = [];
    entitlement.subscribe(() => changes.push(1));
    await entitlement.ready();
    expect(entitlement.isPro()).toBe(false);
    expect(storage.data.has(PRO_OWNED_KEY)).toBe(false);
    expect(changes).toHaveLength(1);
  });

  it("does not announce a change when the store agrees with what it remembered", async () => {
    const entitlement = open(
      fakeStorage({ [PRO_OWNED_KEY]: "1" }),
      fakeStore({ customerHasPro: async () => true, price: async () => null }),
    );
    const changes: number[] = [];
    entitlement.subscribe(() => changes.push(1));
    await entitlement.ready();
    expect(changes).toHaveLength(0);
  });

  it.each([true, false])("keeps what it remembered (%s) when the store can't be reached", async (remembered) => {
    const storage = fakeStorage(remembered ? { [PRO_OWNED_KEY]: "1" } : {});
    const entitlement = open(
      storage,
      fakeStore({
        customerHasPro: async () => {
          throw new Error("offline");
        },
      }),
    );
    await entitlement.ready();
    expect(entitlement.isPro()).toBe(remembered);
    expect(storage.data.has(PRO_OWNED_KEY)).toBe(remembered);
  });

  it("a slow launch check can't undo a purchase made while it was in flight", async () => {
    const late = deferred<boolean>();
    const entitlement = open(fakeStorage(), fakeStore({ customerHasPro: () => late.promise }));
    const checking = entitlement.ready();
    await entitlement.purchase();
    late.resolve(false);
    await checking;
    expect(entitlement.isPro()).toBe(true);
  });

  it("learns the price from the store, and has none until then", async () => {
    const entitlement = open(fakeStorage(), fakeStore({ price: async () => "$4.99" }));
    expect(entitlement.price()).toBeNull();
    await entitlement.ready();
    expect(entitlement.price()).toBe("$4.99");
  });

  it("announces the price when it arrives so an open sheet can show it", async () => {
    const entitlement = open(fakeStorage(), fakeStore({ price: async () => "$4.99" }));
    const changes: number[] = [];
    entitlement.subscribe(() => changes.push(1));
    await entitlement.ready();
    expect(changes).toHaveLength(1);
  });

  it("has no price when the store has no product", async () => {
    const entitlement = open(
      fakeStorage(),
      fakeStore({
        price: async () => {
          throw new Error("no offering");
        },
      }),
    );
    await entitlement.ready();
    expect(entitlement.price()).toBeNull();
  });
});

describe("store entitlement updates while running", () => {
  it("unlocks when the store reports a purchase from elsewhere", () => {
    const store = fakeStore();
    const entitlement = open(fakeStorage(), store);
    const changes: number[] = [];
    entitlement.subscribe(() => changes.push(1));
    store.push(true);
    expect(entitlement.isPro()).toBe(true);
    expect(changes).toHaveLength(1);
  });

  it("locks again on a refund and forgets it", () => {
    const storage = fakeStorage({ [PRO_OWNED_KEY]: "1" });
    const store = fakeStore();
    const entitlement = open(storage, store);
    store.push(false);
    expect(entitlement.isPro()).toBe(false);
    expect(storage.data.has(PRO_OWNED_KEY)).toBe(false);
  });
});

describe("store entitlement purchase", () => {
  it("unlocks, remembers and announces a completed purchase", async () => {
    const storage = fakeStorage();
    const entitlement = open(storage, fakeStore({ buy: async () => "purchased" }));
    const changes: number[] = [];
    entitlement.subscribe(() => changes.push(1));
    expect(await entitlement.purchase()).toBe("purchased");
    expect(entitlement.isPro()).toBe(true);
    expect(storage.data.get(PRO_OWNED_KEY)).toBe("1");
    expect(changes).toHaveLength(1);
  });

  it("a cancelled purchase changes nothing and says nothing", async () => {
    const storage = fakeStorage();
    const entitlement = open(storage, fakeStore({ buy: async () => "cancelled" }));
    const changes: number[] = [];
    entitlement.subscribe(() => changes.push(1));
    expect(await entitlement.purchase()).toBe("cancelled");
    expect(entitlement.isPro()).toBe(false);
    expect(storage.data.size).toBe(0);
    expect(changes).toHaveLength(0);
  });

  it("a pending purchase stays locked, then unlocks when the store approves it", async () => {
    const store = fakeStore({ buy: async () => "pending" });
    const entitlement = open(fakeStorage(), store);
    expect(await entitlement.purchase()).toBe("pending");
    expect(entitlement.isPro()).toBe(false);
    store.push(true);
    expect(entitlement.isPro()).toBe(true);
  });

  it("a failed purchase rejects and changes nothing", async () => {
    const entitlement = open(
      fakeStorage(),
      fakeStore({
        buy: async () => {
          throw new Error("billing unavailable");
        },
      }),
    );
    await expect(entitlement.purchase()).rejects.toThrow("billing unavailable");
    expect(entitlement.isPro()).toBe(false);
  });
});

describe("store entitlement restore", () => {
  it("restores a purchase made on this store account", async () => {
    const storage = fakeStorage();
    const entitlement = open(storage, fakeStore({ restore: async () => true }));
    expect(await entitlement.restore()).toBe("restored");
    expect(entitlement.isPro()).toBe(true);
    expect(storage.data.get(PRO_OWNED_KEY)).toBe("1");
  });

  it("says so when there is nothing to restore", async () => {
    const entitlement = open(fakeStorage(), fakeStore({ restore: async () => false }));
    expect(await entitlement.restore()).toBe("nothing");
    expect(entitlement.isPro()).toBe(false);
  });

  it("rejects when the store can't be reached, and keeps what it had", async () => {
    const entitlement = open(
      fakeStorage({ [PRO_OWNED_KEY]: "1" }),
      fakeStore({
        restore: async () => {
          throw new Error("offline");
        },
      }),
    );
    await expect(entitlement.restore()).rejects.toThrow("offline");
    expect(entitlement.isPro()).toBe(true);
  });

  it("can restore", () => {
    expect(open(fakeStorage(), fakeStore()).canRestore).toBe(true);
  });
});

describe("store entitlement with the build open for testing", () => {
  it("is Pro while open, and the testing lock works as on the web", () => {
    const storage = fakeStorage();
    const entitlement = open(storage, fakeStore(), true);
    expect(entitlement.isPro()).toBe(true);
    entitlement.setTestingLock(true);
    expect(entitlement.isPro()).toBe(false);
    expect(storage.data.get(TESTING_LOCK_KEY)).toBe("1");
  });

  it("an owned purchase beats the lock", () => {
    const entitlement = open(fakeStorage({ [PRO_OWNED_KEY]: "1" }), fakeStore(), true);
    entitlement.setTestingLock(true);
    expect(entitlement.isPro()).toBe(true);
  });

  it("ignores the lock on a closed build", () => {
    const entitlement = open(fakeStorage(), fakeStore());
    entitlement.setTestingLock(true);
    expect(entitlement.testingLock()).toBe(false);
  });
});

describe("store entitlement with storage that throws", () => {
  it("still tracks Pro in memory", async () => {
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
    const entitlement = open(broken, fakeStore({ buy: async () => "purchased" }));
    expect(entitlement.isPro()).toBe(false);
    await entitlement.purchase();
    expect(entitlement.isPro()).toBe(true);
  });
});

describe("purchaseOutcomeFromError", () => {
  it("reads the store's cancelled and pending codes", () => {
    expect(purchaseOutcomeFromError({ code: "1" })).toBe("cancelled");
    expect(purchaseOutcomeFromError({ code: "20" })).toBe("pending");
  });

  it("reads the userCancelled flag some platforms set instead", () => {
    expect(purchaseOutcomeFromError({ code: "2", userCancelled: true })).toBe("cancelled");
  });

  it("treats everything else as a real failure", () => {
    expect(purchaseOutcomeFromError({ code: "2" })).toBeNull();
    expect(purchaseOutcomeFromError(new Error("boom"))).toBeNull();
    expect(purchaseOutcomeFromError(null)).toBeNull();
    expect(purchaseOutcomeFromError("1")).toBeNull();
  });
});

describe("unavailable store", () => {
  it("never grants Pro for free: buying and restoring fail, and a remembered purchase still counts", async () => {
    const entitlement = createStoreEntitlement({
      open: false,
      storage: fakeStorage(),
      store: createUnavailableStore(),
    });
    await entitlement.ready();
    await expect(entitlement.purchase()).rejects.toThrow();
    await expect(entitlement.restore()).rejects.toThrow();
    expect(entitlement.isPro()).toBe(false);
    const remembered = createStoreEntitlement({
      open: false,
      storage: fakeStorage({ [PRO_OWNED_KEY]: "1" }),
      store: createUnavailableStore(),
    });
    await remembered.ready();
    expect(remembered.isPro()).toBe(true);
  });
});

describe("apiKeyFor", () => {
  const env = { VITE_REVENUECAT_ANDROID_KEY: " goog_abc ", VITE_REVENUECAT_IOS_KEY: "appl_xyz" };

  it("picks the key for the platform", () => {
    expect(apiKeyFor("android", env)).toBe("goog_abc");
    expect(apiKeyFor("ios", env)).toBe("appl_xyz");
  });

  it("is null for the web, an unknown platform, or a missing or blank key", () => {
    expect(apiKeyFor("web", env)).toBeNull();
    expect(apiKeyFor("android", {})).toBeNull();
    expect(apiKeyFor("android", { VITE_REVENUECAT_ANDROID_KEY: "  " })).toBeNull();
  });
});
