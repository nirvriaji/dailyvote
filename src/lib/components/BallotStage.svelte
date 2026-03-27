<script lang="ts">
  import type { BallotColumn as BallotColumnData, GestureIntent } from '$lib/types';
  import { gesture } from '$lib/actions/gesture';
  import BallotColumn from './BallotColumn.svelte';

  interface Props {
    columns: BallotColumnData[];
  }
  let { columns }: Props = $props();

  // ─── Viewport ─────────────────────────────────────────────────────────────────
  let vw = $state(0);

  // ─── Single Paper Sheet Layout ────────────────────────────────────────────────
  // All 5 columns form one continuous sheet with responsive zoom
  const COLUMN_COUNT = 5;
  const COLUMN_GAP = 16;
  const BASE_COL_WIDTH = 320; // Base width per column at 100% zoom
  const MIN_ZOOM = 0.5; // Minimum zoom (50%)
  const MAX_ZOOM = 1.2; // Maximum zoom (120%)
   
  // Calculate optimal zoom to fit content ergonomically
  let optimalZoom = $derived(
    Math.min(MAX_ZOOM, 
      Math.max(MIN_ZOOM, 
        (vw - 100) / ((COLUMN_COUNT * BASE_COL_WIDTH) + ((COLUMN_COUNT - 1) * COLUMN_GAP))
      )
    )
  );
  
  // Column width at current zoom level
  let colWidth = $derived(BASE_COL_WIDTH * optimalZoom);
  
  // Stage width with all columns
  let stageW = $derived((COLUMN_COUNT * colWidth) + ((COLUMN_COUNT - 1) * COLUMN_GAP));
  
  // Pan state - free positioning
  let panX = $state(0);
  let panY = $state(0);
  let isDragging = $state(false);
  
  // Allow free drag always
  let isDraggable = $state(true);

  // ─── Combined transform ────────────────────────────────────────────────────────
  // Transform with zoom and pan
  let stageTransform = $derived(`translateX(${panX}px) translateY(${panY}px) scale(${optimalZoom})`);

  // ─── Free Pan Navigation ───────────────────────────────────────────────────────
  // Pan freely in any direction to navigate the paper sheet
  
  function onStart() {
    isDragging = true;
  }

  function onMove(dx: number, dy: number, _intent: GestureIntent) {
    // Pan freely in both directions
    panX += dx;
    panY += dy;
  }

  function onEnd(_intent: GestureIntent, vx: number, vy: number) {
    isDragging = false;
    
    // Add momentum/inertia for both directions
    const decay = () => {
      if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) return;
      panX += vx * 16;
      panY += vy * 16;
      vx *= 0.95;
      vy *= 0.95;
      requestAnimationFrame(decay);
    };
    if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
      requestAnimationFrame(decay);
    }
  }

  // No effect to reset position - keep free positioning
</script>

<!--
  stage-viewport: window to view the paper ballot sheet.
  All 5 columns form a single continuous sheet with zoom.
  Pan freely in any direction to navigate.
-->
<div
  class="stage-viewport"
  bind:clientWidth={vw}
  use:gesture={{ onStart, onMove, onEnd }}
  aria-label="Cédula electoral — hoja única"
  >
  <!-- Document container - single paper sheet with all columns -->
  <div
    class="document-sheet"
    class:dragging={isDragging}
    style:transform={stageTransform}
    style:width="{(COLUMN_COUNT * BASE_COL_WIDTH) + ((COLUMN_COUNT - 1) * COLUMN_GAP)}px"
  >
    {#each columns as column, i (column.id)}
      <BallotColumn
        {column}
        width={BASE_COL_WIDTH}
      />
    {/each}
  </div>
</div>

<style>
  /* ─── Stage viewport — Clean view with natural scroll ───────────────────── */
  .stage-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: visible;
    touch-action: none; /* We handle all gestures manually */
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    
    /* Paper ballot background */
    background: var(--paper-offwhite);
  }

  .stage-viewport:active,
  .stage-viewport:has(.dragging) { 
    cursor: grabbing; 
  }

  /* ─── Document sheet — Single continuous paper ─────────────────────────────── */
  .document-sheet {
    display: flex;
    gap: 16px; /* Gap between columns */
    height: auto; /* Allow natural height */
    min-height: 100%;
    will-change: transform;
    transition: none;
    align-items: flex-start; /* Align to top */
    
    /* Official ballot paper */
    background: var(--paper-white);
    
    /* Thin borders like printed paper */
    border: 1px solid var(--grid-border-light);
    
    /* Paper shadow for depth */
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
    
    transform-origin: 0 0;
  }

  /* Dragging state */
  .document-sheet.dragging {
    transition: none;
  }
</style>
