<script lang="ts">
  let {
    id,
    label,
    value = $bindable(),
    mode = "decimal",
    hint,
    error,
    prefilled = false,
  }: {
    id: string;
    label: string;
    value: string;
    mode?: "decimal" | "numeric";
    hint?: string;
    error?: string | undefined;
    prefilled?: boolean;
  } = $props();
</script>

<div class="field" class:prefilled class:invalid={error !== undefined}>
  <label for={id}>{label}</label>
  <input
    {id}
    type="text"
    inputmode={mode}
    autocomplete="off"
    autocapitalize="off"
    spellcheck="false"
    enterkeyhint="next"
    aria-invalid={error !== undefined}
    aria-describedby={error !== undefined ? `${id}-error` : undefined}
    bind:value
  />
  {#if error !== undefined}
    <span class="msg" id={`${id}-error`}>{error}</span>
  {:else if hint}
    <span class="hint">{hint}</span>
  {/if}
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

  .prefilled input {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .invalid input {
    border-color: var(--bad);
    background: var(--bad-soft);
  }

  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .hint {
    font-size: 12px;
    color: var(--muted);
  }

  .msg {
    font-size: 12px;
    color: var(--bad);
  }
</style>
