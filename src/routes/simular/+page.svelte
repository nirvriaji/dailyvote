<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import { DEMO_BALLOT_COLUMNS } from '$lib/data/demoData';
  import { vote } from '$lib/stores/vote.svelte';
  import {
    isColumnValid,
    isBallotReady,
    getValidColumnCount,
    loadPreferencesFromStorage,
    resetAllSelections,
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import { initializeFirebase, isFirebaseReady, canStillSimulate } from '$lib/firebase';
  import BallotStage from '$lib/components/BallotStage.svelte';
  import BallotProgressHeader from '$lib/components/BallotProgressHeader.svelte';
  import VoteOverlay from '$lib/components/VoteOverlay.svelte';
  import SimulatorContextPanel from '$lib/components/SimulatorContextPanel.svelte';
  import { initDemoMode } from '$lib/utils/ballotDemoTour.js';

  // ─── Step/focus state ────────────────────────────────────────────────────────
  const STEP_KEYS: ColumnKey[] = [
    'presidente', 'senadoNacional', 'senadoRegional', 'diputados', 'parlamentoAndino',
  ];
  const STEP_COL_IDS = ['col0', 'col1', 'col2', 'col3', 'col4'];

  // activeIdx is managed state — NOT derived — so we can control focus per column type.
  // Presidential (idx 0): auto-advance to next incomplete when done.
  // Legislative (idx 1–4): stay on the column so user can optionally add preference numbers.
  let activeIdx = $state(
    (() => {
      const i = STEP_KEYS.findIndex(k => !isColumnValid(k));
      return i === -1 ? STEP_KEYS.length - 1 : i;
    })()
  );

  // Track previous validity per column to detect transitions
  let _prevValids: boolean[] = STEP_KEYS.map(k => isColumnValid(k));
  let _effectFirstRun = true;

  $effect(() => {
    const currValids = STEP_KEYS.map(k => isColumnValid(k));

    if (_effectFirstRun) {
      _effectFirstRun = false;
      _prevValids = currValids;
      return;
    }

    const changes: { idx: number; became: boolean }[] = [];
    for (let i = 0; i < STEP_KEYS.length; i++) {
      if (currValids[i] !== _prevValids[i]) {
        changes.push({ idx: i, became: currValids[i] });
      }
    }

    _prevValids = currValids;

    if (changes.length === 0) return;

    if (changes.length > 1) {
      // Batch change (reset / storage load): recalculate normally
      untrack(() => {
        const i = currValids.findIndex(v => !v);
        activeIdx = i === -1 ? STEP_KEYS.length - 1 : i;
      });
      return;
    }

    const { idx, became } = changes[0];

    if (!became) {
      // Column deselected: bring focus back to it
      untrack(() => { activeIdx = idx; });
      return;
    }

    // All columns: stay so user can review and explicitly click "Continuar"
    untrack(() => { activeIdx = idx; });
  });

  let activeColumnId    = $derived(STEP_COL_IDS[activeIdx]);
  let completedColumnIds = $derived(
    STEP_KEYS.map((k, i) => isColumnValid(k) ? STEP_COL_IDS[i] : null).filter(Boolean) as string[]
  );
  let isReady      = $derived(isBallotReady());
  let ballotStatus = $derived(
    getValidColumnCount() === 5 ? 'complete' : getValidColumnCount() === 0 ? 'blank' : 'partial'
  );

  // ─── Simulation status ───────────────────────────────────────────────────────
  let canSimulate = $state(true);

  // ─── Demo mode ───────────────────────────────────────────────────────────────
  let isDemoMode = $state(false);
  let ballotColumns = $derived(isDemoMode ? DEMO_BALLOT_COLUMNS : BALLOT_COLUMNS);

  // ─── Ballot scroller ref ─────────────────────────────────────────────────────
  let ballotScroller: HTMLDivElement | null = $state(null);
  let userHasInteracted = $state(false);

  // ─── Header height measurement ───────────────────────────────────────────────
  let headerEl: HTMLElement | null = $state(null);
  let headerH = $state(88);

  // ─── Video help toggle ───────────────────────────────────────────────────────
  let showVideo = $state(false);

  // ─── Delivery / transition ───────────────────────────────────────────────────
  let isSubmitting  = $state(false);
  let isTransitioning = $state(false);

  // ─── Mobile context panel expand ─────────────────────────────────────────────
  let mobilePanelExpanded = $state(false);
  const MOBILE_PANEL_COLLAPSED_H = 110;
  const MOBILE_PANEL_EXPANDED_H  = 260;
  let mobilePanelH = $derived(mobilePanelExpanded ? MOBILE_PANEL_EXPANDED_H : MOBILE_PANEL_COLLAPSED_H);

  // ─── Scroll active column into view ─────────────────────────────────────────
  let _scrollEffectFirstRun = true;

  $effect(() => {
    const idx = activeIdx; // reactive dependency
    if (_scrollEffectFirstRun) { _scrollEffectFirstRun = false; return; }
    if (!ballotScroller) return;

    const colEl = ballotScroller.querySelector<HTMLElement>(`[data-col-id="${STEP_COL_IDS[idx]}"]`);
    if (!colEl) return;

    // Use scrollIntoView on the column — inline:center keeps it in the middle horizontally
    colEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function markUserInteraction() { userHasInteracted = true; }

  function centerBallot() {
    if (!ballotScroller) return;
    const isMobile = window.innerWidth <= 900;
    let x: number, y: number;

    if (isMobile) {
      const colWidth = 320;
      const gap = 16;
      const leftSpacer = 24;
      const centerOfCol2 = leftSpacer + (colWidth + gap) + (colWidth / 2);
      x = centerOfCol2 - ballotScroller.clientWidth / 2;
    } else {
      x = (ballotScroller.scrollWidth - ballotScroller.clientWidth) / 2;
    }
    y = (ballotScroller.scrollHeight - ballotScroller.clientHeight) / 2 - 40;

    ballotScroller.scrollTo({ left: x, top: y, behavior: 'auto' });
  }

  // Focus a specific column when user taps it on the ballot
  function handleColumnFocus(colId: string) {
    const idx = STEP_COL_IDS.indexOf(colId);
    if (idx !== -1) activeIdx = idx;
  }

  // Go to the leftmost incomplete column globally
  function handleNextStep() {
    const valids = STEP_KEYS.map(k => isColumnValid(k));
    const next = valids.findIndex(v => !v);
    if (next !== -1) activeIdx = next;
  }

  // Deliver ballot → transition → navigate
  async function handleDeliver() {
    if (isSubmitting || isTransitioning) return;
    isTransitioning = true;

    // Fire-and-forget to Firebase
    vote.submitVotes().catch(() => {});

    // Hold the transition screen for effect
    await new Promise(r => setTimeout(r, 1400));
    goto('/resultados');
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    isDemoMode = urlParams.has('demo');

    if (isDemoMode) {
      canSimulate = true;
      vote.resetForNewSimulation();
      centerBallot();
      initDemoMode();
      return;
    }

    canSimulate = canStillSimulate();

    if (!isFirebaseReady) initializeFirebase();

    const entryMode = sessionStorage.getItem('entry_mode');
    const saved     = sessionStorage.getItem('dailyvote');

    if (entryMode === 'new_simulation') {
      sessionStorage.removeItem('entry_mode');
      vote.resetForNewSimulation();
      resetAllSelections(); // sync preferencePicker in-memory state
    } else if (saved && vote.count === 0) {
      vote.hydrate(saved);
      loadPreferencesFromStorage(); // sync preferencePicker visual state from localStorage
    }

    centerBallot();

    // Measure header height dynamically
    if (headerEl) {
      const ro = new ResizeObserver(() => { headerH = headerEl!.offsetHeight; });
      ro.observe(headerEl);
      headerH = headerEl.offsetHeight;
      return () => ro.disconnect();
    }
  });

  // Persist votes on any change
  $effect(() => {
    const _ = vote.votes;
    sessionStorage.setItem('dailyvote', vote.serialize());
  });
</script>

<svelte:head>
  <title>Simular Voto — Cédula Electoral Perú 2026 | Practica tu Voto</title>
  <meta name="description" content="Simula tu voto con la cédula electoral real de Perú 2026. Practica el voto preferencial, presidencial y congresal. Aprende a marcar correctamente antes del 12 de abril." />
  <meta name="keywords" content="simular voto, practicar voto, cédula electoral 2026, voto preferencial, simulador voto Perú" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://lafechamasimportante.com/simular" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://lafechamasimportante.com/simular" />
  <meta property="og:title" content="Simular Voto — Cédula Electoral Perú 2026" />
  <meta property="og:description" content="Simula tu voto con la cédula electoral real de Perú 2026." />
  <meta property="og:image" content="https://lafechamasimportante.com/favicon.svg" />
  <meta property="og:locale" content="es_PE" />
  <meta property="twitter:card" content="summary" />
  <meta property="twitter:url" content="https://lafechamasimportante.com/simular" />
  <meta property="twitter:title" content="Simular Voto — Cédula Electoral Perú 2026" />
  <meta property="twitter:description" content="Simula tu voto con la cédula electoral real de Perú 2026." />
  <meta property="twitter:image" content="https://lafechamasimportante.com/favicon.svg" />
</svelte:head>

<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<div
  class="sim-shell"
  style="--header-h: {headerH}px; --mobile-panel-h: {mobilePanelH}px"
>

  <!-- ── Fixed header with stepper ───────────────────────────────────────── -->
  <div class="header-anchor" bind:this={headerEl}>
    <BallotProgressHeader {activeIdx} />

    {#if !canSimulate}
      <div class="closed-bar" transition:fade={{ duration: 300 }}>
        Las simulaciones ya cerraron. Puedes revisar los resultados acumulados.
      </div>
    {/if}
  </div>

  <!-- ── Main body ────────────────────────────────────────────────────────── -->
  <div class="sim-body">

    <!-- Ballot area (scrollable, takes all remaining space) -->
    <div
      class="ballot-area"
      class:disabled={!canSimulate}
      role="application"
      aria-label="Cédula electoral"
      onpointerdown={markUserInteraction}
      onwheel={markUserInteraction}
      ontouchstart={markUserInteraction}
    >
      <BallotStage
        columns={ballotColumns}
        bind:scroller={ballotScroller}
        {activeColumnId}
        {completedColumnIds}
        onColumnFocus={handleColumnFocus}
      />
    </div>

    <!-- Context panel — desktop (right sidebar) -->
    <aside class="context-panel-desktop" aria-label="Guía de votación">
      <SimulatorContextPanel
        onDeliver={handleDeliver}
        {isSubmitting}
        {showVideo}
        {activeIdx}
        onNextStep={handleNextStep}
        onToggleVideo={() => showVideo = !showVideo}
      />
    </aside>

  </div>

  <!-- ── Mobile bottom panel ──────────────────────────────────────────────── -->
  <div class="context-panel-mobile" aria-label="Guía de votación">
    <!-- Toggle bar -->
    <button
      class="mobile-panel-toggle"
      onclick={() => mobilePanelExpanded = !mobilePanelExpanded}
      aria-expanded={mobilePanelExpanded}
    >
      <span class="mobile-step-label">
        Paso {activeIdx + 1} de 5 — {['Presidencia','Senado nacional','Senado regional','Diputados','Parlamento Andino'][activeIdx]}
      </span>
      <span class="mobile-chevron" class:up={mobilePanelExpanded}>›</span>
    </button>

    {#if mobilePanelExpanded}
      <div class="mobile-panel-content" transition:fade={{ duration: 180 }}>
        <SimulatorContextPanel
          onDeliver={handleDeliver}
          {isSubmitting}
          {showVideo}
          onToggleVideo={() => showVideo = !showVideo}
        />
      </div>
    {:else}
      <!-- Compact CTA always visible -->
      <div class="mobile-cta-compact">
        <button
          class="deliver-btn-mobile active"
          disabled={isSubmitting}
          onclick={handleDeliver}
        >
          {#if isSubmitting}
            Procesando...
          {:else if ballotStatus === 'complete'}
            Entregar cédula y ver cómo se procesa mi voto
          {:else if ballotStatus === 'partial'}
            Entregar cédula parcial y ver qué pasa
          {:else}
            Entregar cédula en blanco y ver qué pasa
          {/if}
        </button>
      </div>
    {/if}
  </div>

  <!-- ── VoteOverlay (bottom sheet for marking) ───────────────────────────── -->
  <VoteOverlay />

  <!-- ── Transition overlay ───────────────────────────────────────────────── -->
  {#if isTransitioning}
    <div class="transition-overlay" transition:fade={{ duration: 300 }}>
      <div class="transition-content">
        <div class="transition-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="22" stroke="#22c55e" stroke-width="2.5"/>
            <path d="M14 24L21 31L34 17" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="transition-title">Tu voto fue registrado</p>
        <p class="transition-sub">Preparando la simulación de resultados...</p>
      </div>
    </div>
  {/if}

</div>

<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<style>
  /* ── Shell ─────────────────────────────────────────────────────────────── */
  .sim-shell {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--paper-offwhite, #f5f7fb);
    display: flex;
    flex-direction: column;
  }

  /* ── Header anchor ─────────────────────────────────────────────────────── */
  .header-anchor {
    flex-shrink: 0;
    z-index: 1000;
    position: relative;
  }

  /* ── Closed bar ────────────────────────────────────────────────────────── */
  .closed-bar {
    background: #1a1a2e;
    color: white;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    padding: 8px 16px;
  }

  /* ── Body: ballot + panel ──────────────────────────────────────────────── */
  .sim-body {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }

  /* ── Ballot area ───────────────────────────────────────────────────────── */
  .ballot-area {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }

  .ballot-area.disabled {
    pointer-events: none;
    opacity: 0.55;
    filter: grayscale(0.4);
  }

  /* ── Desktop context panel ─────────────────────────────────────────────── */
  .context-panel-desktop {
    width: 300px;
    flex-shrink: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ── Mobile bottom panel ───────────────────────────────────────────────── */
  .context-panel-mobile {
    display: none;
  }

  @media (max-width: 900px) {
    .context-panel-desktop {
      display: none;
    }

    .context-panel-mobile {
      display: block;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: #0f172a;
      border-top: 1px solid #1e293b;
      max-height: 60dvh;
      overflow-y: auto;
    }
  }

  /* ── Mobile toggle bar ─────────────────────────────────────────────────── */
  .mobile-panel-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    border-bottom: 1px solid #1e293b;
  }

  .mobile-step-label {
    font-size: 12px;
    font-weight: 700;
    color: #e2e8f0;
    text-align: left;
  }

  .mobile-chevron {
    font-size: 20px;
    color: #475569;
    font-weight: 300;
    transform: rotate(90deg);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .mobile-chevron.up {
    transform: rotate(-90deg);
  }

  /* ── Mobile expanded panel content ─────────────────────────────────────── */
  .mobile-panel-content :global(.panel) {
    height: auto;
    min-height: 0;
    border-left: none;
    border-top: 1px solid #1e293b;
  }

  .mobile-panel-content :global(.cta-area) {
    position: static;
    margin-top: 0;
    border-top: 1px solid #1e293b;
  }

  /* ── Mobile compact CTA ─────────────────────────────────────────────────── */
  .mobile-cta-compact {
    padding: 10px 16px 12px;
  }

  .deliver-btn-mobile {
    width: 100%;
    padding: 13px 16px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: not-allowed;
    background: #1e293b;
    color: #475569;
    transition: all 0.25s ease;
    line-height: 1.4;
    text-align: center;
  }

  .deliver-btn-mobile.active {
    background: linear-gradient(135deg, #C8102E 0%, #a00d25 100%);
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(200, 16, 46, 0.3);
  }

  /* ── Transition overlay ─────────────────────────────────────────────────── */
  .transition-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 16, 30, 0.97);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
  }

  .transition-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
    padding: 0 24px;
  }

  .transition-icon {
    animation: gentle-pulse 1.5s ease-in-out infinite;
  }

  @keyframes gentle-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.85; transform: scale(1.04); }
  }

  .transition-title {
    font-size: 24px;
    font-weight: 800;
    color: white;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .transition-sub {
    font-size: 15px;
    color: #64748b;
    margin: 0;
  }

  /* ── Demo highlight (from ballotDemoTour.js) ────────────────────────────── */
  :global(.demo-highlight) {
    position: relative;
    z-index: 3;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.28);
    transition: box-shadow 260ms ease;
  }
</style>
