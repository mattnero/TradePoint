<script lang="ts">
  import Field from "../decoder/Field.svelte";
  import { anyFromGarage, currentReading, decoder, isFromGarage } from "../decoder/state.svelte";
  import { monthlyEquivalent, type PaymentFrequency } from "../math/loan";
  import { dealFigures } from "../model/deal";
  import { formatCAD, fromDollars, toDollars } from "../model/money";
  import { garageStore } from "../store/garage.svelte";

  const frequencies: { value: PaymentFrequency; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "weekly", label: "Weekly" },
  ];

  const reading = $derived(currentReading());
  const quote = $derived(reading.quote);
  const problems = $derived(reading.problems);
  const problemCount = $derived(Object.keys(problems).length);
  const figures = $derived(quote ? dealFigures(quote) : null);
  const monthly = $derived(
    quote && quote.frequency !== "monthly"
      ? fromDollars(monthlyEquivalent(toDollars(quote.payment), quote.frequency))
      : null,
  );

  function checkNumbers() {
    window.location.hash = "#verdict";
  }
</script>

<div class="title">
  <h1>What did they say?</h1>
  <small>Live</small>
</div>

<section class="readout" aria-live="polite">
  {#if figures}
    <span class="label">Amount financed</span>
    <span class="big">{formatCAD(figures.amountFinanced)}</span>
    {#if monthly !== null}
      <span class="sub">{formatCAD(monthly, { showCents: true })} a month once you convert it</span>
    {/if}
  {:else if problemCount > 0}
    <span class="label">Amount financed</span>
    <span class="sub">
      {problemCount === 1 ? "One number below can't be read." : `${problemCount} numbers below can't be read.`}
      Fix the field marked in red to see it.
    </span>
  {:else}
    <span class="label">Amount financed</span>
    <span class="sub">Enter the payment, term and rate to see it.</span>
  {/if}
</section>

<div class="stack">
  <Field id="in-payment" label="Payment" error={problems.payment} bind:value={decoder.payment} />

  <div class="seg" role="group" aria-label="Payment frequency">
    {#each frequencies as f (f.value)}
      <button
        type="button"
        aria-pressed={decoder.frequency === f.value}
        onclick={() => (decoder.frequency = f.value)}
      >
        {f.label}
      </button>
    {/each}
  </div>

  <div class="fields">
    <Field id="in-term" label="Term (months)" mode="numeric" error={problems.term} bind:value={decoder.term} />
    <Field id="in-apr" label="Rate % APR" error={problems.apr} bind:value={decoder.apr} />
    <Field id="in-down" label="Down payment" error={problems.down} bind:value={decoder.down} />
    <Field id="in-adv" label="Advertised price (optional)" error={problems.advertised} bind:value={decoder.advertised} />
    <Field id="in-trade" label="Trade allowance" error={problems.tradeAllowance} bind:value={decoder.tradeAllowance} />
    <Field
      id="in-payoff"
      label="Trade payoff"
      prefilled={isFromGarage("tradePayoff")}
      error={problems.tradePayoff}
      bind:value={decoder.tradePayoff}
    />
  </div>

  {#if anyFromGarage() && garageStore.vehicle}
    <p class="hint">
      <span class="pill">From your garage</span>
      Filled in from your {garageStore.vehicle.make} {garageStore.vehicle.model}. The payoff is worked out
      from your loan, so use your lender's figure if you have it. Edit anything the dealer's numbers change.
    </p>
  {/if}

  <span class="label">Your benchmarks</span>
  <div class="fields">
    <Field
      id="in-bank"
      label="Pre-approval % APR"
      prefilled={isFromGarage("preApprovalApr")}
      error={problems.preApprovalApr}
      bind:value={decoder.preApprovalApr}
    />
    <Field
      id="in-offer"
      label="Outside trade offer"
      prefilled={isFromGarage("outsideOffer")}
      error={problems.outsideOffer}
      bind:value={decoder.outsideOffer}
    />
  </div>
  <Field
    id="in-walkaway"
    label="Walk-away all-in (optional)"
    prefilled={isFromGarage("walkAway")}
    error={problems.walkAway}
    bind:value={decoder.walkAway}
  />
  <p class="hint">
    Leave benchmarks empty and the verdict shows the price gap only. Your walk-away stays on this phone; it never goes
    in a share link.
  </p>

  <button class="btn primary" type="button" disabled={!quote} onclick={checkNumbers}>
    Check the numbers
  </button>
</div>

<style>
  .title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12px;
  }

  h1 {
    font-size: 28px;
  }

  small {
    color: var(--muted);
    font-size: 12px;
  }

  .readout {
    display: grid;
    gap: 4px;
    background: var(--surface-2);
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }

  .big {
    font-family: var(--display);
    font-weight: 700;
    font-size: 40px;
    line-height: 1;
  }

  .sub {
    font-size: 13px;
    color: var(--muted);
  }

  .stack {
    display: grid;
    gap: 12px;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 10px;
    align-items: end;
  }

  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }

  .seg button {
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    min-height: 44px;
    border: 0;
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
  }

  .seg button[aria-pressed="true"] {
    background: var(--accent);
    color: var(--accent-ink);
    font-weight: 600;
  }

  .seg button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
