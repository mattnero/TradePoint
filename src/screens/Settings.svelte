<script lang="ts">
  import { version } from "../../package.json";
  import { resetDecoder } from "../decoder/state.svelte";
  import { TAX_RULES } from "../math/tax";
  import { formatCAD, fromDollars } from "../model/money";
  import { garageStore } from "../store/garage.svelte";

  const ontario = TAX_RULES.ON;

  let oldData = $state(garageStore.unreadableCopy());
  let notice = $state("");
  let fallbackText = $state<string | null>(null);
  let fallback = $state<HTMLTextAreaElement>();

  async function copyOldData() {
    if (oldData === null) return;
    try {
      await navigator.clipboard.writeText(oldData);
      notice = "Copied. Paste it somewhere safe, or send it to whoever is helping you recover it.";
      fallbackText = null;
    } catch {
      notice = "Copying was refused. The text is selected below; copy it by hand.";
      fallbackText = oldData;
      queueMicrotask(() => {
        fallback?.focus();
        fallback?.select();
      });
    }
  }

  function eraseEverything() {
    if (!window.confirm("Erase your car, loan, value entries and benchmarks from this device? This can't be undone.")) {
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
    <p>
      Your car, loan and benchmarks are saved in this browser, on this device only. Nothing is sent anywhere and
      there's no account.
    </p>
    <p class="hint">
      Clearing this site's data in your browser erases it. On iPhone, Safari can also clear it after about a week
      without a visit; adding the app to your home screen avoids that.
    </p>
    <p class="hint">
      A share link carries the deal's numbers inside the link itself, so anyone you send it to can see them.
    </p>
    {#if oldData !== null}
      <p class="hint">Saved data that couldn't be read is still kept on this device.</p>
      <button class="btn quiet" type="button" onclick={copyOldData}>Copy the unreadable data</button>
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
    <p class="hint">Features tagged Pro are open to everyone while the app is being tested.</p>
  </section>

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

  .version {
    text-align: center;
  }
</style>
