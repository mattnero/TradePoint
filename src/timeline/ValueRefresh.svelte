<script lang="ts">
  import Field from "../decoder/Field.svelte";
  import { readValueEntry } from "../garage/inputs";
  import { monthYear } from "../model/cliffCopy";
  import { autoTraderUrl, cargurusSearchUrl, normalizePostalCode, RADIUS_OPTIONS } from "../model/compLinks";
  import { todayIso } from "../model/dates";
  import { formatCAD } from "../model/money";
  import { addValueAnchor, removeValueAnchor, type ValueSource, type Vehicle } from "../model/vehicle";

  let { vehicle, onchange }: { vehicle: Vehicle; onchange: (vehicle: Vehicle) => void } = $props();

  const today = todayIso();

  const kinds: { value: ValueSource; label: string }[] = [
    { value: "comps", label: "Comps" },
    { value: "offer", label: "Outside offer" },
    { value: "manual", label: "My figure" },
  ];

  const sourceNames: Record<ValueSource, string> = {
    comps: "Comps",
    offer: "Outside offer",
    manual: "Your figure",
  };

  let open = $state(false);
  let kind = $state<ValueSource>("comps");
  let comps = $state("");
  let amount = $state("");
  let date = $state(today);
  let error = $state("");
  let saved = $state("");
  let postalCode = $state("");
  let radiusKm = $state(100);

  const postalProblem = $derived(postalCode.trim() !== "" && normalizePostalCode(postalCode) === null);
  const entries = $derived([...(vehicle.valueAnchors ?? [])].reverse());

  function toggle() {
    open = !open;
    saved = "";
  }

  function save(event: SubmitEvent) {
    event.preventDefault();
    const read = readValueEntry({ kind, comps, amount, date }, today);
    if (!read.ok) {
      error = read.error;
      return;
    }
    error = "";
    onchange(addValueAnchor(vehicle, read.value));
    saved = `Value updated to ${formatCAD(read.value.value)} as of ${monthYear(read.value.date)}.`;
    comps = amount = "";
    date = today;
    open = false;
  }

  function remove(anchorDate: string) {
    onchange(removeValueAnchor(vehicle, anchorDate));
    saved = "";
  }
</script>

<div class="stack">
  <button class="btn ghost" type="button" aria-expanded={open} onclick={toggle}>
    Refresh value from comps
  </button>
  {#if saved}<p class="hint" role="status">{saved}</p>{/if}

  {#if open}
    <section class="card" aria-label="Refresh value">
      <span class="label">1 · Find comparable cars</span>
      <p class="hint">
        Same model year and about your kilometres. Your postal code only goes into the link you tap.
      </p>
      <div class="fields">
        <Field id="r-postal" label="Postal code (optional)" mode="text" capitalize="characters" bind:value={postalCode} />
        <div class="field">
          <label for="r-radius">Radius</label>
          <select id="r-radius" bind:value={radiusKm}>
            {#each RADIUS_OPTIONS as km (km)}
              <option value={km}>{km} km</option>
            {/each}
          </select>
        </div>
      </div>
      {#if postalProblem}
        <p class="error" role="alert">Enter a postal code like M5V 2T6, or leave it blank to search all of Canada.</p>
      {/if}
      <div class="links">
        <a class="btn ghost" href={autoTraderUrl(vehicle, { postalCode, radiusKm })} target="_blank" rel="noopener noreferrer">
          AutoTrader.ca
        </a>
        <a class="btn ghost" href={cargurusSearchUrl(vehicle)} target="_blank" rel="noopener noreferrer">
          CarGurus.ca
        </a>
      </div>
      <p class="hint">CarGurus can't be filtered from a link, so that one opens a web search of its listings.</p>
    </section>

    <form class="card" onsubmit={save}>
      <span class="label">2 · Enter what you found</span>
      <div class="seg" role="group" aria-label="Where the value comes from">
        {#each kinds as k (k.value)}
          <button type="button" aria-pressed={kind === k.value} onclick={() => (kind = k.value)}>{k.label}</button>
        {/each}
      </div>

      {#if kind === "comps"}
        <div class="field">
          <label for="r-comps">3 to 5 asking prices, one per line</label>
          <textarea id="r-comps" rows="5" bind:value={comps} autocapitalize="off" spellcheck="false"></textarea>
        </div>
        <p class="hint">The middle price becomes your value. Asking prices usually run above what a dealer will pay.</p>
      {:else}
        <Field id="r-amount" label={kind === "offer" ? "Offer for your car" : "Your value"} bind:value={amount} />
        {#if kind === "offer"}
          <p class="hint">A real offer is closer to trade-in value than listings are.</p>
        {/if}
      {/if}

      <div class="field">
        <label for="r-date">As of</label>
        <input id="r-date" type="date" max={today} bind:value={date} />
      </div>

      {#if error}<p class="error" role="alert">{error}</p>{/if}
      <button class="btn primary" type="submit">Update value</button>
    </form>
  {/if}

  {#if entries.length > 0}
    <section class="card flat" aria-label="Your value entries">
      <span class="label">Your value entries</span>
      {#each entries as entry (entry.date)}
        <div class="entry">
          <div>
            <strong>{formatCAD(entry.value)}</strong>
            <span>{sourceNames[entry.source]} · {monthYear(entry.date)}</span>
          </div>
          <button class="btn quiet" type="button" aria-label={`Remove the ${formatCAD(entry.value)} entry from ${entry.date}`} onclick={() => remove(entry.date)}>
            Remove
          </button>
        </div>
      {/each}
    </section>
  {/if}
</div>

<style>
  .stack {
    display: grid;
    gap: 12px;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  label {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }

  input,
  select,
  textarea {
    font: inherit;
    font-size: 17px;
    min-height: 48px;
    padding: 6px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    width: 100%;
    min-width: 0;
  }

  textarea {
    resize: vertical;
    line-height: 1.4;
  }

  .links {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
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
    font-size: 13px;
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
    outline-offset: -2px;
  }

  .entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .entry strong {
    font-family: var(--display);
    font-size: 20px;
    font-weight: 700;
  }

  .entry span {
    display: block;
    font-size: 12px;
    color: var(--muted);
  }

  .entry .btn {
    min-height: 44px;
    font-size: 13px;
  }
</style>
