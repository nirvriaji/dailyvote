<script lang="ts">
  import type { BallotColumn } from '$lib/types';
  import { nav } from '$lib/stores/navigation.svelte';

  interface Props {
    columns: BallotColumn[];
  }

  let { columns }: Props = $props();

  // Get the rows from the first column (all columns have same parties in same order)
  let ordinalRows = $derived(columns[0]?.rows ?? []);
  
  let contentEl = $state<HTMLElement | null>(null);

  // Section colors for hover highlighting - Soft but bright tones
  const SECTION_COLORS: Record<string, string> = {
    'presidente': '#A5E0F5',
    'senadores-nacional': '#FDC8CE',
    'senadores-regional': '#FDD8A8',
    'diputados': '#A8EBC8',
    'parlamento-andino': '#FAE8A0',
  };

  // Reactive hover state from store
  let hoveredIndex = $derived(nav.hoveredRowIndex);
  let hoveredSection = $derived(nav.hoveredSection);

  // Sync scroll from the shared store
  $effect(() => {
    if (contentEl && nav.sharedScrollY !== contentEl.scrollTop) {
      contentEl.scrollTop = nav.sharedScrollY;
    }
  });

  function onScroll() {
    if (!contentEl) return;
    nav.syncScroll(contentEl.scrollTop);
  }

  function isEven(index: number): boolean {
    return index % 2 === 0;
  }

  function getHoverBgColor(section: string | null): string {
    return section ? (SECTION_COLORS[section] || 'rgba(0,0,0,0.06)') : 'rgba(0,0,0,0.06)';
  }
</script>

<div class="ordinal-outer">
  <!-- Header fijo (fuera del viewport) -->
  <header class="ordinal-header">
    <span class="ordinal-label">N°</span>
  </header>

  <!-- Viewport que recorta el contenido -->
  <div class="ordinal-viewport">
    <!-- Contenido scrollable - todas las filas de forma continua -->
    <div class="ordinal-content" bind:this={contentEl} onscroll={onScroll}>
      {#each ordinalRows as row, index (row.id)}
        <div 
          class="ordinal-row" 
          class:is-even={isEven(index)}
          class:is-hovered={hoveredIndex === index}
          style="--hover-bg: {getHoverBgColor(hoveredSection)}"
        >
          <span class="ordinal-number" style:color={row.partyColor}>{row.partyNumber}</span>
        </div>
      {/each}

      <div class="col-spacer" aria-hidden="true"></div>
    </div>
  </div>
  
  <!-- Fade superior -->
  <div class="header-fade" aria-hidden="true"></div>
</div>

<style>
  .ordinal-outer {
    width: 48px;
    height: 100%;
    overflow: hidden;
    background: var(--paper-white);
    border-right: 1px solid var(--grid-border);
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    
    /* Layout vertical: header arriba, viewport abajo */
    display: flex;
    flex-direction: column;
  }

  /* ─── Header — Matches ballot column headers ─────────────────────────────────── */
  .ordinal-header {
    padding: 8px 4px 6px;
    border-bottom: 1px solid var(--grid-border);
    /* Soft gray/plomo header background */
    background: var(--col-header-bg);
    z-index: 20;
    
    /* Same height as ballot column headers */
    height: 46px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    flex-shrink: 0;
  }

  .ordinal-label {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--sky-text);
    letter-spacing: 0.03em;
    text-transform: uppercase;
    line-height: 1;
  }

  /* ─── Viewport (recorta el contenido) ────────────────────────────────────────── */
  .ordinal-viewport {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: var(--paper-white);
  }

  /* ─── Contenido scrollable ─────────────────────────────────────────────────── */
  .ordinal-content {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    /* Free scroll - no zones */
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
    background: var(--paper-white);
    
    /* Hide scrollbar */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .ordinal-content::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  /* ─── Ordinal rows — Seamless integration with ballot rows ────────────────────── */
  .ordinal-row {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: var(--row-height, 56px); /* Same as ballot-row */
    border-bottom: 1px solid var(--grid-border-light);
    background: transparent;
    transition: background 0.12s ease;
  }

  /* Alternating background - matches ballot-row */
  .ordinal-row.is-even {
    background: rgba(0, 0, 0, 0.015);
  }

  /* Hover state - synchronized with ballot row hover */
  .ordinal-row.is-hovered {
    background: var(--hover-bg) !important;
  }

  .ordinal-row:last-child {
    border-bottom: 1px solid var(--grid-border);
  }

  /* ─── Ordinal number — Integrated, subtle ────────────────────────────────────── */
  .ordinal-number {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
    line-height: 1;
  }

  /* ─── Fade superior ─────────────────────────────────────────────────────────── */
  .header-fade {
    position: absolute;
    top: 46px; /* Match header height */
    left: 0;
    right: 0;
    height: 8px;
    /* Fade matching gray header */
    background: linear-gradient(to bottom, var(--col-header-bg), transparent);
    z-index: 15;
    pointer-events: none;
  }

  .col-spacer { 
    height: 64px; 
  }
</style>
