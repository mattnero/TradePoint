import { PUBLIC_APP_URL, bytesToBase64, isNativeApp, isShareCancel, shareUrl } from "../src/native/platform";

describe("shareUrl", () => {
  it("points at the public web app from inside the native app", () => {
    expect(shareUrl("abc_123", { native: true, origin: "https://localhost", pathname: "/" })).toBe(
      "https://mattnero.github.io/TradePoint/#d=abc_123",
    );
    expect(PUBLIC_APP_URL).toBe("https://mattnero.github.io/TradePoint/");
  });

  it("uses the current address on the web", () => {
    expect(shareUrl("abc", { native: false, origin: "https://mattnero.github.io", pathname: "/TradePoint/" })).toBe(
      "https://mattnero.github.io/TradePoint/#d=abc",
    );
    expect(shareUrl("abc", { native: false, origin: "http://localhost:5173", pathname: "/TradePoint/" })).toBe(
      "http://localhost:5173/TradePoint/#d=abc",
    );
  });
});

describe("bytesToBase64", () => {
  it("encodes small inputs like btoa", () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe("");
    expect(bytesToBase64(new TextEncoder().encode("%PDF-1.7"))).toBe(btoa("%PDF-1.7"));
    expect(bytesToBase64(new Uint8Array([0, 255, 128, 1]))).toBe(btoa("\u0000ÿ\u0080\u0001"));
  });

  it("round-trips a large binary file without overflowing the call stack", () => {
    const bytes = new Uint8Array(300_000).map((_, i) => (i * 31) % 256);
    const back = Uint8Array.from(atob(bytesToBase64(bytes)), (c) => c.charCodeAt(0));
    expect(back.length).toBe(bytes.length);
    expect(back.every((v, i) => v === bytes[i])).toBe(true);
  });
});

describe("isNativeApp", () => {
  afterEach(() => {
    delete (globalThis as { Capacitor?: unknown }).Capacitor;
  });

  it("is false in a plain browser", () => {
    expect(isNativeApp()).toBe(false);
  });

  it("is true only when Capacitor says it is native", () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    expect(isNativeApp()).toBe(true);
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => false };
    expect(isNativeApp()).toBe(false);
  });
});

describe("isShareCancel", () => {
  it("recognises the user closing the share sheet", () => {
    expect(isShareCancel(new Error("Share canceled"))).toBe(true);
    expect(isShareCancel(new Error("Share cancelled by user"))).toBe(true);
    expect(isShareCancel(new DOMException("x", "AbortError"))).toBe(true);
  });

  it("does not hide real failures", () => {
    expect(isShareCancel(new Error("File not found"))).toBe(false);
    expect(isShareCancel("nope")).toBe(false);
  });
});
