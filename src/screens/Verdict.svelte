<script lang="ts">
  import { currentReading, decoder } from "../decoder/state.svelte";
  import { readDecoder } from "../decoder/inputs";
  import { formatCAD } from "../model/money";
  import { router } from "../router/router.svelte";
  import { decodeShare, encodeShare } from "../share/codec";
  import { headline, verdict, type VerdictLevel } from "../model/verdict";
  import { askFor, gapRows, subtitle, tenMinutesText, walkAwayLine } from "../model/verdictCopy";

  const tone: Record<VerdictLevel, "good" | "warn" | "bad"> = {
    match: "good",
    ask: "warn",
    large: "bad",
  };

  const code = $derived(router.route.name === "verdict" ? router.route.code : null);
  const shared = $derived(code === null ? null : decodeShare(code));
  const brokenLink = $derived(code !== null && shared === null);
  const reading = $derived(shared ? readDecoder(shared) : currentReading());
  const result = $derived(reading.quote ? verdict(reading.quote, reading.benchmarks) : null);
  const rows = $derived(
    reading.quote && result ? gapRows(reading.quote, reading.benchmarks, result) : [],
  );
  const chips = $derived(reading.quote && result ? askFor(reading.quote, result) : []);
  const message = $derived(reading.quote && result ? tenMinutesText(reading.quote, result) : "");

  let notice = $state("");
  let fallbackText = $state<string | null>(null);
  let fallback = $state<HTMLTextAreaElement>();

  async function copy(text: string, success: string) {
    try {
      await navigator.clipboard.writeText(text);
      notice = success;
      fallbackText = null;
    } catch {
      notice = "Copying was refused. The text is selected below; copy it by hand.";
      fallbackText = text;
      queueMicrotask(() => {
        fallback?.focus();
        fallback?.select();
      });
    }
  }

  function copyMessage() {
    return copy(message, "Copied. Paste it to whoever is helping you decide.");
  }

  async function share() {
    if (!reading.quote) return;
    const url = `${location.origin}${location.pathname}#d=${encodeShare(reading.quote, reading.benchmarks)}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "TradePoint deal check", url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copy(url, "Link copied. Opening it shows this same verdict.");
  }

  function edit() {
    if (shared) Object.assign(decoder, shared);
    window.location.hash = "#dealer";
  }
</script>

<div class="stack">
{#if brokenLink}
  <h1>This link doesn't open</h1>
  <p class="empty">It looks cut off or damaged. Ask for it again, or enter the quote yourself.</p>
  <a class="btn primary" href="#dealer">Go to the decoder</a>
{:else if result && reading.quote}
  {#if shared}
    <p class="shared">Shared deal. These numbers come from the link.</p>
  {/if}
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

  {#if reading.walkAway !== undefined}
    <p class="walkaway">{walkAwayLine(result.figures.impliedAllIn, reading.walkAway)}</p>
  {/if}

  <span class="label">Ask for</span>
  <div class="chips">
    {#each chips as chip (chip)}
      <span class="chip">{chip}</span>
    {/each}
  </div>

  <div class="actions">
    <button class="btn quiet" type="button" onclick={edit}>Edit</button>
    <button class="btn quiet" type="button" onclick={copyMessage}>I need 10 minutes</button>
    <button class="btn primary wide" type="button" onclick={share}>Share</button>
  </div>

  <div aria-live="polite" class="copy-status">{notice}</div>

  {#if fallbackText !== null}
    <textarea bind:this={fallback} readonly rows="6" aria-label="Text to copy" value={fallbackText}
    ></textarea>
  {/if}
{:else if Object.keys(reading.problems).length > 0}
  <h1>Some numbers can't be read</h1>
  <p class="empty">Go back to the decoder and fix the fields marked in red.</p>
  <a class="btn primary" href="#dealer">Go to the decoder</a>
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

  .card.flat {
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

  .actions .wide {
    grid-column: 1 / -1;
  }

  .shared {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
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

  .walkaway {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
  }
</style>
