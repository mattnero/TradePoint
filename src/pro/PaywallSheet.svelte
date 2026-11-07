<script lang="ts">
  import { PRO_INCLUDES, PRO_PRICE, PRO_STAYS_FREE } from "./copy";
  import { pro } from "./pro.svelte";

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (!dialog) return;
    if (pro.sheetOpen && !dialog.open) dialog.showModal();
    if (!pro.sheetOpen && dialog.open) dialog.close();
  });

  function closed() {
    if (pro.sheetOpen) pro.dismiss();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="pro-title" onclose={closed}>
  <div class="sheet">
    <span class="label" id="pro-title">TradePoint Pro</span>
    <div class="price">{PRO_PRICE} <small>once. No subscription.</small></div>
    <ul class="includes">
      {#each PRO_INCLUDES as line (line)}
        <li><span class="tick" aria-hidden="true"></span><span>{line}</span></li>
      {/each}
    </ul>
    <p class="hint">{PRO_STAYS_FREE}</p>
    {#if pro.error}
      <p class="error" role="alert">{pro.error}</p>
    {/if}
    <button class="btn primary" type="button" disabled={pro.working} onclick={() => pro.unlock()}>
      {pro.working ? "Unlocking…" : `Unlock Pro · ${PRO_PRICE}`}
    </button>
    <button class="btn quiet" type="button" disabled={pro.working} onclick={() => pro.dismiss()}>Not now</button>
  </div>
</dialog>

<style>
  dialog {
    position: fixed;
    inset: auto 0 0 0;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    max-height: 100dvh;
    overflow-y: auto;
  }

  dialog::backdrop {
    background: rgba(22, 33, 43, 0.45);
  }

  .sheet {
    background: var(--surface-2);
    border-radius: 18px 18px 0 0;
    padding: 16px max(16px, env(safe-area-inset-right, 0px)) max(16px, env(safe-area-inset-bottom, 0px))
      max(16px, env(safe-area-inset-left, 0px));
    display: grid;
    gap: 12px;
  }

  .price {
    font-family: var(--display);
    font-weight: 700;
    font-size: 44px;
    line-height: 1;
  }

  .price small {
    font-family: var(--body);
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
  }

  .includes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
    font-size: 13px;
  }

  .includes li {
    display: grid;
    grid-template-columns: 18px 1fr;
    gap: 8px;
    align-items: start;
  }

  .tick {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--accent);
    margin-top: 2px;
    position: relative;
  }

  .tick::after {
    content: "";
    position: absolute;
    left: 5px;
    top: 2px;
    width: 4px;
    height: 8px;
    border: solid var(--accent-ink);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .error {
    margin: 0;
  }

  button:disabled {
    opacity: 0.6;
  }
</style>
