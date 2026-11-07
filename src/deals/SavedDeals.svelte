<script lang="ts">
  import { dealer, decoder } from "../decoder/state.svelte";
  import { todayIso } from "../model/dates";
  import {
    MAX_LABEL_LENGTH,
    newestFirst,
    removeDeal,
    renameDeal,
    savedDealInputs,
    savedLine,
    type SavedDeal,
  } from "../model/savedDeal";
  import { pro, requirePro } from "../pro/pro.svelte";
  import { garageStore } from "../store/garage.svelte";

  const today = todayIso();
  const deals = $derived(newestFirst(garageStore.deals));

  let renaming = $state<string | null>(null);
  let draft = $state("");
  let picking = $state(false);
  let picked = $state<string[]>([]);

  function startPicking() {
    if (!requirePro("compare")) return;
    picking = true;
    picked = [];
    renaming = null;
  }

  function stopPicking() {
    picking = false;
    picked = [];
  }

  function toggle(id: string, on: boolean) {
    picked = on ? [...picked, id] : picked.filter((p) => p !== id);
  }

  function compare() {
    if (picked.length !== 2) return;
    window.location.hash = `#compare=${picked[0]},${picked[1]}`;
  }

  function open(deal: SavedDeal) {
    Object.assign(decoder, savedDealInputs(deal, decoder.walkAway));
    dealer.mode = "check";
    window.location.hash = "#verdict";
  }

  function startRename(deal: SavedDeal) {
    renaming = deal.id;
    draft = deal.label;
    queueMicrotask(() => document.getElementById(`rename-${deal.id}`)?.focus());
  }

  function rename(event: SubmitEvent, id: string) {
    event.preventDefault();
    garageStore.update((g) => ({ ...g, deals: renameDeal(g.deals, id, draft) }));
    renaming = null;
  }

  function remove(deal: SavedDeal) {
    if (!window.confirm(`Delete "${deal.label}"? This can't be undone.`)) return;
    garageStore.update((g) => ({ ...g, deals: removeDeal(g.deals, deal.id) }));
  }
</script>

{#if deals.length > 0}
  <section class="card list" aria-labelledby="saved-title">
    <div class="top">
      <span class="label" id="saved-title">Saved deals</span>
      {#if deals.length >= 2 && !picking}
        <button class="pick" type="button" onclick={startPicking}>
          Compare two
          {#if !pro.isPro}<span class="pill pro">Pro</span>{/if}
        </button>
      {/if}
    </div>
    {#if picking}
      <p class="hint" aria-live="polite">
        {picked.length === 2 ? "Two picked." : `Pick two deals to compare. ${picked.length} of 2 picked.`}
      </p>
    {/if}
    <ul>
      {#each deals as deal (deal.id)}
        <li>
          {#if renaming === deal.id}
            <form class="rename" onsubmit={(e) => rename(e, deal.id)}>
              <label class="label" for={`rename-${deal.id}`}>New name</label>
              <input
                id={`rename-${deal.id}`}
                bind:value={draft}
                type="text"
                maxlength={MAX_LABEL_LENGTH}
                autocomplete="off"
                autocapitalize="words"
                enterkeyhint="done"
              />
              <div class="actions">
                <button class="btn quiet" type="button" onclick={() => (renaming = null)}>Cancel</button>
                <button class="btn primary" type="submit">Save</button>
              </div>
            </form>
          {:else if picking}
            <label class="choice">
              <input
                type="checkbox"
                checked={picked.includes(deal.id)}
                disabled={picked.length >= 2 && !picked.includes(deal.id)}
                onchange={(e) => toggle(deal.id, e.currentTarget.checked)}
              />
              <span class="text">
                <strong>{deal.label}</strong>
                <span>{savedLine(deal, today)}</span>
              </span>
            </label>
          {:else}
            <button class="open" type="button" onclick={() => open(deal)}>
              <span class="text">
                <strong>{deal.label}</strong>
                <span>{savedLine(deal, today)}</span>
              </span>
              <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <div class="actions">
              <button class="btn quiet" type="button" onclick={() => startRename(deal)}>Rename</button>
              <button class="btn quiet delete" type="button" onclick={() => remove(deal)}>Delete</button>
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    {#if picking}
      <div class="actions">
        <button class="btn quiet" type="button" onclick={stopPicking}>Cancel</button>
        <button class="btn primary" type="button" disabled={picked.length !== 2} onclick={compare}>Compare</button>
      </div>
    {/if}
    {#if garageStore.saveFailed}
      <p class="error" role="alert">This device won't let the app save, so changes are gone when you close the tab.</p>
    {/if}
  </section>
{/if}

<style>
  .list {
    margin-top: 16px;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
  }

  li {
    display: grid;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }

  li:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .open {
    font: inherit;
    color: inherit;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 4px 0;
    min-height: 44px;
    display: grid;
    grid-template-columns: 1fr 18px;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .text {
    display: grid;
    gap: 2px;
  }

  .chev {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: var(--muted);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .open strong {
    font-size: 16px;
  }

  .text span {
    font-size: 12px;
    color: var(--muted);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .rename {
    display: grid;
    gap: 8px;
  }

  .rename input {
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

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .pick {
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
    background: transparent;
    border: 0;
    min-height: 44px;
    padding: 0 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .choice {
    display: grid;
    grid-template-columns: 24px 1fr;
    gap: 10px;
    align-items: center;
    min-height: 44px;
    cursor: pointer;
  }

  .choice input {
    width: 22px;
    height: 22px;
  }

  .choice strong {
    font-size: 16px;
  }

  .delete {
    color: var(--bad);
  }
</style>
