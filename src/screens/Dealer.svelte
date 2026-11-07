<script lang="ts">
  import Field from "../decoder/Field.svelte";
  import {
    anyFromGarage,
    currentPlan,
    currentReading,
    dealer,
    decoder,
    isFromGarage,
    type DealerMode,
  } from "../decoder/state.svelte";
  import { monthlyEquivalent, type PaymentFrequency } from "../math/loan";
  import { dealFigures, paymentPlan } from "../model/deal";
  import { cents, formatCAD, fromDollars, toDollars, type Cents } from "../model/money";
  import { garageStore } from "../store/garage.svelte";

  const modes: { value: DealerMode; label: string }[] = [
    { value: "plan", label: "Plan a payment" },
    { value: "check", label: "Check a quote" },
  ];

  const frequencies: { value: PaymentFrequency; label: string; per: string }[] = [
    { value: "monthly", label: "Monthly", per: "a month" },
    { value: "biweekly", label: "Bi-weekly", per: "every two weeks" },
    { value: "weekly", label: "Weekly", per: "a week" },
  ];

  const reading = $derived(currentReading());
  const quote = $derived(reading.quote);
  const planReading = $derived(currentPlan());
  const problems = $derived(dealer.mode === "plan" ? planReading.problems : reading.problems);
  const problemCount = $derived(Object.keys(problems).length);
  const figures = $derived(quote ? dealFigures(quote) : null);
  const plan = $derived(planReading.plan ? paymentPlan(planReading.plan) : null);
  const per = $derived(frequencies.find((f) => f.value === decoder.frequency)?.per ?? "");

  function monthlyOf(payment: Cents, frequency: PaymentFrequency): Cents | null {
    return frequency === "monthly" ? null : fromDollars(monthlyEquivalent(toDollars(payment), frequency));
  }

  const quoteMonthly = $derived(quote ? monthlyOf(quote.payment, quote.frequency) : null);
  const planMonthly = $derived(plan ? monthlyOf(plan.payment, decoder.frequency) : null);

  function checkNumbers() {
    window.location.hash = "#verdict";
  }

  function checkAQuote() {
    dealer.mode = "check";
    window.scrollTo({ top: 0 });
  }
</script>

<div class="title">
  <h1>{dealer.mode === "plan" ? "What will it cost?" : "What did they say?"}</h1>
  <small>Live</small>
</div>

<div class="seg mode" role="group" aria-label="What to work out">
  {#each modes as m (m.value)}
    <button type="button" aria-pressed={dealer.mode === m.value} onclick={() => (dealer.mode = m.value)}>
      {m.label}
    </button>
  {/each}
</div>

{#snippet frequencyControl()}
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
{/snippet}

{#snippet unreadable()}
  <span class="sub">
    {problemCount === 1 ? "One number below can't be read." : `${problemCount} numbers below can't be read.`}
    Fix the field marked in red to see it.
  </span>
{/snippet}

{#snippet garageHint()}
  {#if anyFromGarage() && garageStore.vehicle}
    <p class="hint">
      <span class="pill">From your garage</span>
      Filled in from your {garageStore.vehicle.make} {garageStore.vehicle.model}. The payoff is worked out
      from your loan, so use your lender's figure if you have it. Edit anything the dealer's numbers change.
    </p>
  {/if}
{/snippet}

{#if dealer.mode === "plan"}
  <section class="readout" aria-live="polite">
    <span class="label">Your payment</span>
    {#if plan && plan.amountFinanced === 0}
      <span class="sub">Your down payment and trade cover the whole price. Nothing to finance.</span>
    {:else if plan}
      <span class="big">{formatCAD(plan.payment, { showCents: true })}</span>
      <span class="sub">
        {per}{#if planMonthly !== null}, or {formatCAD(planMonthly, { showCents: true })} a month{/if}
      </span>
    {:else if problemCount > 0}
      {@render unreadable()}
    {:else}
      <span class="sub">Enter the advertised price, term and rate to see it.</span>
    {/if}
  </section>

  <div class="stack">
    <Field id="in-adv" label="Advertised price" error={problems.advertised} bind:value={decoder.advertised} />

    {@render frequencyControl()}

    <div class="fields">
      <Field id="in-term" label="Term (months)" mode="numeric" error={problems.term} bind:value={decoder.term} />
      <Field id="in-apr" label="Rate % APR" error={problems.apr} bind:value={decoder.apr} />
      <Field id="in-down" label="Down payment" error={problems.down} bind:value={decoder.down} />
      <Field id="in-trade" label="Trade-in value" error={problems.tradeAllowance} bind:value={decoder.tradeAllowance} />
      <Field
        id="in-payoff"
        label="Owing on trade"
        prefilled={isFromGarage("tradePayoff")}
        error={problems.tradePayoff}
        bind:value={decoder.tradePayoff}
      />
    </div>

    {@render garageHint()}

    {#if plan}
      <section class="card">
        <span class="label">How it adds up</span>
        <div class="kv">
          <span class="k">Advertised price</span>
          <span class="v">{formatCAD(plan.advertisedPrice)}</span>
          <span class="k">HST</span>
          <span class="v">{formatCAD(plan.salesTax)}</span>
          <span class="k">Licensing (estimate)</span>
          <span class="v">{formatCAD(plan.licensing)}</span>
          <span class="k total">All-in price</span>
          <span class="v total">{formatCAD(plan.allIn)}</span>
          {#if plan.downPayment > 0}
            <span class="k">Down payment</span>
            <span class="v">{formatCAD(cents(-plan.downPayment))}</span>
          {/if}
          {#if plan.netTradeEquity !== 0}
            <span class="k">{plan.netTradeEquity > 0 ? "Trade equity" : "Owing on trade, rolled in"}</span>
            <span class="v">{formatCAD(cents(-plan.netTradeEquity), { signed: true })}</span>
          {/if}
          <span class="k total">Amount financed</span>
          <span class="v total">{formatCAD(plan.amountFinanced)}</span>
          <span class="k">Total interest</span>
          <span class="v">{formatCAD(plan.totalInterest)}</span>
          <span class="k total">Total you pay over the term</span>
          <span class="v total">{formatCAD(plan.totalPaid)}</span>
        </div>
      </section>
      <p class="hint">
        In Ontario the advertised price has to include every fee except HST and licensing, so this is the payment
        the ad promises. If a dealer's payment for the same term and rate is higher, something was added.
      </p>
    {/if}

    <button class="btn primary" type="button" onclick={checkAQuote}>Got a dealer's quote? Check it</button>
  </div>
{:else}
  <section class="readout" aria-live="polite">
    <span class="label">Amount financed</span>
    {#if figures}
      <span class="big">{formatCAD(figures.amountFinanced)}</span>
      {#if quoteMonthly !== null}
        <span class="sub">{formatCAD(quoteMonthly, { showCents: true })} a month once you convert it</span>
      {/if}
    {:else if problemCount > 0}
      {@render unreadable()}
    {:else}
      <span class="sub">Enter the payment, term and rate to see it.</span>
    {/if}
  </section>

  <div class="stack">
    <Field id="in-payment" label="Payment" error={problems.payment} bind:value={decoder.payment} />

    {@render frequencyControl()}

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

    {@render garageHint()}

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
{/if}

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

  .mode {
    grid-template-columns: repeat(2, 1fr);
    margin-bottom: 14px;
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

  .kv {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 12px;
    margin-top: 8px;
  }

  .kv .k {
    color: var(--muted);
  }

  .kv .v {
    text-align: right;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  .kv .total {
    border-top: 1px solid var(--line);
    padding-top: 6px;
    font-weight: 600;
    color: var(--ink);
  }

  .seg button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
</style>
