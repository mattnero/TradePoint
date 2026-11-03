<script lang="ts">
  import type { TabName } from "./router/parse";

  let { active }: { active: TabName } = $props();

  const tabs: { name: TabName; label: string }[] = [
    { name: "garage", label: "Garage" },
    { name: "timeline", label: "Timeline" },
    { name: "dealer", label: "Dealer" },
    { name: "settings", label: "Settings" },
  ];
</script>

<nav aria-label="Primary">
  {#each tabs as tab (tab.name)}
    <a
      href={`#${tab.name}`}
      class:on={tab.name === active}
      aria-current={tab.name === active ? "page" : undefined}
    >
      <span class="ico"></span>
      {tab.label}
    </a>
  {/each}
</nav>

<style>
  nav {
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
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: var(--line);
  }

  .on {
    color: var(--accent);
    font-weight: 600;
  }

  .on .ico {
    background: var(--accent);
  }
</style>
