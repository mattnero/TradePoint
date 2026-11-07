import { createProGate } from "../src/pro/gate";
import type { Entitlement } from "../src/pro/entitlement";

function fakeEntitlement(initiallyPro: boolean, purchase: () => Promise<void> = async () => {}) {
  let pro = initiallyPro;
  const listeners = new Set<() => void>();
  const entitlement: Entitlement & { grant(): void } = {
    isPro: () => pro,
    purchase: async () => {
      await purchase();
      pro = true;
      listeners.forEach((l) => l());
    },
    restore: async () => {},
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    grant() {
      pro = true;
      listeners.forEach((l) => l());
    },
  };
  return entitlement;
}

describe("pro gate", () => {
  it("lets Pro users straight through without opening the sheet", () => {
    const gate = createProGate(fakeEntitlement(true));
    expect(gate.request("chart")).toBe(true);
    expect(gate.snapshot().sheetOpen).toBe(false);
  });

  it("refuses a locked feature and opens the sheet for it", () => {
    const gate = createProGate(fakeEntitlement(false));
    expect(gate.request("equity")).toBe(false);
    expect(gate.snapshot()).toMatchObject({ sheetOpen: true, feature: "equity", isPro: false });
  });

  it("never opens the sheet by itself", () => {
    const gate = createProGate(fakeEntitlement(false));
    expect(gate.snapshot().sheetOpen).toBe(false);
  });

  it("Not now closes the sheet and keeps it closed for the rest of the session", () => {
    const gate = createProGate(fakeEntitlement(false));
    gate.request("equity");
    gate.dismiss();
    expect(gate.snapshot().sheetOpen).toBe(false);
    expect(gate.request("chart")).toBe(false);
    expect(gate.snapshot().sheetOpen).toBe(false);
  });

  it("dismissing does not unlock anything", () => {
    const gate = createProGate(fakeEntitlement(false));
    gate.request("pdf");
    gate.dismiss();
    expect(gate.snapshot().isPro).toBe(false);
  });

  it("a new gate starts unsuppressed", () => {
    const first = createProGate(fakeEntitlement(false));
    first.request("equity");
    first.dismiss();
    const second = createProGate(fakeEntitlement(false));
    second.request("equity");
    expect(second.snapshot().sheetOpen).toBe(true);
  });

  it("unlock closes the sheet and the feature passes afterwards", async () => {
    const gate = createProGate(fakeEntitlement(false));
    gate.request("compare");
    await gate.unlock();
    expect(gate.snapshot()).toMatchObject({ sheetOpen: false, isPro: true, working: false, error: null });
    expect(gate.request("compare")).toBe(true);
  });

  it("shows working while the purchase is pending", async () => {
    let finish: () => void = () => {};
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const gate = createProGate(fakeEntitlement(false, () => pending));
    gate.request("equity");
    const unlocking = gate.unlock();
    expect(gate.snapshot().working).toBe(true);
    finish();
    await unlocking;
    expect(gate.snapshot().working).toBe(false);
  });

  it("a second unlock tap while pending does not start another purchase", async () => {
    let calls = 0;
    let finish: () => void = () => {};
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const gate = createProGate(
      fakeEntitlement(false, () => {
        calls += 1;
        return pending;
      }),
    );
    gate.request("equity");
    const first = gate.unlock();
    const second = gate.unlock();
    finish();
    await Promise.all([first, second]);
    expect(calls).toBe(1);
  });

  it("a failed purchase keeps the sheet open with a message and allows a retry", async () => {
    let attempt = 0;
    const gate = createProGate(
      fakeEntitlement(false, async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("store unavailable");
      }),
    );
    gate.request("equity");
    await gate.unlock();
    expect(gate.snapshot()).toMatchObject({ sheetOpen: true, isPro: false, working: false });
    expect(gate.snapshot().error).not.toBeNull();
    await gate.unlock();
    expect(gate.snapshot()).toMatchObject({ sheetOpen: false, isPro: true, error: null });
  });

  it("dismissing after a failed purchase clears the error", async () => {
    const gate = createProGate(
      fakeEntitlement(false, async () => {
        throw new Error("nope");
      }),
    );
    gate.request("equity");
    await gate.unlock();
    gate.dismiss();
    expect(gate.snapshot()).toMatchObject({ sheetOpen: false, error: null });
  });

  it("closes the sheet if Pro arrives some other way, such as a restore", () => {
    const entitlement = fakeEntitlement(false);
    const gate = createProGate(entitlement);
    gate.request("equity");
    entitlement.grant();
    expect(gate.snapshot()).toMatchObject({ sheetOpen: false, isPro: true });
  });

  it("notifies subscribers on every change", () => {
    const gate = createProGate(fakeEntitlement(false));
    const seen: boolean[] = [];
    gate.subscribe(() => seen.push(gate.snapshot().sheetOpen));
    gate.request("equity");
    gate.dismiss();
    expect(seen).toEqual([true, false]);
  });
});
