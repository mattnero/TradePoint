import { isNativeApp } from "../native/platform";
import { browserStorage } from "./browserStorage";
import { BACKUP_KEY, STORAGE_KEY, type KeyValueStore } from "./garage";
import { openNativeStore, type AsyncKeyValueStore } from "./writeThrough";

async function preferencesBackend(): Promise<AsyncKeyValueStore> {
  const { Preferences } = await import("@capacitor/preferences");
  return {
    keys: async () => (await Preferences.keys()).keys,
    get: async (key) => (await Preferences.get({ key })).value,
    set: (key, value) => Preferences.set({ key, value }),
    remove: (key) => Preferences.remove({ key }),
  };
}

export async function openAppStorage(onWriteError: () => void): Promise<KeyValueStore> {
  const web = browserStorage();
  if (!isNativeApp()) return web;
  try {
    return await openNativeStore(await preferencesBackend(), web, [STORAGE_KEY, BACKUP_KEY], onWriteError);
  } catch {
    return web;
  }
}
