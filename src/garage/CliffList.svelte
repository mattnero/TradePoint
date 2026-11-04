<script lang="ts">
  import type { Cliff } from "../model/cliffs";

  let {
    cliffs,
    when,
    title,
    detail,
  }: {
    cliffs: Cliff[];
    when: (cliff: Cliff) => { big: string; small: string };
    title: (cliff: Cliff) => string;
    detail: (cliff: Cliff) => string;
  } = $props();
</script>

<section class="card flat list">
  {#each cliffs as cliff, i (i)}
    {@const w = when(cliff)}
    <div class="cliff">
      <div class="when">{w.big}<small>{w.small}</small></div>
      <div class="what">
        {title(cliff)}
        <span>{detail(cliff)}</span>
      </div>
    </div>
  {/each}
</section>

<style>
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
</style>
