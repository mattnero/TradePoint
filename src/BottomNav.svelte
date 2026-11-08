<script lang="ts">
  import type { TabName } from "./router/parse";

  let { active }: { active: TabName } = $props();

  const tabs: { name: TabName; label: string; paths: string[] }[] = [
    {
      name: "garage",
      label: "Garage",
      paths: ["M3 10.5 12 4l9 6.5V20H3z", "M7 20v-6h10v6", "M7 17h10"],
    },
    {
      name: "timeline",
      label: "Timeline",
      paths: ["M4 4v16h16", "M7 15l4-4 3 3 5-6"],
    },
    {
      name: "dealer",
      label: "Dealer",
      paths: ["M3 12V4h8l10 10-8 8z", "M7.5 8.5h.01"],
    },
    {
      name: "settings",
      label: "Settings",
      paths: ["M4 7h10", "M18 7h2", "M4 17h2", "M10 17h10", "M16 5v4", "M8 15v4"],
    },
  ];
</script>

<nav aria-label="Primary">
  {#each tabs as tab (tab.name)}
    <a
      href={`#${tab.name}`}
      class:on={tab.name === active}
      aria-current={tab.name === active ? "page" : undefined}
    >
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
        {#each tab.paths as d (d)}<path {d} />{/each}
      </svg>
      {tab.label}
    </a>
  {/each}
</nav>

<style>
  nav {
    position: sticky;
    bottom: 0;
    z-index: 5;
    background: var(--surface);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid var(--line);
    padding: 8px 6px max(10px, env(safe-area-inset-bottom, 0px));
    font-size: 11px;
    text-align: center;
  }

  a {
    display: grid;
    gap: 3px;
    justify-items: center;
    min-height: 48px;
    align-content: center;
    color: var(--muted);
    text-decoration: none;
  }

  .ico {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .on {
    color: var(--accent);
    font-weight: 600;
  }

  .on .ico {
    stroke-width: 2.2;
  }
</style>
