<script lang="ts">
  import Field from "../decoder/Field.svelte";
  import { todayIso } from "../model/dates";
  import { loanBalanceAt, monthsRemainingAt } from "../model/loan";
  import { formatCAD } from "../model/money";
  import { SEGMENTS, segmentFor, type SegmentKey } from "../model/segments";
  import { addOdometerReading, type Vehicle } from "../model/vehicle";
  import { formatKm, monthYear } from "../model/cliffCopy";
  import { readInServiceDate, readKm, readLoanSnapshot } from "./inputs";

  let {
    vehicle,
    onchange,
    onremove,
  }: { vehicle: Vehicle; onchange: (vehicle: Vehicle) => void; onremove: () => void } = $props();

  const today = todayIso();

  let km = $state("");
  let kmError = $state("");
  let inService = $state("");
  let inServiceError = $state("");
  let balance = $state("");
  let apr = $state("");
  let monthsLeft = $state("");
  let loanError = $state("");

  const latestKm = $derived(vehicle.odometer[vehicle.odometer.length - 1]!.km);

  function updateOdometer(event: SubmitEvent) {
    event.preventDefault();
    const read = readKm(km);
    if (read === null) {
      kmError = "Enter the odometer in whole kilometres.";
      return;
    }
    try {
      onchange(addOdometerReading(vehicle, { date: today, km: read }));
      km = "";
      kmError = "";
    } catch {
      kmError = `That is lower than your last reading (${formatKm(latestKm)} km).`;
    }
  }

  function saveInService(event: SubmitEvent) {
    event.preventDefault();
    const read = readInServiceDate(inService, today);
    if (!read.ok) {
      inServiceError = read.error;
      return;
    }
    inServiceError = "";
    onchange({ ...vehicle, inServiceDate: read.value, inServiceEstimated: false });
  }

  function estimateInService() {
    const guess = `${vehicle.year}-07-01`;
    onchange({ ...vehicle, inServiceDate: guess <= today ? guess : today, inServiceEstimated: true });
    inServiceError = "";
  }

  function saveSegment(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "") {
      const { segment: _, ...rest } = vehicle;
      onchange(rest);
      return;
    }
    onchange({ ...vehicle, segment: value as SegmentKey });
  }

  function saveLoan(event: SubmitEvent) {
    event.preventDefault();
    const read = readLoanSnapshot({ balance, apr, monthsLeft }, today);
    if (!read.ok) {
      loanError = read.error;
      return;
    }
    loanError = "";
    onchange({ ...vehicle, loan: read.value });
    balance = apr = monthsLeft = "";
  }

  function removeLoan() {
    const { loan: _, ...rest } = vehicle;
    onchange(rest);
  }

  function confirmRemove() {
    if (window.confirm("Remove this car and everything saved about it?")) onremove();
  }
</script>

<section class="stack" aria-label="Details">
  <form onsubmit={updateOdometer} class="card">
    <span class="label">Odometer</span>
    <div class="inline">
      <Field id="u-km" label={`Now (last: ${formatKm(latestKm)} km)`} mode="numeric" bind:value={km} />
      <button class="btn quiet" type="submit">Update</button>
    </div>
    {#if kmError}<p class="error" role="alert">{kmError}</p>{/if}
  </form>

  <div class="card">
    <span class="label">In service</span>
    {#if vehicle.inServiceDate}
      <p class="line">
        {monthYear(vehicle.inServiceDate)}
        {#if vehicle.inServiceEstimated}<span class="pill">Estimated</span>{/if}
      </p>
      {#if vehicle.inServiceEstimated}
        <p class="hint">Warranty dates are approximate until you enter the real date.</p>
      {/if}
    {:else}
      <p class="hint">Add when it went into service to see your warranty dates.</p>
    {/if}
    <form onsubmit={saveInService} class="inline">
      <div class="field">
        <label for="u-service">{vehicle.inServiceDate ? "Change date" : "Date"}</label>
        <input id="u-service" type="date" max={today} bind:value={inService} />
      </div>
      <button class="btn quiet" type="submit">Save</button>
    </form>
    {#if inServiceError}<p class="error" role="alert">{inServiceError}</p>{/if}
    {#if !vehicle.inServiceDate || vehicle.inServiceEstimated}
      <button class="btn ghost" type="button" onclick={estimateInService}>
        Don't know it? Estimate from the model year
      </button>
    {/if}
  </div>

  <div class="card">
    <label class="label" for="u-segment">Vehicle type</label>
    <select id="u-segment" value={vehicle.segment ?? ""} onchange={saveSegment}>
      <option value="">Not set</option>
      {#each SEGMENTS as key (key)}
        <option value={key}>{segmentFor(key).label}</option>
      {/each}
    </select>
    {#if !vehicle.segment}
      <p class="hint">Unlocks seasonal demand and service windows.</p>
    {/if}
  </div>

  <details class="card" open={vehicle.loan === undefined ? undefined : true}>
    <summary class="label">Loan (optional)</summary>
    {#if vehicle.loan}
      {@const owing = loanBalanceAt(vehicle.loan, today)}
      <p class="line">
        Owing about {formatCAD(owing)} today · {monthsRemainingAt(vehicle.loan, today)} months left
      </p>
      <p class="hint">
        Worked out from the {formatCAD(vehicle.loan.kind === "snapshot" ? vehicle.loan.balance : vehicle.loan.principal)}
        you entered at {(vehicle.loan.apr * 100).toFixed(2)}%. The Dealer tab will use it for your trade payoff.
      </p>
      <button class="btn quiet" type="button" onclick={removeLoan}>Remove loan</button>
    {:else}
      <form onsubmit={saveLoan} class="stack">
        <div class="fields">
          <Field id="u-balance" label="You owe" bind:value={balance} />
          <Field id="u-apr" label="Rate % APR" bind:value={apr} />
          <Field id="u-months" label="Months left" mode="numeric" bind:value={monthsLeft} />
        </div>
        {#if loanError}<p class="error" role="alert">{loanError}</p>{/if}
        <button class="btn quiet" type="submit">Save loan</button>
      </form>
    {/if}
  </details>

  <button class="btn quiet remove" type="button" onclick={confirmRemove}>Remove this car</button>
</section>

<style>
  .stack {
    display: grid;
    gap: 12px;
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

  .field {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  label:not(.label) {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 600;
  }

  input,
  select {
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

  .line {
    margin: 0;
    font-weight: 500;
    display: flex;
    gap: 8px;
    align-items: center;
  }

  summary {
    cursor: pointer;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .remove {
    color: var(--bad);
  }
</style>
