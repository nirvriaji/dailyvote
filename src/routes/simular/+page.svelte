<script lang="ts">
  import { onMount } from 'svelte';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import { vote } from '$lib/stores/vote.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import BallotStage from '$lib/components/BallotStage.svelte';
  import VoteOverlay from '$lib/components/VoteOverlay.svelte';
  import ProgressPanel from '$lib/components/ProgressPanel.svelte';

  // ─── Session persistence ──────────────────────────────────────────────────────

  onMount(() => {
    // Restore any votes from a previous session in the same browser tab
    const saved = sessionStorage.getItem('dailyvote');
    if (saved) vote.hydrate(saved);
  });

  // Persist votes on every change
  $effect(() => {
    const _ = vote.votes; // reactive dependency
    sessionStorage.setItem('dailyvote', vote.serialize());
  });
</script>

<svelte:head>
  <title>Simular voto — Cédula Electoral Perú 2026</title>
</svelte:head>

<!--
  Layout: Ordinals + gap + Stage (with current column + right preview)
  Left side: completely hidden, no peeking
  Right side: blurred preview of next column visible
  
  Structure:
    ┌───────────────────────────────────────────────┐
    │ BallotHeader                                  │
    ├───────────────────────────────────────────────┤
    │ ┌────┬──┬───────────────────────────┬─────┐│
    │ │ Ord│  │    STAGE (current +       │PREV ││
    │ │48px│4px│     right preview)        │200px││
    │ │    │  │                           │     ││
    │ └────┴──┴───────────────────────────┴─────┘│
    └───────────────────────────────────────────────┘
  
  Left side of current column is completely masked/hidden.
-->
<div class="app-shell">

  <!-- Solo la hoja de cédula navegable -->
  <div class="ballot-sheet">
    <BallotStage columns={BALLOT_COLUMNS} />
  </div>

  <!-- Bottom-sheet vote selection overlay -->
  <VoteOverlay />

  <!-- Slide-in summary panel (triggered from progress button in ContextBar) -->
  {#if ui.showSummary}
    <ProgressPanel />
  {/if}
</div>

<style>
  .app-shell {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--paper-offwhite);
  }

  /* Solo la hoja de cédula - ocupa todo el espacio */
  .ballot-sheet {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
</style>
