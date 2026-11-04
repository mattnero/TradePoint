<script lang="ts">
  import AddVehicleForm from "../garage/AddVehicleForm.svelte";
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
  import { cliffsFor } from "../model/cliffs";
  import { valueCurve } from "../model/value";
  import { todayIso } from "../model/dates";
  import { kmPerMonth, latestReading, type Vehicle } from "../model/vehicle";
  import { applyGarage } from "../decoder/state.svelte";
  import { garageStore } from "../store/garage.svelte";

  const today = todayIso();

  const vehicle = $derived(garageStore.vehicle);
  const curve = $derived(vehicle ? valueCurve(vehicle) : null);
  const report = $derived(
    vehicle ? cliffsFor(curve ? { vehicle, asOf: today, valueAt: curve.at } : { vehicle, asOf: today }) : null,
  );
  const perMonth = $derived(vehicle ? kmPerMonth(vehicle) : null);

  function title(v: Vehicle): string {
    return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  }

  function save(next: Vehicle) {
    garageStore.update((g) => ({ ...g, vehicles: [next] }));
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

    <section class="card dimmed" aria-label="Value, loan and equity (Pro)">
      <div class="row">
        <span class="label">Value vs loan</span>
        <span class="pill pro">Pro</span>
      </div>
      <p class="hint">Estimated value, loan balance and when equity turns positive.</p>
    </section>

    <span class="label">Next cliffs</span>
    {#if report.upcoming.length > 0}
      <section class="card flat list">
        {#each report.upcoming as cliff, i (i)}
          {@const when = whenLabel(cliff, today)}
          <div class="cliff">
            <div class="when">{when.big}<small>{when.small}</small></div>
            <div class="what">
              {cliffTitle(cliff)}
              <span>{cliffDetail(cliff, vehicle.make)}</span>
            </div>
          </div>
        {/each}
      </section>
    {:else}
      <p class="hint">Nothing coming up in the next 36 months that the app can see yet.</p>
    {/if}

    {#if report.needs.includes("value")}
      <p class="hint">Add what you paid and the vehicle type below to see when your equity turns positive.</p>
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

    <button class="btn primary" type="button" onclick={() => startDealerVisit(vehicle)}>
      I'm at a dealership
    </button>

    <VehicleSetup {vehicle} onchange={save} onremove={remove} />
  </div>
{:else}
  {#if garageStore.recoveredFromBrokenData}
    <p class="notice" role="status">
      Your saved garage couldn't be read, so you're starting fresh. A copy of the old data was kept on this device.
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

  .mid {
    font-family: var(--display);
    font-weight: 600;
    font-size: 26px;
    line-height: 1.1;
  }

  .dimmed {
    opacity: 0.55;
  }

  .list {
    gap: 12px;
  }

  .cliff {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 10px;
    align-items: center;
  }

  .when {
    font-family: var(--display);
    font-weight: 600;
    font-size: 20px;
    line-height: 1;
    text-align: center;
  }

  .when small {
    display: block;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: var(--body);
    font-weight: 600;
  }

  .what {
    font-size: 14px;
    font-weight: 500;
  }

  .what span {
    display: block;
    color: var(--muted);
    font-weight: 400;
    font-size: 12px;
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
