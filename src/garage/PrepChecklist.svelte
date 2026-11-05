<script lang="ts">
  import { untrack } from "svelte";
  import Field from "../decoder/Field.svelte";
  import { formatPercentInput } from "../decoder/inputs";
  import { monthYear } from "../model/cliffCopy";
  import { todayIso } from "../model/dates";
  import { formatCAD, formatInputMoney } from "../model/money";
  import {
    MAX_TRADE_OFFERS,
    addTradeOffer,
    prepStatus,
    removeTradeOffer,
    updatePrep,
    type Prep,
  } from "../model/prep";
  import { preApprovalStatus, rulesStatus, tradeStatus, walkAwayStatus } from "../model/prepCopy";
  import { PREP_LINKS, PROVINCE_RULES } from "../model/prepGuide";
  import { readPreApproval, readTradeOffer, readWalkAway } from "./inputs";

  let { prep, onchange }: { prep: Prep | undefined; onchange: (prep: Prep) => void } = $props();

  const today = todayIso();
  const rules = PROVINCE_RULES.ON;
  const current = $derived(prep ?? {});
  const status = $derived(prepStatus(prep));

  const saved = untrack(() => prep);
  let preApproval = $state(saved?.preApprovalApr === undefined ? "" : formatPercentInput(saved.preApprovalApr));
  let preApprovalError = $state<string | undefined>();
  let offerSource = $state("");
  let offerAmount = $state("");
  let offerError = $state<string | undefined>();
  let walkAway = $state(saved?.walkAway === undefined ? "" : formatInputMoney(saved.walkAway));
  let walkAwayError = $state<string | undefined>();

  function savePreApproval(event: SubmitEvent) {
    event.preventDefault();
    const read = readPreApproval(preApproval);
    if (!read.ok) {
      preApprovalError = read.error;
      return;
    }
    preApprovalError = undefined;
    onchange(updatePrep(current, { preApprovalApr: read.value }));
  }

  function addOffer(event: SubmitEvent) {
    event.preventDefault();
    const read = readTradeOffer({ source: offerSource, amount: offerAmount }, today);
    if (!read.ok) {
      offerError = read.error;
      return;
    }
    offerError = undefined;
    onchange(addTradeOffer(current, read.value));
    offerSource = offerAmount = "";
  }

  function saveWalkAway(event: SubmitEvent) {
    event.preventDefault();
    const read = readWalkAway(walkAway);
    if (!read.ok) {
      walkAwayError = read.error;
      return;
    }
    walkAwayError = undefined;
    onchange(updatePrep(current, { walkAway: read.value }));
  }

  function markRulesRead() {
    onchange(updatePrep(current, { rulesReadOn: today }));
  }
</script>

{#snippet mark(done: boolean)}
  <svg class="mark" class:done viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    {#if done}<path d="M7.5 12.5l3 3 6-7" />{/if}
  </svg>
{/snippet}

{#snippet links(list: { label: string; url: string }[])}
  <ul class="links">
    {#each list as link (link.url)}
      <li><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></li>
    {/each}
  </ul>
{/snippet}

<section class="card" aria-labelledby="prep-title">
  <div class="head">
    <span class="label" id="prep-title">Before the dealership</span>
    <span class="count">{status.done} of {status.total} done</span>
  </div>
  <p class="hint">Do these at home, where nobody is selling you anything. The decoder fills them in.</p>

  <details class="row">
    <summary>
      {@render mark(status.preApproval)}
      <span class="t">Pre-approval rate<span>{preApprovalStatus(prep)}</span></span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </summary>
    <form class="body" onsubmit={savePreApproval}>
      <p class="hint">
        Ask your bank or credit union to pre-approve a car loan. The verdict compares the dealer's rate to theirs.
      </p>
      {@render links(PREP_LINKS.preApproval)}
      <div class="inline">
        <Field id="p-preapproval" label="Pre-approval % APR" error={preApprovalError} bind:value={preApproval} />
        <button class="btn quiet" type="submit">Save</button>
      </div>
    </form>
  </details>

  <details class="row">
    <summary>
      {@render mark(status.tradeFigures >= MAX_TRADE_OFFERS)}
      <span class="t">Two trade figures<span>{tradeStatus(prep)}</span></span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </summary>
    <div class="body">
      <p class="hint">
        Get your car priced by two buyers who aren't selling you the next one. A real offer beats any estimate. Online
        offers are usually good for 7 days, so get them close to when you shop.
      </p>
      {@render links(PREP_LINKS.tradeOffers)}
      {#if current.tradeOffers && current.tradeOffers.length > 0}
        <ul class="offers">
          {#each current.tradeOffers as offer, i (i)}
            <li>
              <span class="t">
                {formatCAD(offer.amount)} from {offer.source}
                {#if offer.date}<span>{monthYear(offer.date)}</span>{/if}
              </span>
              <button class="btn quiet small" type="button" onclick={() => onchange(removeTradeOffer(current, i))}>
                Remove
              </button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if status.tradeFigures < MAX_TRADE_OFFERS}
        <form class="stack" onsubmit={addOffer}>
          <div class="fields">
            <Field id="p-offer-source" label="From" mode="text" capitalize="words" bind:value={offerSource} />
            <Field id="p-offer-amount" label="Amount" bind:value={offerAmount} />
          </div>
          {#if offerError}<p class="error" role="alert">{offerError}</p>{/if}
          <button class="btn quiet" type="submit">Add figure</button>
        </form>
      {/if}
    </div>
  </details>

  <details class="row">
    <summary>
      {@render mark(status.walkAway)}
      <span class="t">Walk-away number<span>{walkAwayStatus(prep)}</span></span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </summary>
    <form class="body" onsubmit={saveWalkAway}>
      <p class="hint">
        The most you'll pay all-in, tax and fees included. Decide it now, not at the desk. The verdict shows how far a
        deal is from it; it stays on this phone and never goes in a share link.
      </p>
      <div class="inline">
        <Field id="p-walkaway" label="Walk-away all-in" error={walkAwayError} bind:value={walkAway} />
        <button class="btn quiet" type="submit">Save</button>
      </div>
    </form>
  </details>

  <details class="row">
    <summary>
      {@render mark(status.rules)}
      <span class="t">{rules.name} rules<span>{rulesStatus(prep)}</span></span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </summary>
    <div class="body">
      <ul class="rules">
        {#each rules.rules as rule (rule.text)}
          <li>{rule.text}</li>
        {/each}
      </ul>
      <p class="hint">
        From <a href={rules.rules[0]!.url} target="_blank" rel="noopener noreferrer">{rules.authority}</a>, the
        {rules.name} dealer regulator. Checked {monthYear(rules.rules[0]!.verifiedOn)}. Not legal advice.
      </p>
      {#if !status.rules}
        <button class="btn quiet" type="button" onclick={markRulesRead}>Got it</button>
      {/if}
    </div>
  </details>
</section>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }

  .count {
    font-size: 12px;
    color: var(--muted);
  }

  .row {
    border-top: 1px solid var(--line);
  }

  summary {
    display: grid;
    grid-template-columns: 24px 1fr 18px;
    gap: 10px;
    align-items: center;
    min-height: 52px;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 6px;
  }

  .t {
    font-weight: 600;
    font-size: 14px;
  }

  .t span {
    display: block;
    font-weight: 400;
    font-size: 12px;
    color: var(--muted);
  }

  .mark {
    width: 24px;
    height: 24px;
    fill: none;
    stroke: var(--line);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .mark.done circle {
    fill: var(--accent);
    stroke: var(--accent);
  }

  .mark.done path {
    stroke: var(--accent-ink);
  }

  .chev {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: var(--muted);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.15s;
  }

  details[open] .chev {
    transform: rotate(90deg);
  }

  .links {
    gap: 0;
  }

  .body {
    display: grid;
    gap: 10px;
    padding: 0 0 12px 34px;
  }

  .stack {
    display: grid;
    gap: 10px;
  }

  .inline {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: end;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 10px;
  }

  .links,
  .rules,
  .offers {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
    font-size: 13px;
  }

  .links a {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    color: var(--accent);
  }

  .rules li {
    padding-left: 12px;
    border-left: 3px solid var(--accent-soft);
  }

  .offers li {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: center;
  }

  .btn.small {
    min-height: 44px;
    font-size: 13px;
  }

  .hint a {
    color: var(--accent);
  }
</style>
