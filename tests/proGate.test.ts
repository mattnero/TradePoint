import { createProGate } from "../src/pro/gate";
import type { Entitlement, PurchaseOutcome, RestoreOutcome } from "../src/pro/entitlement";

function fakeEntitlement(
  initiallyPro: boolean,
  purchase: () => Promise<PurchaseOutcome | void> = async () => {},
  restore: () => Promise<RestoreOutcome> = async () => "nothing",
) {
  let pro = initiallyPro;
  const listeners = new Set<() => void>();
  const entitlement: Entitlement & { grant(): void } = {
    isPro: () => pro,
    price: () => null,
    canRestore: true,
    purchase: async () => {
      const outcome = (await purchase()) ?? "purchased";
      if (outcome === "purchased") {
        pro = true;
        listeners.forEach((l) => l());
      }
      return outcome;
    },
    restore: async () => {
      const outcome = await restore();
      if (outcome === "restored") entitlement.grant();
      return outcome;
    },
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

  describe("cancelled and pending purchases", () => {
    it("a cancelled purchase keeps the sheet open with no error and no notice", async () => {
      const gate = createProGate(fakeEntitlement(false, async () => "cancelled"));
      gate.request("equity");
      await gate.unlock();
      expect(gate.snapshot()).toMatchObject({ sheetOpen: true, isPro: false, working: false, error: null, notice: null });
    });

    it("a pending purchase keeps the sheet open and explains that Pro comes when it's approved", async () => {
      const gate = createProGate(fakeEntitlement(false, async () => "pending"));
      gate.request("equity");
      await gate.unlock();
      expect(gate.snapshot()).toMatchObject({ sheetOpen: true, isPro: false, working: false, error: null });
      expect(gate.snapshot().notice).toMatch(/approv/i);
    });

    it("a pending purchase that is later approved closes the sheet and clears the notice", async () => {
      const entitlement = fakeEntitlement(false, async () => "pending");
      const gate = createProGate(entitlement);
      gate.request("equity");
      await gate.unlock();
      entitlement.grant();
      expect(gate.snapshot()).toMatchObject({ sheetOpen: false, isPro: true, notice: null });
    });

    it("trying again clears the old notice", async () => {
      let attempt = 0;
      const gate = createProGate(fakeEntitlement(false, async () => (++attempt === 1 ? "pending" : "cancelled")));
      gate.request("equity");
      await gate.unlock();
      await gate.unlock();
      expect(gate.snapshot().notice).toBeNull();
    });

    it("dismissing clears the notice", async () => {
      const gate = createProGate(fakeEntitlement(false, async () => "pending"));
      gate.request("equity");
      await gate.unlock();
      gate.dismiss();
      expect(gate.snapshot().notice).toBeNull();
    });
  });

  describe("restore", () => {
    it("a restored purchase closes the sheet and unlocks", async () => {
      const gate = createProGate(fakeEntitlement(false, undefined, async () => "restored"));
      gate.request("pdf");
      await gate.restore();
      expect(gate.snapshot()).toMatchObject({ sheetOpen: false, isPro: true, working: false, error: null });
    });

    it("nothing to restore says so and leaves the sheet open", async () => {
      const gate = createProGate(fakeEntitlement(false, undefined, async () => "nothing"));
      gate.request("pdf");
      await gate.restore();
      expect(gate.snapshot()).toMatchObject({ sheetOpen: true, isPro: false, error: null });
      expect(gate.snapshot().notice).toMatch(/no pro purchase/i);
    });

    it("a store that can't be reached shows an error, and a retry works", async () => {
      let attempt = 0;
      const gate = createProGate(
        fakeEntitlement(false, undefined, async () => {
          if (++attempt === 1) throw new Error("offline");
          return "restored";
        }),
      );
      gate.request("pdf");
      await gate.restore();
      expect(gate.snapshot().error).toMatch(/store/i);
      expect(gate.snapshot().sheetOpen).toBe(true);
      await gate.restore();
      expect(gate.snapshot()).toMatchObject({ sheetOpen: false, isPro: true, error: null });
    });

    it("shows working while restoring and ignores a second tap", async () => {
      let calls = 0;
      const wait = deferred();
      const gate = createProGate(
        fakeEntitlement(false, undefined, async () => {
          calls += 1;
          await wait.promise;
          return "restored";
        }),
      );
      gate.request("pdf");
      const first = gate.restore();
      const second = gate.restore();
      expect(gate.snapshot().working).toBe(true);
      wait.resolve(undefined);
      await Promise.all([first, second]);
      expect(calls).toBe(1);
    });

    it("works from Settings with no sheet open", async () => {
      const gate = createProGate(fakeEntitlement(false, undefined, async () => "nothing"));
      await gate.restore();
      expect(gate.snapshot().sheetOpen).toBe(false);
      expect(gate.snapshot().notice).toMatch(/no pro purchase/i);
    });
  });
});

function deferred() {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((res) => (resolve = res));
  return { promise, resolve };
}
