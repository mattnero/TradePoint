<script lang="ts">
  import { version } from "../../package.json";
  import { resetDecoder } from "../decoder/state.svelte";
  import { TAX_RULES } from "../math/tax";
  import { formatCAD, fromDollars } from "../model/money";
  import { isNativeApp } from "../native/platform";
  import { PRO_OPEN, pro } from "../pro/pro.svelte";
  import { backupText, readBackup, type Garage } from "../store/garage";
  import { garageStore } from "../store/garage.svelte";

  const ontario = TAX_RULES.ON;
  const native = isNativeApp();

  let oldData = $state(garageStore.unreadableCopy());
  let notice = $state("");
  let fallbackText = $state<string | null>(null);
  let fallback = $state<HTMLTextAreaElement>();
  let restoring = $state(false);
  let pasted = $state("");
  let restoreError = $state("");

  const hasData = $derived(garageStore.vehicles.length > 0 || garageStore.deals.length > 0);

  function count(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
  }

  function contents(garage: Garage): string {
    return `${count(garage.vehicles.length, "car", "cars")} and ${count(garage.deals.length, "saved deal", "saved deals")}`;
  }

  async function copyText(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      notice = done;
      fallbackText = null;
    } catch {
      notice = "Copying was refused. The text is selected below; copy it by hand.";
      fallbackText = text;
      queueMicrotask(() => {
        fallback?.focus();
        fallback?.select();
      });
    }
  }

  function copyOldData() {
    if (oldData === null) return;
    copyText(oldData, "Copied. Paste it somewhere safe, or send it to whoever is helping you recover it.");
  }

  function copyBackup() {
    copyText(
      backupText(garageStore.garage),
      "Copied. On the other device, open TradePoint, go to Settings, tap Restore from a backup and paste it.",
    );
  }

  function startRestore() {
    restoring = true;
    pasted = "";
    restoreError = "";
    notice = "";
    fallbackText = null;
  }

  function restoreBackup() {
    const garage = readBackup(pasted);
    if (garage === null) {
      restoreError = "That isn't a TradePoint backup, or part of it is missing. Copy it again and paste all of it.";
      return;
    }
    if (hasData && !window.confirm(`Replace the ${contents(garageStore.garage)} on this device with the backup's ${contents(garage)}?`)) {
      return;
    }
    resetDecoder();
    garageStore.restore(garage);
    restoring = false;
    pasted = "";
    restoreError = "";
    notice = `Restored ${contents(garage)}.`;
  }

  function eraseEverything() {
    if (!window.confirm("Erase your car, loan, value entries, benchmarks and saved deals from this device? This can't be undone.")) {
      return;
    }
    resetDecoder();
    const erased = garageStore.erase();
    oldData = garageStore.unreadableCopy();
    fallbackText = null;
    notice = erased
      ? "Erased. The Garage tab starts fresh."
      : "This browser wouldn't let the app erase its saved data. Clear this site's data in your browser settings instead.";
  }
</script>

<div class="stack">
  <h1>Settings</h1>

  <section class="card">
    <span class="label">Your data</span>
    {#if native}
      <p>
        Your car, loan, benchmarks and saved deals are saved in the app, on this phone only. Nothing is sent anywhere and
        there's no account.
      </p>
      <p class="hint">Uninstalling the app erases it. Copy a backup first if you want to keep it.</p>
    {:else}
      <p>
        Your car, loan, benchmarks and saved deals are saved in this browser, on this device only. Nothing is sent anywhere and
        there's no account.
      </p>
      <p class="hint">
        Clearing this site's data in your browser erases it. On iPhone, Safari can also clear it after about a week
        without a visit; adding the app to your home screen avoids that.
      </p>
    {/if}
    <p class="hint">
      A share link carries the deal's numbers inside the link itself, so anyone you send it to can see them.
    </p>
    {#if oldData !== null}
      <p class="hint">Saved data that couldn't be read is still kept on this device.</p>
      <button class="btn quiet" type="button" onclick={copyOldData}>Copy the unreadable data</button>
    {/if}
    {#if hasData}
      <button class="btn quiet" type="button" onclick={copyBackup}>Copy a backup</button>
    {/if}
    {#if restoring}
      <label class="paste">
        <span class="hint">Paste the backup text copied from Settings on your other device.</span>
        <textarea rows="5" bind:value={pasted} autocomplete="off" spellcheck="false"></textarea>
      </label>
      {#if restoreError}
        <p class="error" role="alert">{restoreError}</p>
      {/if}
      <div class="row">
        <button class="btn primary" type="button" onclick={restoreBackup} disabled={pasted.trim() === ""}>Restore</button>
        <button class="btn quiet" type="button" onclick={() => (restoring = false)}>Cancel</button>
      </div>
    {:else}
      <button class="btn quiet" type="button" onclick={startRestore}>Restore from a backup</button>
    {/if}
    <button class="btn quiet erase" type="button" onclick={eraseEverything}>Erase everything</button>
    <div aria-live="polite" class="status">{notice}</div>
    {#if fallbackText !== null}
      <textarea bind:this={fallback} readonly rows="6" aria-label="Text to copy" value={fallbackText}></textarea>
    {/if}
  </section>

  <section class="card">
    <span class="label">About the numbers</span>
    <p>TradePoint does arithmetic on the numbers you enter. It isn't financial, legal or tax advice.</p>
    <p class="hint">
      Deal checks use Ontario rules: {Math.round(ontario.rate * 100)}% HST on the price after your trade-in, plus
      about {formatCAD(fromDollars(ontario.licensingEstimate))} for permit and plates.
    </p>
    <p class="hint">
      Car values are rough estimates from typical depreciation until you add comps or an outside offer. Warranty
      terms come from each maker's Canadian warranty page; confirm yours with the dealer.
    </p>
  </section>

  {#if pro.canRestore}
    <section class="card">
      <span class="label">TradePoint Pro</span>
      <p>{pro.isPro ? "Pro is unlocked on this phone." : "Pro isn't unlocked on this phone."}</p>
      <button class="btn quiet" type="button" disabled={pro.working} onclick={() => pro.restore()}>Restore purchase</button>
      <div aria-live="polite" class="status">
        {#if pro.error}{pro.error}{:else if pro.notice}{pro.notice}{/if}
      </div>
    </section>
  {/if}

  {#if PRO_OPEN}
    <section class="card">
      <span class="label">Testing</span>
      <label class="toggle">
        <input
          type="checkbox"
          checked={pro.testingLock}
          onchange={(e) => pro.setTestingLock(e.currentTarget.checked)}
        />
        <span>Lock Pro features, as if I hadn't bought Pro</span>
      </label>
      <p class="hint">Only shown while Pro is open for testing. Tapping a locked item opens the unlock sheet.</p>
    </section>
  {/if}

  <p class="hint version">TradePoint {version}</p>
</div>

<style>
  .stack {
    display: grid;
    gap: 12px;
  }

  h1 {
    font-size: 28px;
  }

  p {
    margin: 0;
  }

  .erase {
    color: var(--bad);
  }

  .paste {
    display: grid;
    gap: 6px;
  }

  .error {
    font-size: 14px;
    color: var(--bad);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .status {
    font-size: 12px;
    color: var(--muted);
  }

  textarea {
    font: inherit;
    font-size: 14px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
  }

  .toggle {
    display: flex;
    gap: 10px;
    align-items: center;
    min-height: 44px;
    font-size: 14px;
  }

  .toggle input {
    width: 20px;
    height: 20px;
    flex: none;
  }

  .version {
    text-align: center;
  }
</style>
