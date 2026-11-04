<script lang="ts">
  import Field from "../decoder/Field.svelte";
  import { knownMakes } from "../model/warranty";
  import { todayIso } from "../model/dates";
  import { createVehicle, type Vehicle } from "../model/vehicle";
  import { readNewVehicle } from "./inputs";

  let { onadd }: { onadd: (vehicle: Vehicle) => void } = $props();

  let year = $state("");
  let make = $state("");
  let model = $state("");
  let trim = $state("");
  let km = $state("");
  let error = $state("");

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const read = readNewVehicle({ year, make, model, trim, km }, todayIso());
    if (!read.ok) {
      error = read.error;
      return;
    }
    error = "";
    onadd(createVehicle(read.value, crypto.randomUUID()));
  }
</script>

<form onsubmit={submit} class="form">
  <h1>Your car</h1>
  <p class="hint">Four details to start. Everything else is optional and unlocks more later.</p>

  <div class="fields">
    <Field id="v-year" label="Year" mode="numeric" bind:value={year} />
    <div class="field">
      <label for="v-make">Make</label>
      <input id="v-make" list="makes" autocomplete="off" autocapitalize="words" bind:value={make} />
      <datalist id="makes">
        {#each knownMakes() as name (name)}
          <option value={name}></option>
        {/each}
      </datalist>
    </div>
    <Field id="v-model" label="Model" mode="text" capitalize="words" bind:value={model} />
    <Field id="v-trim" label="Trim (optional)" mode="text" capitalize="words" bind:value={trim} />
  </div>
  <Field id="v-km" label="Odometer (km)" mode="numeric" bind:value={km} />

  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <button class="btn primary" type="submit">Add my car</button>
  <p class="hint">Saved on this device only. Nothing is sent anywhere.</p>
</form>

<style>
  .form {
    display: grid;
    gap: 12px;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 10px;
    align-items: end;
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

  input {
    font: inherit;
    font-family: var(--display);
    font-weight: 600;
    font-size: 22px;
    min-height: 48px;
    padding: 6px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    width: 100%;
    min-width: 0;
  }
</style>
