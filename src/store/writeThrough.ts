import type { KeyValueStore } from "./garage";

export interface AsyncKeyValueStore {
  keys(): Promise<string[]>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface WriteThroughStore extends KeyValueStore {
  settled(): Promise<boolean>;
}

export async function openWriteThroughStore(
  backend: AsyncKeyValueStore,
  onWriteError: () => void,
): Promise<WriteThroughStore> {
  const keys = await backend.keys();
  const values = await Promise.all(keys.map((key) => backend.get(key)));
  const memory = new Map<string, string>();
  keys.forEach((key, i) => {
    const value = values[i];
    if (value !== null && value !== undefined) memory.set(key, value);
  });

  let queue = Promise.resolve();
  let allLanded = true;
  const enqueue = (write: () => Promise<void>) => {
    queue = queue.then(write).catch(() => {
      allLanded = false;
      onWriteError();
    });
  };

  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
      enqueue(() => backend.set(key, value));
    },
    removeItem: (key) => {
      memory.delete(key);
      enqueue(() => backend.remove(key));
    },
    settled: async () => {
      await queue;
      return allLanded;
    },
  };
}

function readQuietly(store: KeyValueStore, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function removeQuietly(store: KeyValueStore, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    return;
  }
}

export async function openNativeStore(
  backend: AsyncKeyValueStore,
  legacy: KeyValueStore,
  legacyKeys: string[],
  onWriteError: () => void,
): Promise<WriteThroughStore> {
  const store = await openWriteThroughStore(backend, onWriteError);
  const found = legacyKeys.flatMap((key) => {
    const value = readQuietly(legacy, key);
    return value === null ? [] : [[key, value] as const];
  });
  if (found.length === 0) return store;

  const [primary] = legacyKeys;
  if (primary !== undefined && store.getItem(primary) === null) {
    for (const [key, value] of found) store.setItem(key, value);
  }
  if (await store.settled()) {
    for (const key of legacyKeys) removeQuietly(legacy, key);
  }
  return store;
}
