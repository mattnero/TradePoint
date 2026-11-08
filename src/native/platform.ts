export const PUBLIC_APP_URL = "https://mattnero.github.io/TradePoint/";

export function isNativeApp(): boolean {
  const capacitor = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export function shareUrl(code: string, where: { native: boolean; origin: string; pathname: string }): string {
  const base = where.native ? PUBLIC_APP_URL : `${where.origin}${where.pathname}`;
  return `${base}#d=${code}`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function isShareCancel(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return error instanceof Error && /cancel/i.test(error.message);
}
