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
  import { garageStore } from "../store/garage.svelte";

  const today = todayIso();
  const deals = $derived(newestFirst(garageStore.deals));

  let renaming = $state<string | null>(null);
  let draft = $state("");

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
    <span class="label" id="saved-title">Saved deals</span>
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

  .delete {
    color: var(--bad);
  }
</style>
