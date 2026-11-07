<script lang="ts">
  import { pro, requirePro } from "../pro/pro.svelte";
  import { garageStore } from "../store/garage.svelte";
  import { isUsable, vehicleLabel } from "../store/vehicles";

  let { onadd }: { onadd?: () => void } = $props();

  const selectedId = $derived(garageStore.vehicle?.id);
  const hasLocked = $derived(garageStore.vehicles.some((v) => !isUsable(garageStore.garage, v.id, pro.isPro)));

  function choose(id: string) {
    if (id === selectedId) return;
    if (!isUsable(garageStore.garage, id, pro.isPro)) {
      requirePro("vehicles");
      return;
    }
    garageStore.select(id);
  }

  function add() {
    if (requirePro("vehicles")) onadd?.();
  }
</script>

{#if garageStore.vehicles.length > 1 || onadd}
  <div class="switcher" role="group" aria-label="Your cars">
    {#if garageStore.vehicles.length > 1}
      <div class="chips">
        {#each garageStore.vehicles as v (v.id)}
          {@const locked = !isUsable(garageStore.garage, v.id, pro.isPro)}
          <button
            class="chip"
            class:locked
            type="button"
            aria-pressed={v.id === selectedId}
            aria-haspopup={locked ? "dialog" : undefined}
            onclick={() => choose(v.id)}
          >
            {vehicleLabel(v)}
            {#if locked}<span class="pill pro">Pro</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
    {#if hasLocked}
      <p class="hint">Your other cars are still saved. Pro opens them again.</p>
    {/if}
    {#if onadd}
      <button class="add" type="button" onclick={add}>
        Add another car
        {#if !pro.isPro}<span class="pill pro">Pro</span>{/if}
      </button>
    {/if}
  </div>
{/if}

<style>
  .switcher {
    display: grid;
    gap: 6px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .chip[aria-pressed="true"] {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  .chip.locked {
    opacity: 0.7;
    border-style: dashed;
  }

  .chip:focus-visible,
  .add:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .add {
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    background: transparent;
    border: 0;
    min-height: 44px;
    padding: 0 4px;
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
</style>
