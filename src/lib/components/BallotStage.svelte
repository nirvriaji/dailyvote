<script lang="ts">
  import type { BallotColumn as BallotColumnData, GestureIntent } from '$lib/types';
  import { nav, COLUMN_COUNT } from '$lib/stores/navigation.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { gesture } from '$lib/actions/gesture';
  import BallotColumn from './BallotColumn.svelte';

  interface Props {
    columns: BallotColumnData[];
  }
  let { columns }: Props = $props();

  // ─── Viewport ─────────────────────────────────────────────────────────────────
  let vw = $state(0);

  // ─── Layout ───────────────────────────────────────────────────────────────────
  // Column width fills space leaving room for right preview
  // Left side: no preview, column starts immediately after ordinals + small gap
  // Gap: 4px between ordinals and current column (minimal)
  // All columns have standard right preview (180px)
  const GAP = 4;
  const PREVIEW_WIDTH = 180;
  let previewRight = $derived(PREVIEW_WIDTH);
  let colWidth = $derived(Math.max(480, vw - 48 - GAP - previewRight)); // Minus ordinals (48), gap (4), preview (180)
  let stageW   = $derived(COLUMN_COUNT * colWidth);

  /*
   * With transform-origin: 0 0 on the stage,
   * transform: translateX(panX) scale(s) maps document x → screen x × s + panX.
   *
   * panXFor(c, s)   = −c × colWidth × s + offset
   *                 → aligns column c at left edge (after ordinals + small gap)
   *
   * The offset accounts for the 48px ordinal column + 4px gap
   */
  function panXFor(c: number, s: number): number {
    // Align column c so it starts at position 52px (48 + 4 gap)
    return 52 - (c * colWidth * s);
  }
  function panXFitAll(s: number): number {
    return (vw - stageW * s) / 2;
  }

  // ─── Navigation state ─────────────────────────────────────────────────────────
  let dragOffset    = $state(0);
  let animated      = $state(false); // off during onboarding; toggled by gesture
  // Align current column at left edge (after ordinals + small gap of 4px)
  let navTranslateX = $derived(64 - (nav.column * colWidth) + dragOffset);
  
  // Fade start percentage: dynamically calculated based on column width and preview
  // Formula: fade starts at (colWidth / (colWidth + previewRight)) * 100%
  // This ensures the current column is fully visible and only the preview gets faded
  let fadeStart = $derived(Math.round((colWidth / (colWidth + previewRight)) * 100));

  // ─── Onboarding state ─────────────────────────────────────────────────────────
  let onbActive    = $state(true);
  let onbStarted   = false;
  let onbCancelled = false;
  let onbScale     = $state(1);
  let onbPanX      = $state(0);
  /*
   * onbFocusCol drives depth during onboarding:
   *  -1 → all columns at depth-active (overview / zoom-out)
   *   c → depth relative to column c (same as normal navigation)
   */
  let onbFocusCol  = $state(-1);

  // Scroll container refs — registered by each BallotColumn via onScrollRef
  const colScrollEls: (HTMLElement | null)[] = Array(COLUMN_COUNT).fill(null);

  // ─── Combined transform (single expression for both modes) ────────────────────
  let stageTransform = $derived(
    onbActive
      ? `translateX(${onbPanX}px) scale(${onbScale})`
      : `translateX(${navTranslateX}px) scale(1)`
  );

  // Depth distance: during onboarding driven by onbFocusCol, else by nav.column
  function depthDistance(i: number): number {
    if (onbActive) return onbFocusCol < 0 ? 0 : Math.abs(i - onbFocusCol);
    return Math.abs(i - nav.column);
  }

  // ─── Tween primitives ─────────────────────────────────────────────────────────
  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  type TweenTarget = { get: () => number; set: (v: number) => void; to: number };

  function tweenValues(targets: TweenTarget[], duration: number, ease = easeInOutCubic): Promise<void> {
    const froms = targets.map(t => t.get());
    return new Promise(resolve => {
      const start = performance.now();
      function tick(now: number) {
        if (onbCancelled) { resolve(); return; }
        const rawT = (now - start) / duration;
        const e = ease(Math.min(1, rawT));
        targets.forEach((t, i) => t.set(froms[i] + (t.to - froms[i]) * e));
        if (rawT < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function tweenScroll(el: HTMLElement, to: number, duration: number): Promise<void> {
    const from = el.scrollTop;
    return new Promise(resolve => {
      const start = performance.now();
      function tick(now: number) {
        if (onbCancelled) { resolve(); return; }
        const rawT = (now - start) / duration;
        const e = easeInOutCubic(Math.min(1, rawT));
        el.scrollTop = from + (to - from) * e;
        if (rawT < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // ─── Onboarding sequence ──────────────────────────────────────────────────────
  async function runOnboarding(): Promise<void> {
    // Fit scale: show all 5 columns with a small margin
    const fitS = (vw / stageW) * 0.92;

    // Initial state: document zoomed out, all columns visible
    onbFocusCol = -1;
    onbScale    = fitS;
    onbPanX     = panXFitAll(fitS);

    await wait(700);
    if (onbCancelled) return;

    // Step 1 — zoom into column 5 (index 4), top zone
    onbFocusCol = 4;
    await tweenValues([
      { get: () => onbScale, set: v => onbScale = v, to: 1 },
      { get: () => onbPanX,  set: v => onbPanX  = v, to: panXFor(4, 1) },
    ], 1100, easeOutExpo);
    if (onbCancelled) return;

    await wait(500);
    if (onbCancelled) return;

    // Step 2 — scroll down through column 5
    const col5 = colScrollEls[4];
    if (col5) await tweenScroll(col5, col5.scrollHeight - col5.clientHeight, 1000);
    if (onbCancelled) return;

    await wait(400);
    if (onbCancelled) return;

    // Pre-scroll column 1 (index 0) to bottom while it's off-screen —
    // so the horizontal slide feels like the whole document is at the same level.
    const col0 = colScrollEls[0];
    if (col0) col0.scrollTop = col0.scrollHeight;

    // Step 3 — slide horizontally from column 5 to column 1
    onbFocusCol = 0;
    await tweenValues([
      { get: () => onbPanX, set: v => onbPanX = v, to: panXFor(0, 1) },
    ], 1000, easeInOutCubic);
    if (onbCancelled) return;

    await wait(400);
    if (onbCancelled) return;

    // Step 4 — scroll up to top of column 1
    if (col0) await tweenScroll(col0, 0, 900);
    if (onbCancelled) return;

    await wait(500);

    endOnboarding();
  }

  function endOnboarding(): void {
    if (!onbActive) return;
    // Enable CSS transition for a seamless handoff to nav
    animated  = true;
    onbActive = false;
    nav.goTo(0);
    ui.skipOnboarding();
    if (colScrollEls[0]) colScrollEls[0]!.scrollTop = 0;
    // Let the transition settle, then disable it so gestures feel instant
    setTimeout(() => { animated = false; }, 520);
  }

  function skipOnboarding(): void {
    onbCancelled = true;
    endOnboarding();
  }

  // Start onboarding once the viewport width is known
  $effect(() => {
    if (vw > 0 && !onbStarted) {
      onbStarted = true;
      runOnboarding();
    }
  });

  // ─── Navigation gesture ───────────────────────────────────────────────────────
  const VELOCITY_THRESHOLD = 0.32;  // px/ms
  const DISTANCE_THRESHOLD = 0.25;  // fraction of colWidth

  function rubberBand(delta: number): number {
    const atLeft  = nav.column === 0 && delta > 0;
    const atRight = nav.column === COLUMN_COUNT - 1 && delta < 0;
    return (atLeft || atRight) ? delta * 0.12 : delta;
  }

  function onStart() {
    if (onbActive) { skipOnboarding(); return; }
    animated = false;
  }

  function onMove(dx: number, _dy: number, intent: GestureIntent) {
    if (onbActive || intent !== 'horizontal') return;
    dragOffset += rubberBand(dx);
  }

  function onEnd(intent: GestureIntent, vx: number, _vy: number) {
    if (onbActive) return;
    animated = true;

    if (intent !== 'horizontal') {
      dragOffset = 0;
      return;
    }

    const distRatio = dragOffset / colWidth;
    const fastFlick = Math.abs(vx) > VELOCITY_THRESHOLD;
    const farEnough = Math.abs(distRatio) > DISTANCE_THRESHOLD;

    if (fastFlick || farEnough) {
      if (dragOffset < 0) nav.next();
      else                nav.prev();
    }

    dragOffset = 0;
  }

  $effect(() => {
    void nav.column;
    dragOffset = 0;
  });
</script>

<!--
  stage-viewport: the window through which you look at the ballot.
  Clips to viewport width. mask-image fades the lateral edges smoothly.
  Background provides depth context (looks like a desk surface).

  stage: the physical document — all 5 columns in a single row, no gap.
  transform-origin: 0 0 makes scale math predictable (origin = top-left of stage).
  Both onboarding and navigation write to the same `stageTransform` expression.
-->
<div
  class="stage-viewport"
  bind:clientWidth={vw}
  style:--col-width="{colWidth}px"
  style:--fade-start="{fadeStart}%"
  use:gesture={{ onStart, onMove, onEnd }}
  aria-label="Cédula electoral — desliza para navegar entre columnas"
>
  <!-- Document container with physical paper appearance -->
  <div
    class="document-sheet"
    class:animated={animated && !onbActive}
    style:transform={stageTransform}
    style:width="{stageW}px"
  >
    {#each columns as column, i (column.id)}
      <BallotColumn
        {column}
        distance={depthDistance(i)}
        onActivate={!onbActive && i !== nav.column ? () => nav.goTo(i) : undefined}
        onScrollRef={(el) => { colScrollEls[i] = el; }}
      />
    {/each}
    
    <!-- Empty preview spacer for last column - acts as right margin -->
    {#if nav.column === 4}
      <div class="empty-preview" aria-hidden="true"></div>
    {/if}
  </div>

  {#if onbActive}
    <!-- Tap anywhere or use this button to skip the cinematic intro -->
    <button
      class="skip-btn"
      onclick={skipOnboarding}
      onpointerdown={(e) => e.stopPropagation()}
      aria-label="Saltar introducción"
    >
      Saltar
    </button>
  {/if}
</div>

<style>
  /* ─── Stage viewport — Paper ballot background ──────────────────────────────── */
  .stage-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    touch-action: pan-y;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    
    /* Paper ballot background */
    background: var(--paper-offwhite);
    
    /* Mask: hide left side completely, show current column fully until fade-start, fade to right */
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 0%,
      black var(--fade-start, 85%),
      transparent 100%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      black 0%,
      black var(--fade-start, 85%),
      transparent 100%
    );
  }

  .stage-viewport:active { cursor: grabbing; }

  /* ─── Document sheet — Official ballot paper ───────────────────────────────── */
  .document-sheet {
    display: flex;
    gap: 0;
    height: 100%;
    will-change: transform;
    transition: none;
    align-items: stretch;
    
    /* Official ballot paper */
    background: var(--paper-white);
    
    /* Thin borders like printed paper */
    border-left: 1px solid var(--grid-border-light);
    border-right: 1px solid var(--grid-border-light);
    
    /* Subtle paper texture effect */
    box-shadow: 
      inset 0 0 60px rgba(0, 0, 0, 0.02),
      0 1px 3px rgba(0, 0, 0, 0.05);
    
    transform-origin: 0 0;
  }

  /* Used only for the handoff transition at the end of onboarding */
  .document-sheet.animated {
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* ─── Skip button — Document style ──────────────────────────────────────────── */
  .skip-btn {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 20;
    padding: 8px 16px;
    background: var(--paper-white);
    color: var(--text-secondary);
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .skip-btn:hover { 
    background: var(--paper-cream);
    border-color: var(--grid-border-light);
  }
  
  .skip-btn:active { 
    background: var(--paper-offwhite);
  }

  /* Empty preview for last column - acts as right margin */
  .empty-preview {
    width: 180px;
    flex-shrink: 0;
    height: 100%;
    background: transparent;
    pointer-events: none;
  }
</style>
