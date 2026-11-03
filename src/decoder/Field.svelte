<script lang="ts">
  let {
    id,
    label,
    value = $bindable(),
    mode = "decimal",
    hint,
  }: {
    id: string;
    label: string;
    value: string;
    mode?: "decimal" | "numeric";
    hint?: string;
  } = $props();
</script>

<div class="field">
  <label for={id}>{label}</label>
  <input
    {id}
    type="text"
    inputmode={mode}
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
    enterkeyhint="next"
    bind:value
  />
  {#if hint}<span class="hint">{hint}</span>{/if}
</div>

<style>
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

  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .hint {
    font-size: 12px;
    color: var(--muted);
  }
</style>
