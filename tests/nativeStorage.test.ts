import { BACKUP_KEY, STORAGE_KEY, type KeyValueStore } from "../src/store/garage";
import { openNativeStore, openWriteThroughStore, type AsyncKeyValueStore } from "../src/store/writeThrough";

function fakeBackend(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const log: string[] = [];
  let failNext = 0;
  const backend: AsyncKeyValueStore & { data: Map<string, string>; log: string[]; fail(times: number): void } = {
    data,
    log,
    fail(times) {
      failNext = times;
    },
    keys: async () => [...data.keys()],
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, value.length % 3));
      if (failNext > 0) {
        failNext -= 1;
        throw new Error("disk full");
      }
      log.push(`set ${key}=${value}`);
      data.set(key, value);
    },
    remove: async (key) => {
      log.push(`remove ${key}`);
      data.delete(key);
    },
  };
  return backend;
}

function fakeLegacy(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const garageKeys = [STORAGE_KEY, BACKUP_KEY];

describe("openWriteThroughStore", () => {
  it("reads everything the backend holds before returning, then answers synchronously", async () => {
    const backend = fakeBackend({ [STORAGE_KEY]: "garage", other: "x" });
    const store = await openWriteThroughStore(backend, () => {});
    expect(store.getItem(STORAGE_KEY)).toBe("garage");
    expect(store.getItem("other")).toBe("x");
    expect(store.getItem("missing")).toBeNull();
  });

  it("shows a write immediately and lands it in the backend", async () => {
    const backend = fakeBackend();
    const store = await openWriteThroughStore(backend, () => {});
    store.setItem(STORAGE_KEY, "v1");
    expect(store.getItem(STORAGE_KEY)).toBe("v1");
    expect(await store.settled()).toBe(true);
    expect(backend.data.get(STORAGE_KEY)).toBe("v1");
  });

  it("lands writes in the order they were made, so the last save wins", async () => {
    const backend = fakeBackend();
    const store = await openWriteThroughStore(backend, () => {});
    store.setItem("k", "aaaa");
    store.setItem("k", "b");
    store.removeItem("k");
    store.setItem("k", "cc");
    await store.settled();
    expect(backend.log).toEqual(["set k=aaaa", "set k=b", "remove k", "set k=cc"]);
    expect(backend.data.get("k")).toBe("cc");
  });

  it("reports a write the backend refused and keeps going with later writes", async () => {
    const backend = fakeBackend();
    let errors = 0;
    const store = await openWriteThroughStore(backend, () => (errors += 1));
    backend.fail(1);
    store.setItem("k", "lost");
    store.setItem("k", "kept");
    expect(await store.settled()).toBe(false);
    expect(errors).toBe(1);
    expect(backend.data.get("k")).toBe("kept");
  });

  it("fails to open when the backend can't be read", async () => {
    const backend = fakeBackend();
    backend.keys = async () => {
      throw new Error("no plugin");
    };
    await expect(openWriteThroughStore(backend, () => {})).rejects.toThrow("no plugin");
  });
});

describe("openNativeStore", () => {
  it("copies a garage from the old localStorage on the first native launch, then clears the old copy", async () => {
    const backend = fakeBackend();
    const legacy = fakeLegacy({ [STORAGE_KEY]: "web garage", [BACKUP_KEY]: "unreadable", "tradepoint.testingLock": "1" });
    const store = await openNativeStore(backend, legacy, garageKeys, () => {});
    expect(store.getItem(STORAGE_KEY)).toBe("web garage");
    expect(backend.data.get(STORAGE_KEY)).toBe("web garage");
    expect(backend.data.get(BACKUP_KEY)).toBe("unreadable");
    expect(legacy.data.has(STORAGE_KEY)).toBe(false);
    expect(legacy.data.has(BACKUP_KEY)).toBe(false);
    expect(legacy.data.get("tradepoint.testingLock")).toBe("1");
  });

  it("never overwrites a garage already in native storage, and still clears the old copy", async () => {
    const backend = fakeBackend({ [STORAGE_KEY]: "native garage" });
    const legacy = fakeLegacy({ [STORAGE_KEY]: "stale web garage" });
    const store = await openNativeStore(backend, legacy, garageKeys, () => {});
    expect(store.getItem(STORAGE_KEY)).toBe("native garage");
    expect(backend.data.get(STORAGE_KEY)).toBe("native garage");
    expect(legacy.data.size).toBe(0);
  });

  it("does not bring an erased garage back on the next launch", async () => {
    const backend = fakeBackend();
    const legacy = fakeLegacy({ [STORAGE_KEY]: "web garage" });
    const first = await openNativeStore(backend, legacy, garageKeys, () => {});
    first.removeItem(STORAGE_KEY);
    await first.settled();
    const second = await openNativeStore(backend, legacy, garageKeys, () => {});
    expect(second.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps the old copy when native storage refused it, so nothing is lost", async () => {
    const backend = fakeBackend();
    backend.fail(1);
    const legacy = fakeLegacy({ [STORAGE_KEY]: "web garage" });
    let errors = 0;
    await openNativeStore(backend, legacy, garageKeys, () => (errors += 1));
    expect(legacy.data.get(STORAGE_KEY)).toBe("web garage");
    expect(errors).toBe(1);
    const retry = await openNativeStore(backend, legacy, garageKeys, () => {});
    expect(retry.getItem(STORAGE_KEY)).toBe("web garage");
    expect(legacy.data.has(STORAGE_KEY)).toBe(false);
  });

  it("opens normally when the old storage can't be read at all", async () => {
    const backend = fakeBackend({ [STORAGE_KEY]: "native garage" });
    const legacy: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const store = await openNativeStore(backend, legacy, garageKeys, () => {});
    expect(store.getItem(STORAGE_KEY)).toBe("native garage");
  });

  it("touches nothing when there is no old copy", async () => {
    const backend = fakeBackend({ [STORAGE_KEY]: "native garage" });
    await openNativeStore(backend, fakeLegacy(), garageKeys, () => {});
    expect(backend.log).toEqual([]);
  });
});
