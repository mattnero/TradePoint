<script lang="ts">
  import { CHART, chartGeometry, type ChartInput } from "./chart";

  let { input, label }: { input: ChartInput; label: string } = $props();

  const g = $derived(chartGeometry(input));
</script>

<svg class="chart" viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label={label}>
  {#each g.grid as line (line.label)}
    <line class="grid" x1={CHART.left} x2={CHART.width - CHART.right} y1={line.y} y2={line.y} />
    <text x={CHART.left - 4} y={line.y + 3} text-anchor="end">{line.label}</text>
  {/each}
  <path class="area" d={g.areaPath} />
  {#each g.markers as marker, i (i)}
    <line class="marker" x1={marker.x} x2={marker.x} y1={CHART.top} y2={g.baseline} />
    <text
      class="mk-lbl"
      x={marker.anchor === "start" ? marker.x + 3 : marker.x - 3}
      y={g.baseline - 4 - marker.row * 11}
      text-anchor={marker.anchor}>{marker.label}</text
    >
  {/each}
  <path class="value" d={g.valuePath} />
  {#if g.loanPath}<path class="loan" d={g.loanPath} />{/if}
  {#if g.crossover}
    {@const c = g.crossover}
    <circle class="cross" cx={c.x} cy={c.y} r="4.5" />
    <text class="cross-lbl" x={c.anchor === "start" ? c.x + 4 : c.x - 4} y={c.y - 9} text-anchor={c.anchor}>
      Positive equity
    </text>
  {/if}
  {#each g.xLabels as tick (tick.label)}
    <text x={tick.x} y={CHART.height - 8} text-anchor={tick.anchor}>{tick.label}</text>
  {/each}
</svg>

<style>
  .chart {
    width: 100%;
    height: auto;
    display: block;
  }

  text {
    font-family: var(--body);
    font-size: 10px;
    fill: var(--muted);
  }

  .grid {
    stroke: var(--line);
    stroke-width: 1;
  }

  .value {
    stroke: var(--accent);
    stroke-width: 2.2;
    fill: none;
  }

  .loan {
    stroke: var(--muted);
    stroke-width: 2;
    fill: none;
    stroke-dasharray: 4 3;
  }

  .area {
    fill: var(--accent);
    opacity: 0.12;
  }

  .marker {
    stroke: var(--warn);
    stroke-width: 1.2;
    stroke-dasharray: 2 3;
  }

  .cross {
    fill: var(--good);
    stroke: var(--surface);
    stroke-width: 2;
  }

  .cross-lbl {
    fill: var(--good);
    font-weight: 600;
  }

  .mk-lbl {
    fill: var(--warn);
    font-weight: 600;
  }
</style>
