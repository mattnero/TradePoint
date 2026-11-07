<script lang="ts">
  import { compareDeals } from "../model/compare";
  import { compareRows, differenceLines } from "../model/compareCopy";
  import ProLock from "../pro/ProLock.svelte";
  import { pro } from "../pro/pro.svelte";
  import { router } from "../router/router.svelte";
  import { garageStore } from "../store/garage.svelte";

  const ids = $derived(router.route.name === "compare" ? router.route.ids : null);
  const pair = $derived.by(() => {
    if (ids === null) return null;
    const a = garageStore.deals.find((d) => d.id === ids[0]);
    const b = garageStore.deals.find((d) => d.id === ids[1]);
    return a && b ? ([a, b] as const) : null;
  });
  const comparison = $derived(pair ? compareDeals(pair[0], pair[1]) : null);
</script>

<div class="stack">
  <a class="back" href="#dealer">Saved deals</a>
  <h1>Side by side</h1>

  {#if !pro.isPro}
    <ProLock
      feature="compare"
      label="Compare two deals"
      hint="Line two saved deals up and see the dollar difference in price, interest and total paid."
    />
  {:else if comparison}
    <section class="card table" aria-label="Comparison">
      <div class="head">
        <span></span>
        {#each [comparison.a, comparison.b] as side, i (side.deal.id)}
          <span class="col">
            <span class="badge" aria-hidden="true">{i === 0 ? "A" : "B"}</span>
            <span class="name">{side.deal.label}</span>
          </span>
        {/each}
      </div>
      {#each compareRows(comparison) as row (row.label)}
        <div class="line">
          <span class="k">{row.label}</span>
          {#each [row.a, row.b] as cell, i (i)}
            <span class="v">
              {cell.value}
              {#if cell.note}<small>{cell.note}</small>{/if}
            </span>
          {/each}
        </div>
      {/each}
    </section>

    <section class="card" aria-label="What differs">
      <span class="label">What differs</span>
      {#each differenceLines(comparison) as line (line)}
        <p>{line}</p>
      {/each}
      <p class="hint">
        Each deal is judged against its own benchmarks. Differences are B measured against A, from the numbers
        you saved.
      </p>
    </section>
  {:else}
    <p class="empty">
      {ids === null
        ? "Pick two saved deals on the Dealer tab to line them up."
        : "One of these deals isn't saved any more. Pick two from the list again."}
    </p>
    <a class="btn primary" href="#dealer">Go to saved deals</a>
  {/if}
</div>

<style>
  .stack {
    display: grid;
    gap: 12px;
  }

  h1 {
    font-size: 28px;
  }

  .back {
    color: var(--accent);
    font-size: 14px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    width: fit-content;
  }

  .table {
    gap: 0;
  }

  .head,
  .line {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    padding: 8px 0;
  }

  .line {
    border-top: 1px solid var(--line);
  }

  .col {
    display: grid;
    gap: 4px;
    justify-items: start;
    min-width: 0;
  }

  .badge {
    font-family: var(--display);
    font-weight: 700;
    font-size: 13px;
    background: var(--ink);
    color: var(--surface);
    border-radius: 999px;
    min-width: 22px;
    height: 22px;
    display: inline-grid;
    place-items: center;
  }

  .name {
    font-weight: 600;
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .k {
    font-size: 12px;
    color: var(--muted);
  }

  .v {
    font-weight: 600;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .v small {
    display: block;
    font-weight: 400;
    font-size: 11px;
    color: var(--muted);
  }

  p {
    margin: 0;
  }

  .empty {
    color: var(--muted);
  }
</style>
