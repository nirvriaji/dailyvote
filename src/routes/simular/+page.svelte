<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
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

  // ─── Step labels ─────────────────────────────────────────────────────────────
  const STEP_LABELS = ['Presidencia', 'Senado nacional', 'Senado regional', 'Diputados', 'Parlamento Andino'];

  // ─── Mobile bottom sheet state ───────────────────────────────────────────────
  let mobilePanelState = $state<'hidden' | 'peek' | 'full'>('peek');

  // ─── Desktop hover lock ──────────────────────────────────────────────────────
  let lockedIdx = $state<number | null>(null);
  let _hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let _lockTimer: ReturnType<typeof setTimeout> | null = null;
  let _edgeTimer: ReturnType<typeof setTimeout> | null = null;
  const EDGE_ZONE_RATIO = 0.20; // 20% of ballot-area width on each side

  let highlightColumnId = $derived(lockedIdx !== null ? STEP_COL_IDS[lockedIdx] : null);

  // Panel height CSS var based on mobile state
  let panelH = $derived(
    mobilePanelState === 'hidden' ? '48px' :
    mobilePanelState === 'peek'   ? '45dvh' : '65dvh'
  );

  // ─── Suppress IntersectionObserver during programmatic scroll ────────────────
  let _suppressObserver = false;

  // ─── Scroll active column into view ─────────────────────────────────────────
  let _scrollEffectFirstRun = true;

  $effect(() => {
    const idx = activeIdx; // reactive dependency
    if (_scrollEffectFirstRun) { _scrollEffectFirstRun = false; return; }
    if (!ballotScroller) return;

    const colEl = ballotScroller.querySelector<HTMLElement>(`[data-col-id="${STEP_COL_IDS[idx]}"]`);
    if (!colEl) return;

    // Only scroll if the column isn't already fully visible — hovering a centered
    // column should update the panel context without moving the viewport.
    const rootRect = ballotScroller.getBoundingClientRect();
    const colRect  = colEl.getBoundingClientRect();
    const fullyVisible = colRect.left >= rootRect.left - 2 && colRect.right <= rootRect.right + 2;
    if (fullyVisible) return;

    _suppressObserver = true;
    colEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    setTimeout(() => { _suppressObserver = false; }, 700);
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function markUserInteraction() { userHasInteracted = true; }

  async function scrollToActive() {
    await tick();
    if (!ballotScroller) return;
    const colEl = ballotScroller.querySelector<HTMLElement>(`[data-col-id="${STEP_COL_IDS[activeIdx]}"]`);
    if (!colEl) return;
    colEl.scrollIntoView({ behavior: 'instant' as ScrollBehavior, inline: 'center', block: 'start' });
  }

  // Desktop hover — update active step with debounce; locked columns use longer delay
  function handleColumnHover(colId: string | null) {
    if (_hoverTimer) { clearTimeout(_hoverTimer); _hoverTimer = null; }
    if (colId === null) return;
    const idx = STEP_COL_IDS.indexOf(colId);
    if (idx === -1 || idx === activeIdx) return;
    const delay = lockedIdx !== null ? 300 : 200;
    _hoverTimer = setTimeout(() => { activeIdx = idx; }, delay);
  }

  // Edge-proximity scroll: when mouse is near left/right edge of ballot area,
  // advance to the adjacent column after a short delay.
  function handleBallotMouseMove(e: MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const zone = rect.width * EDGE_ZONE_RATIO;
    const inLeft  = x < zone;
    const inRight = x > rect.width - zone;

    if (inLeft || inRight) {
      if (_edgeTimer) return; // already counting down
      const dir = inLeft ? -1 : 1;
      _edgeTimer = setTimeout(() => {
        _edgeTimer = null;
        const next = activeIdx + dir;
        if (next >= 0 && next < STEP_KEYS.length) {
          activeIdx = next;
          lockedIdx = next;
          if (_lockTimer) clearTimeout(_lockTimer);
          _lockTimer = setTimeout(() => { lockedIdx = null; }, 800);
        }
      }, 350);
    } else {
      if (_edgeTimer) { clearTimeout(_edgeTimer); _edgeTimer = null; }
    }
  }

  function handleBallotMouseLeave() {
    if (_edgeTimer) { clearTimeout(_edgeTimer); _edgeTimer = null; }
  }

  // Focus a specific column when user taps/clicks it on the ballot
  function handleColumnFocus(colId: string) {
    const idx = STEP_COL_IDS.indexOf(colId);
    if (idx === -1) return;
    activeIdx = idx;
    lockedIdx = idx;
    if (_lockTimer) clearTimeout(_lockTimer);
    _lockTimer = setTimeout(() => { lockedIdx = null; }, 1500);
    if (typeof window !== 'undefined' && window.innerWidth <= 900) mobilePanelState = 'peek';
  }

  // Advance to the next step in sequence (both "Continuar" and "Dejar en blanco")
  function handleNextStep() {
    const next = Math.min(activeIdx + 1, STEP_KEYS.length - 1);
    activeIdx = next;
    lockedIdx = next;
    if (_lockTimer) clearTimeout(_lockTimer);
    _lockTimer = setTimeout(() => { lockedIdx = null; }, 1500);
    if (typeof window !== 'undefined' && window.innerWidth <= 900) mobilePanelState = 'peek';
  }

  // Mobile handle touch — swipe up/down to change sheet state, tap to toggle
  let _touchStartY = 0;
  function handleTouchStart(e: TouchEvent) { _touchStartY = e.touches[0].clientY; }
  function handleTouchEnd(e: TouchEvent) {
    const dy = _touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 10) {
      // tap: cycle peek↔full, or hidden→peek
      mobilePanelState = mobilePanelState === 'full' ? 'peek' : 'full';
    } else if (dy > 30) {
      mobilePanelState = mobilePanelState === 'hidden' ? 'peek' : 'full';
    } else if (dy < -30) {
      mobilePanelState = mobilePanelState === 'full' ? 'peek' : 'hidden';
    }
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
      scrollToActive();
      initDemoMode();
    } else {
      canSimulate = canStillSimulate();
      if (!isFirebaseReady) initializeFirebase();

      const entryMode = sessionStorage.getItem('entry_mode');
      const saved     = sessionStorage.getItem('dailyvote');

      if (entryMode === 'new_simulation') {
        sessionStorage.removeItem('entry_mode');
        vote.resetForNewSimulation();
        resetAllSelections();
      } else if (saved && vote.count === 0) {
        vote.hydrate(saved);
        loadPreferencesFromStorage();
      }

      scrollToActive();
    }

    const cleanups: (() => void)[] = [];

    // Scroll-based column tracking for mobile:
    // Uses horizontal center distance rather than IntersectionObserver area ratio,
    // which fails for tall columns (ratio = vertical-clip/total-height < 0.5).
    if (window.innerWidth <= 900 && ballotScroller) {
      let _scrollDebounce: ReturnType<typeof setTimeout> | null = null;

      function onBallotScroll() {
        if (_suppressObserver) return;
        // Debounce: reset on every event, fire only after scrolling settles
        if (_scrollDebounce) clearTimeout(_scrollDebounce);
        _scrollDebounce = setTimeout(() => {
          _scrollDebounce = null;
          if (!ballotScroller) return;
          const rootRect = ballotScroller.getBoundingClientRect();
          const rootCenter = rootRect.left + rootRect.width / 2;

          let bestEl: HTMLElement | null = null;
          let bestDist = Infinity;
          ballotScroller.querySelectorAll<HTMLElement>('[data-col-id]').forEach(el => {
            const rect = el.getBoundingClientRect();
            const dist = Math.abs((rect.left + rect.width / 2) - rootCenter);
            if (dist < bestDist) { bestDist = dist; bestEl = el; }
          });

          if (bestEl) {
            const idx = STEP_COL_IDS.indexOf(bestEl.dataset.colId!);
            if (idx !== -1 && idx !== activeIdx) activeIdx = idx;
          }
        }, 120);
      }

      ballotScroller.addEventListener('scroll', onBallotScroll, { passive: true });
      cleanups.push(() => ballotScroller!.removeEventListener('scroll', onBallotScroll));
    }

    // ResizeObserver: measure header height
    if (headerEl) {
      const ro = new ResizeObserver(() => { headerH = headerEl!.offsetHeight; });
      ro.observe(headerEl);
      headerH = headerEl.offsetHeight;
      cleanups.push(() => ro.disconnect());
    }

    return () => cleanups.forEach(fn => fn());
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
  style="--header-h: {headerH}px; --panel-h: {panelH}"
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
      onmousemove={handleBallotMouseMove}
      onmouseleave={handleBallotMouseLeave}
    >
      <BallotStage
        columns={ballotColumns}
        bind:scroller={ballotScroller}
        {activeColumnId}
        {completedColumnIds}
        {highlightColumnId}
        onColumnFocus={handleColumnFocus}
        onColumnHover={handleColumnHover}
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

  <!-- ── Mobile bottom panel (3-state bottom sheet) ─────────────────────── -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="context-panel-mobile"
    class:state-hidden={mobilePanelState === 'hidden'}
    class:state-peek={mobilePanelState === 'peek'}
    class:state-full={mobilePanelState === 'full'}
    aria-label="Guía de votación"
    role="complementary"
  >
    <!-- Drag handle -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="mobile-handle"
      ontouchstart={handleTouchStart}
      ontouchend={handleTouchEnd}
      onclick={() => { mobilePanelState = mobilePanelState === 'full' ? 'peek' : 'full'; }}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { mobilePanelState = mobilePanelState === 'full' ? 'peek' : 'full'; } }}
      role="button"
      tabindex="0"
      aria-expanded={mobilePanelState !== 'hidden'}
      aria-label="Expandir guía de votación"
    >
      <div class="handle-pill"></div>
      <div class="handle-row">
        <span class="mobile-step-label">Paso {activeIdx + 1} de 5 — {STEP_LABELS[activeIdx]}</span>
        <span class="mobile-chevron" class:up={mobilePanelState === 'full'}>›</span>
      </div>
    </div>

    <!-- Panel content — only when not hidden -->
    {#if mobilePanelState !== 'hidden'}
      <div class="mobile-panel-content">
        <SimulatorContextPanel
          onDeliver={handleDeliver}
          {isSubmitting}
          {showVideo}
          onToggleVideo={() => showVideo = !showVideo}
          {activeIdx}
          onNextStep={handleNextStep}
          panelMode={mobilePanelState === 'full' ? 'full' : 'peek'}
        />
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

  /* ── Mobile bottom panel (3-state bottom sheet) ───────────────────────── */
  .context-panel-mobile {
    display: none;
  }

  @media (max-width: 900px) {
    .context-panel-desktop {
      display: none;
    }

    .context-panel-mobile {
      display: flex;
      flex-direction: column;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: #0f172a;
      border-top: 1px solid #1e293b;
      transition: height 0.22s ease;
      overflow: hidden;
    }

    .context-panel-mobile.state-hidden { height: 48px; }
    .context-panel-mobile.state-peek   { height: 45dvh; }
    .context-panel-mobile.state-full   { height: 65dvh; }
  }

  /* ── Mobile handle bar ─────────────────────────────────────────────────── */
  .mobile-handle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 8px 16px 10px;
    cursor: pointer;
    flex-shrink: 0;
    border-bottom: 1px solid #1e293b;
    min-height: 48px;
    justify-content: center;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .handle-pill {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #334155;
    flex-shrink: 0;
  }

  .handle-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
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
    transform: rotate(-90deg);
    transition: transform 0.22s ease;
    flex-shrink: 0;
  }

  .mobile-chevron.up {
    transform: rotate(90deg);
  }

  /* ── Mobile panel content ──────────────────────────────────────────────── */
  .mobile-panel-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .mobile-panel-content :global(.panel) {
    height: auto;
    min-height: 0;
    border-left: none;
    border-top: none;
  }

  .mobile-panel-content :global(.cta-area) {
    position: static;
    margin-top: 0;
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
