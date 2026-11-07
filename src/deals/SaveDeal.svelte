<script lang="ts">
  import { anyFromGarage } from "../decoder/state.svelte";
  import { todayIso } from "../model/dates";
  import type { DealQuote } from "../model/deal";
  import { addDeal, createSavedDeal, defaultLabel, findSaved, MAX_LABEL_LENGTH } from "../model/savedDeal";
  import type { Benchmarks } from "../model/verdict";
  import { pro, requirePro } from "../pro/pro.svelte";
  import { garageStore } from "../store/garage.svelte";

  let { quote, benchmarks, fromLink }: { quote: DealQuote; benchmarks: Benchmarks; fromLink: boolean } = $props();

  let naming = $state(false);
  let label = $state("");
  let input = $state<HTMLInputElement>();

  const existing = $derived(findSaved(garageStore.deals, quote, benchmarks));

  function start() {
    if (!requirePro("saveDeal")) return;
    naming = true;
    queueMicrotask(() => input?.focus());
  }

  function save(event: SubmitEvent) {
    event.preventDefault();
    const vehicleId = !fromLink && anyFromGarage() ? garageStore.vehicle?.id : undefined;
    const deal = createSavedDeal({
      id: crypto.randomUUID(),
      label,
      today: todayIso(),
      quote,
      benchmarks,
      existing: garageStore.deals,
      ...(vehicleId === undefined ? {} : { vehicleId }),
    });
    garageStore.update((g) => ({ ...g, deals: addDeal(g.deals, deal) }));
    naming = false;
    label = "";
  }
</script>

<div aria-live="polite">
  {#if existing}
    <p class="saved">
      Saved as <strong>{existing.label}</strong>. It's on the <a href="#dealer">Dealer tab</a>.
    </p>
    {#if garageStore.saveFailed}
      <p class="error" role="alert">This device won't let the app save, so it's gone when you close the tab.</p>
    {/if}
  {:else if naming}
    <form class="card name" onsubmit={save}>
      <label class="label" for="deal-label">Save as</label>
      <input
        id="deal-label"
        bind:this={input}
        bind:value={label}
        type="text"
        maxlength={MAX_LABEL_LENGTH}
        autocomplete="off"
        autocapitalize="words"
        enterkeyhint="done"
        placeholder={`Dealer name, or "${defaultLabel(garageStore.deals)}"`}
      />
      <div class="row">
        <button class="btn quiet" type="button" onclick={() => (naming = false)}>Cancel</button>
        <button class="btn primary" type="submit">Save</button>
      </div>
    </form>
  {:else}
    <button class="btn quiet save" type="button" onclick={start}>
      Save this deal
      {#if !pro.isPro}<span class="pill pro">Pro</span>{/if}
    </button>
  {/if}
</div>

<style>
  .save {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    width: 100%;
  }

  .name input {
    font: inherit;
    font-size: 16px;
    min-height: 48px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    width: 100%;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 8px;
  }

  .saved {
    margin: 0;
    font-size: 14px;
  }

  .saved a {
    color: var(--accent);
  }
</style>
