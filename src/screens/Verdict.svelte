<script lang="ts">
  import { currentReading } from "../decoder/state.svelte";
  import { formatCAD } from "../model/money";
  import { headline, verdict, type VerdictLevel } from "../model/verdict";
  import { askFor, gapRows, subtitle, tenMinutesText } from "../model/verdictCopy";

  const tone: Record<VerdictLevel, "good" | "warn" | "bad"> = {
    match: "good",
    ask: "warn",
    large: "bad",
  };

  const reading = $derived(currentReading());
  const result = $derived(reading.quote ? verdict(reading.quote, reading.benchmarks) : null);
  const rows = $derived(
    reading.quote && result ? gapRows(reading.quote, reading.benchmarks, result) : [],
  );
  const chips = $derived(reading.quote && result ? askFor(reading.quote, result) : []);
  const message = $derived(reading.quote && result ? tenMinutesText(reading.quote, result) : "");

  let copyState = $state<"idle" | "copied" | "refused">("idle");
  let fallback = $state<HTMLTextAreaElement>();

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      copyState = "copied";
    } catch {
      copyState = "refused";
      queueMicrotask(() => {
        fallback?.focus();
        fallback?.select();
      });
    }
  }
</script>

<div class="stack">
{#if result && reading.quote}
  <div class="head {tone[result.level]}">
    <h1>{headline(result.level)}</h1>
    <p>{subtitle(result)}</p>
  </div>

  {#if rows.length > 0}
    <section class="card flat">
      {#each rows as row (row.kind)}
        <div class="gap">
          <div class="stripe {tone[row.level]}"></div>
          <div class="t">
            {row.title}
            <span>{row.detail}</span>
          </div>
          <div class="amt {tone[row.level]}">{row.amount}</div>
        </div>
      {/each}
    </section>
  {/if}

  <section class="card">
    <span class="label">What this deal actually is</span>
    <div class="kv">
      <span class="k">Amount financed</span>
      <span class="v">{formatCAD(result.figures.amountFinanced)}</span>
      <span class="k">Down + net trade equity</span>
      <span class="v">{formatCAD(result.figures.cashIn)}</span>
      <span class="k">Implied all-in price</span>
      <span class="v">{formatCAD(result.figures.impliedAllIn)}</span>
      <span class="k">Total interest</span>
      <span class="v">{formatCAD(result.figures.totalInterest)}</span>
      <span class="k total">Total you pay over the term</span>
      <span class="v total">{formatCAD(result.figures.totalPaid)}</span>
    </div>
  </section>

  <span class="label">Ask for</span>
  <div class="chips">
    {#each chips as chip (chip)}
      <span class="chip">{chip}</span>
    {/each}
  </div>

  <div class="actions">
    <a class="btn quiet" href="#dealer">Edit</a>
    <button class="btn primary" type="button" onclick={copyMessage}>I need 10 minutes</button>
  </div>

  <div aria-live="polite" class="copy-status">
    {#if copyState === "copied"}
      Copied. Paste it to whoever is helping you decide.
    {:else if copyState === "refused"}
      Copying was refused. The text is selected below; copy it by hand.
    {/if}
  </div>

  {#if copyState === "refused"}
    <textarea bind:this={fallback} readonly rows="6" aria-label="Message to copy" value={message}
    ></textarea>
  {/if}
{:else}
  <h1>Nothing to check yet</h1>
  <p class="empty">Enter the payment, term and rate from the dealer's quote first.</p>
  <a class="btn primary" href="#dealer">Go to the decoder</a>
{/if}
</div>

<style>
  .stack {
    display: grid;
    gap: 12px;
  }

  .head {
    padding: 14px 16px;
    border-radius: 12px;
    display: grid;
    gap: 4px;
  }

  .head.good {
    background: var(--good-soft);
    color: var(--good);
  }
  .head.warn {
    background: var(--warn-soft);
    color: var(--warn);
  }
  .head.bad {
    background: var(--bad-soft);
    color: var(--bad);
  }

  .head h1 {
    font-size: 30px;
  }

  .head p {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
  }

  .card {
    background: var(--surface-2);
    border-radius: 12px;
    padding: 12px 14px;
    display: grid;
    gap: 8px;
  }

  .card.flat {
    background: transparent;
    border: 1px solid var(--line);
    gap: 12px;
  }

  .gap {
    display: grid;
    grid-template-columns: 6px 1fr auto;
    gap: 10px;
    align-items: center;
  }

  .stripe {
    width: 6px;
    align-self: stretch;
    min-height: 34px;
    border-radius: 3px;
  }

  .t {
    font-weight: 600;
    font-size: 13px;
  }

  .t span {
    display: block;
    font-weight: 400;
    color: var(--muted);
    font-size: 12px;
  }

  .amt {
    font-family: var(--display);
    font-weight: 700;
    font-size: 24px;
  }

  .stripe.good {
    background: var(--good);
  }
  .stripe.warn {
    background: var(--warn);
  }
  .stripe.bad {
    background: var(--bad);
  }
  .amt.good {
    color: var(--good);
  }
  .amt.warn {
    color: var(--warn);
  }
  .amt.bad {
    color: var(--bad);
  }

  .label {
    display: block;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }

  .kv {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 12px;
  }

  .kv .k {
    color: var(--muted);
  }

  .kv .v {
    text-align: right;
    font-weight: 500;
  }

  .kv .total {
    border-top: 1px solid var(--line);
    padding-top: 6px;
    font-weight: 600;
    color: var(--ink);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .chip {
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 8px;
  }

  .btn {
    font: inherit;
    font-weight: 600;
    min-height: 48px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 10px;
    text-decoration: none;
    cursor: pointer;
  }

  .btn.primary {
    background: var(--accent);
    color: var(--accent-ink);
  }

  .btn.quiet {
    background: var(--surface-2);
    color: var(--ink);
  }

  .btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .copy-status {
    font-size: 12px;
    color: var(--muted);
    min-height: 1em;
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

  .empty {
    color: var(--muted);
  }
</style>
