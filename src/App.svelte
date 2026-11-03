<script lang="ts">
  import { router } from "./router/router.svelte";
  import { tabFor } from "./router/parse";
  import Garage from "./screens/Garage.svelte";
  import Timeline from "./screens/Timeline.svelte";
  import Dealer from "./screens/Dealer.svelte";
  import Verdict from "./screens/Verdict.svelte";
  import Settings from "./screens/Settings.svelte";
  import BottomNav from "./BottomNav.svelte";

  const route = $derived(router.route);
  const tab = $derived(tabFor(route));
</script>

<div class="shell">
  <main>
    {#if route.name === "garage"}
      <Garage />
    {:else if route.name === "timeline"}
      <Timeline />
    {:else if route.name === "dealer"}
      <Dealer />
    {:else if route.name === "verdict"}
      <Verdict />
    {:else}
      <Settings />
    {/if}
  </main>
  <BottomNav active={tab} />
</div>

<style>
  .shell {
    display: grid;
    grid-template-rows: 1fr auto;
    min-height: 100dvh;
    max-width: 480px;
    margin: 0 auto;
    padding-top: env(safe-area-inset-top, 0px);
  }

  main {
    padding: 16px max(16px, env(safe-area-inset-left, 0px)) 16px
      max(16px, env(safe-area-inset-right, 0px));
    min-width: 0;
  }
</style>
