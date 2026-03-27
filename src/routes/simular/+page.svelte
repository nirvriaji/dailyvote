<script lang="ts">
  import { onMount } from 'svelte';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import { nav } from '$lib/stores/navigation.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import BallotStage from '$lib/components/BallotStage.svelte';
  import OrdinalColumn from '$lib/components/OrdinalColumn.svelte';
  import ContextBar from '$lib/components/ContextBar.svelte';
  import VoteOverlay from '$lib/components/VoteOverlay.svelte';
  import ProgressPanel from '$lib/components/ProgressPanel.svelte';

  // ─── Session persistence ──────────────────────────────────────────────────────

  onMount(() => {
    // Restore any votes from a previous session in the same browser tab
    const saved = sessionStorage.getItem('dailyvote');
    if (saved) vote.hydrate(saved);

    // ─── Keyboard navigation ───────────────────────────────────────────────────
    function onKeydown(e: KeyboardEvent) {
      // If a dialog/overlay is open, only handle Escape
      if (ui.activeRow) {
        if (e.key === 'Escape') ui.closeOverlay();
        return;
      }
      if (ui.showSummary) {
        if (e.key === 'Escape') ui.closeSummary();
        return;
      }

      switch (e.key) {
        case 'ArrowRight': nav.next(); break;
        case 'ArrowLeft':  nav.prev(); break;
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
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

  <!-- Context bar: always visible, shows minimap + section + progress -->
  <ContextBar />

  <!-- Layout: Ordinals (60px) + gap (8px) + Stage (flexible with current + right preview) -->
  <div class="ballot-container">
    <!-- Fixed ordinal column on the left -->
    <div class="ordinal-wrapper">
      <OrdinalColumn columns={BALLOT_COLUMNS} />
    </div>
    
    <!-- Gap spacer -->
    <div class="gap-spacer"></div>
    
    <!-- Stage: shows current column + right preview, hides left side completely -->
    <div class="stage-wrapper">
      <BallotStage columns={BALLOT_COLUMNS} />
    </div>
  </div>

  <!-- Column nav arrows — visible on desktop, hidden on mobile (use swipe) -->
  <nav class="col-arrows" aria-label="Cambiar columna">
    {#if nav.canGoLeft}
      <button
        class="arrow arrow-left"
        onclick={() => nav.prev()}
        aria-label="Columna anterior: {nav.column > 0 ? BALLOT_COLUMNS[nav.column - 1].title : ''}"
      >‹</button>
    {:else}
      <span></span>
    {/if}

    {#if nav.canGoRight}
      <button
        class="arrow arrow-right"
        onclick={() => nav.next()}
        aria-label="Siguiente columna: {nav.column < 4 ? BALLOT_COLUMNS[nav.column + 1].title : ''}"
      >›</button>
    {:else}
      <span></span>
    {/if}
  </nav>

  <!-- Bottom-sheet vote selection overlay -->
  <VoteOverlay />

  <!-- Slide-in summary panel (triggered from progress button in ContextBar) -->
  {#if ui.showSummary}
    <ProgressPanel />
  {/if}

  <!-- Onboarding is handled inside BallotStage (viewport-based cinematic intro) -->
</div>

<style>
  .app-shell {
    position: fixed;
    inset: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* Layout: ordinal (48px) + small gap (4px) + stage (flexible) */
  .ballot-container {
    flex: 1;
    min-height: 0;
    margin-top: var(--bar-height, 48px);
    display: grid;
    grid-template-columns: 48px 4px 1fr;
    background: var(--paper-offwhite);
  }

  /* Ordinal column: fixed width */
  .ordinal-wrapper {
    width: 48px;
    height: 100%;
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }

  /* Small gap between ordinals and stage */
  .gap-spacer {
    width: 4px;
    height: 100%;
    background: transparent;
  }

  /* Stage: fills remaining width, hides left peek completely */
  .stage-wrapper {
    flex: 1;
    height: 100%;
    overflow: hidden;
    position: relative;
  }

  /* ─── Desktop column navigation arrows ──────────────────────────────────────── */
  .col-arrows {
    position: fixed;
    top: calc(var(--bar-height, 48px) + 50%);
    left: 52px; /* After ordinals (48px) + gap (4px) */
    right: 0;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 6px;
    pointer-events: none;
    z-index: 30;
  }

  .arrow {
    pointer-events: auto;
    width: 32px;
    height: 32px;
    background: var(--paper-white);
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    color: var(--text-secondary);
    font-size: 18px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.15s, background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
    padding-bottom: 1px;
  }

  .arrow:hover   { 
    opacity: 1; 
    background: var(--paper-cream);
    border-color: var(--grid-border-light);
  }
  .arrow:active  { opacity: 0.6; }

  /* On narrow screens, swipe is the primary navigation method — hide arrows */
  @media (max-width: 600px) {
    .col-arrows { display: none; }
  }
</style>
