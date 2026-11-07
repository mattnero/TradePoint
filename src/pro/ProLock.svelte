<script lang="ts">
  import type { ProFeature } from "./features";
  import { requirePro } from "./pro.svelte";

  let { feature, label, hint }: { feature: ProFeature; label: string; hint: string } = $props();
</script>

<button class="card lock" type="button" aria-haspopup="dialog" onclick={() => requirePro(feature)}>
  <span class="row">
    <span class="label">{label}</span>
    <span class="pill pro">Pro</span>
  </span>
  <span class="hint">{hint}</span>
</button>

<style>
  .lock {
    font: inherit;
    color: inherit;
    text-align: left;
    width: 100%;
    border: 1px dashed var(--line);
    cursor: pointer;
    opacity: 0.7;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }
</style>
