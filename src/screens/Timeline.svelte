<script lang="ts">
  import CliffList from "../garage/CliffList.svelte";
  import { cliffTitle, monthLabel, monthYear, pastLine, timelineDetail } from "../model/cliffCopy";
  import { todayIso } from "../model/dates";
  import { outlookFor } from "../model/outlook";
  import type { Vehicle } from "../model/vehicle";
  import { valueBasisLine } from "../model/valueCopy";
  import { garageStore } from "../store/garage.svelte";
  import VehicleSwitcher from "../garage/VehicleSwitcher.svelte";
  import ProLock from "../pro/ProLock.svelte";
  import { pro } from "../pro/pro.svelte";
  import EquityChart from "../timeline/EquityChart.svelte";
  import { chartMarkers } from "../timeline/chart";
  import ValueRefresh from "../timeline/ValueRefresh.svelte";

  const today = todayIso();

  const vehicle = $derived(garageStore.vehicle);
  const outlook = $derived(vehicle ? outlookFor(vehicle, today) : null);

  function save(next: Vehicle) {
    garageStore.updateVehicle(next);
  }

  function chartLabel(crossover: { date: string; month: number } | null, hasLoan: boolean): string {
    const base = "Estimated value and loan balance over 36 months";
    if (!hasLoan) return "Estimated value over 36 months";
    if (crossover === null) return `${base}; the loan stays above the value`;
    if (crossover.month === 0) return `${base}; equity is already positive`;
    return `${base}, crossing in ${monthYear(crossover.date)}`;
  }
</script>

<div class="stack">
  <div class="title">
    <h1>Next 36 months</h1>
    <small>Estimate</small>
  </div>

  <VehicleSwitcher />

  {#if vehicle && outlook}
    {#if !pro.isPro}
      <ProLock
        feature="chart"
        label="Value vs loan"
        hint="See your car's estimated value against your loan over the next 36 months."
      />
    {:else if outlook.curve && outlook.projection}
      {@const hasLoan = vehicle.loan !== undefined}
      {@const crossover = hasLoan ? outlook.projection.crossover : null}
      <section class="card">
        <div class="row">
          <span class="label">Value vs loan</span>
          <span class="pill pro">Pro</span>
        </div>
        <EquityChart
          input={{
            points: outlook.projection.points,
            hasLoan,
            markers: chartMarkers(outlook.report.upcoming, today),
            crossoverMonth: crossover && crossover.month > 0 ? crossover.month : null,
          }}
          label={chartLabel(crossover, hasLoan)}
        />
        <div class="legend">
          <span><span class="dot value"></span> Estimated value</span>
          {#if hasLoan}<span><span class="dot loan"></span> Loan balance</span>{/if}
        </div>
        <p class="hint">{valueBasisLine(outlook.curve.basis)} A rough estimate.</p>
      </section>
    {:else}
      <section class="card">
        <span class="label">Value vs loan</span>
        <p class="hint">
          To chart its value against your loan, set the vehicle type on the Garage tab and add either what you
          paid or a value from comps below.
        </p>
        <a class="btn quiet" href="#garage">Go to Garage</a>
      </section>
    {/if}

    {#key vehicle.id}
      <ValueRefresh {vehicle} onchange={save} />
    {/key}

    {#if outlook.report.upcoming.length > 0}
      <CliffList
        cliffs={outlook.report.upcoming}
        when={monthLabel}
        title={cliffTitle}
        detail={(c) => timelineDetail(c, vehicle.make)}
      />
    {:else}
      <p class="hint">Nothing coming up in the next 36 months that the app can see yet.</p>
    {/if}

    {#if outlook.report.past.length > 0}
      <span class="label">Already behind you</span>
      <ul class="past">
        {#each outlook.report.past as p, i (i)}
          <li>{pastLine(p)}</li>
        {/each}
      </ul>
    {/if}
  {:else}
    <p class="hint">Add your car on the Garage tab to see what's coming up for it.</p>
    <a class="btn primary" href="#garage">Add your car</a>
  {/if}
</div>

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
    align-items: center;
  }

  .legend {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .dot.value {
    background: var(--accent);
  }

  .dot.loan {
    background: var(--muted);
  }

  .past {
    margin: 0;
    padding-left: 18px;
    color: var(--muted);
    font-size: 13px;
  }
</style>
