<script lang="ts">
  import AddVehicleForm from "../garage/AddVehicleForm.svelte";
  import CliffList from "../garage/CliffList.svelte";
  import PrepChecklist from "../garage/PrepChecklist.svelte";
  import VehicleSetup from "../garage/VehicleSetup.svelte";
  import {
    activeSeasonLine,
    cliffDetail,
    cliffTitle,
    formatKm,
    pastLine,
    updatedLabel,
    whenLabel,
  } from "../model/cliffCopy";
  import { todayIso } from "../model/dates";
  import { loanBalanceAt, monthsRemainingAt } from "../model/loan";
  import { formatCAD } from "../model/money";
  import { outlookFor } from "../model/outlook";
  import { equityPill, valueBasisLine } from "../model/valueCopy";
  import { windowSentence } from "../model/windowCopy";
  import { kmPerMonth, latestReading, type Vehicle } from "../model/vehicle";
  import type { Prep } from "../model/prep";
  import { applyGarage } from "../decoder/state.svelte";
  import { garageStore } from "../store/garage.svelte";

  const today = todayIso();

  const vehicle = $derived(garageStore.vehicle);
  const outlook = $derived(vehicle ? outlookFor(vehicle, today) : null);
  const report = $derived(outlook?.report ?? null);
  const sentence = $derived(outlook?.window && outlook.keep ? windowSentence(outlook.window, outlook.keep) : null);
  const perMonth = $derived(vehicle ? kmPerMonth(vehicle) : null);

  function title(v: Vehicle): string {
    return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  }

  function save(next: Vehicle) {
    garageStore.update((g) => ({ ...g, vehicles: [next] }));
  }

  function savePrep(v: Vehicle, prep: Prep) {
    const { prep: _, ...rest } = v;
    save(Object.keys(prep).length === 0 ? rest : { ...rest, prep });
  }

  function startDealerVisit(v: Vehicle) {
    applyGarage(v, today);
    window.location.hash = "#dealer";
  }

  function remove() {
    garageStore.update((g) => ({ ...g, vehicles: [] }));
  }
</script>

{#if garageStore.saveFailed}
  <p class="notice" role="alert">
    This device won't let the app save (private browsing?). Your car stays until you close the tab.
  </p>
{/if}

{#if vehicle && report}
  <div class="stack">
    <div class="title">
      <h1>Your car</h1>
      <small>{updatedLabel(latestReading(vehicle).date, today)}</small>
    </div>

    <section class="card">
      <div class="row">
        <div>
          <span class="label">{title(vehicle)}</span>
          <div class="mid">{formatKm(latestReading(vehicle).km)} km</div>
        </div>
        {#if perMonth !== null}
          <span class="pill">+{formatKm(perMonth)} km / mo</span>
        {/if}
      </div>
      {#if perMonth === null}
        <p class="hint">Update your odometer in a couple of weeks to see km per month.</p>
      {/if}
    </section>

    {#if outlook?.curve && outlook.projection}
      {@const now = outlook.projection.points[0]!}
      {@const pill = equityPill(outlook.projection, today)}
      <section class="card" aria-label="Value, loan and equity">
        <div class="row">
          <div>
            <span class="label">Estimated value</span>
            <div class="big">{formatCAD(now.value)}</div>
          </div>
          <div class="right">
            <span class="label">Loan balance</span>
            {#if vehicle.loan}
              <div class="big">{formatCAD(loanBalanceAt(vehicle.loan, today))}</div>
              <p class="hint">
                {(vehicle.loan.apr * 100).toFixed(2)}% · {monthsRemainingAt(vehicle.loan, today)} mo left
              </p>
            {:else}
              <div class="big">$0</div>
              <p class="hint">No loan</p>
            {/if}
          </div>
        </div>
        <div class="row">
          <span class="label">Equity <span class="pill pro">Pro</span></span>
          <span class="pill {pill.tone}">{pill.text}</span>
        </div>
        <p class="hint">{valueBasisLine(outlook.curve.basis)} A rough estimate.</p>
        <a class="btn quiet" href="#timeline">Refresh value from comps</a>
      </section>
    {:else}
      <section class="card dimmed" aria-label="Value, loan and equity">
        <div class="row">
          <span class="label">Value vs loan</span>
          <span class="pill pro">Pro</span>
        </div>
        <p class="hint">Add what you paid and the vehicle type below to estimate its value and when equity turns positive.</p>
      </section>
    {/if}

    {#if sentence}
      <div class="banner" role="note">
        <strong>{sentence.title}</strong>
        {sentence.body}
      </div>
    {/if}

    <span class="label">Next cliffs</span>
    {#if report.upcoming.length > 0}
      <CliffList
        cliffs={report.upcoming}
        when={(c) => whenLabel(c, today)}
        title={cliffTitle}
        detail={(c) => cliffDetail(c, vehicle.make)}
      />
    {:else}
      <p class="hint">Nothing coming up in the next 36 months that the app can see yet.</p>
    {/if}

    {#if report.activeSeason}
      <p class="hint">{activeSeasonLine(report.activeSeason)}</p>
    {/if}

    {#if report.past.length > 0}
      <span class="label">Already behind you</span>
      <ul class="past">
        {#each report.past as p, i (i)}
          <li>{pastLine(p)}</li>
        {/each}
      </ul>
    {/if}

    {#if report.needs.includes("warrantyTerms")}
      <p class="hint">
        The app has no Canadian warranty terms for {vehicle.make} yet, so it can't date your warranty.
      </p>
    {/if}

    {#key vehicle.id}
      <PrepChecklist prep={vehicle.prep} onchange={(prep) => savePrep(vehicle, prep)} />
    {/key}

    <button class="btn primary" type="button" onclick={() => startDealerVisit(vehicle)}>
      I'm at a dealership
    </button>

    <VehicleSetup {vehicle} onchange={save} onremove={remove} />
  </div>
{:else}
  {#if garageStore.recoveredFromBrokenData}
    <p class="notice" role="status">
      Your saved garage couldn't be read, so you're starting fresh. A copy of the old data was kept on this device;
      you can copy it out from <a href="#settings">Settings</a>.
    </p>
  {/if}
  <AddVehicleForm onadd={save} />
{/if}

<style>
  .stack {
    display: grid;
    gap: 12px;
  }

  .title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  h1 {
    font-size: 28px;
  }

  small {
    color: var(--muted);
    font-size: 12px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }

  .right {
    text-align: right;
  }

  .big {
    font-family: var(--display);
    font-weight: 700;
    font-size: 34px;
    line-height: 1;
  }

  .pill.good {
    background: var(--good-soft);
    color: var(--good);
  }

  .pill.bad {
    background: var(--bad-soft);
    color: var(--bad);
  }

  .label .pill {
    font-size: 9px;
    padding: 1px 6px;
    margin-left: 4px;
    vertical-align: 1px;
  }

  .banner {
    border-left: 4px solid var(--accent);
    padding: 8px 12px;
    background: var(--accent-soft);
    border-radius: 8px;
    font-size: 13px;
  }

  .banner strong {
    display: block;
    font-family: var(--display);
    font-size: 17px;
    font-weight: 600;
  }

  .mid {
    font-family: var(--display);
    font-weight: 600;
    font-size: 26px;
    line-height: 1.1;
  }

  .dimmed {
    opacity: 0.55;
  }

  .past {
    margin: 0;
    padding-left: 18px;
    color: var(--muted);
    font-size: 13px;
  }

  .notice {
    margin: 0 0 12px;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--warn-soft);
    color: var(--ink);
    font-size: 13px;
  }
</style>
