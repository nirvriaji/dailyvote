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
  let topAnchor = $state<HTMLElement | null>(null);
  let middleAnchor = $state<HTMLElement | null>(null);
  let bottomAnchor = $state<HTMLElement | null>(null);

  const byZone = $derived({
    top: ordinalRows.filter(r => r.zone === 'top'),
    middle: ordinalRows.filter(r => r.zone === 'middle'),
    bottom: ordinalRows.filter(r => r.zone === 'bottom'),
  });

  // Section colors for hover highlighting
  const SECTION_TINTS: Record<string, string> = {
    'presidente': 'rgba(120, 170, 200, 0.25)',
    'senadores-nacional': 'rgba(220, 150, 170, 0.25)',
    'senadores-regional': 'rgba(190, 160, 140, 0.25)',
    'diputados': 'rgba(150, 190, 170, 0.25)',
    'parlamento-andino': 'rgba(220, 210, 140, 0.30)',
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
    return section ? (SECTION_TINTS[section] || 'rgba(0,0,0,0.06)') : 'rgba(0,0,0,0.06)';
  }
</script>

<div class="ordinal-outer">
  <!-- Header fijo (fuera del viewport) -->
  <header class="ordinal-header">
    <span class="ordinal-label">N°</span>
  </header>

  <!-- Viewport que recorta el contenido -->
  <div class="ordinal-viewport">
    <!-- Contenido scrollable -->
    <div class="ordinal-content" bind:this={contentEl} onscroll={onScroll}>
      <!-- Top zone -->
      <div class="zone-anchor" bind:this={topAnchor}>
        {#each byZone.top as row (row.id)}
            <div 
              class="ordinal-row" 
              class:is-even={isEven(row.rowIndex)}
              class:is-hovered={hoveredIndex === row.rowIndex}
              style="--hover-bg: {getHoverBgColor(hoveredSection)}"
            >
            <span class="ordinal-number" style:color={row.partyColor}>{row.partyNumber}</span>
          </div>
        {/each}
      </div>

      <!-- Middle zone -->
      {#if byZone.middle.length > 0}
        <div class="zone-anchor" bind:this={middleAnchor}>
          {#each byZone.middle as row (row.id)}
            <div 
              class="ordinal-row" 
              class:is-even={isEven(row.rowIndex)}
              class:is-hovered={hoveredIndex === row.rowIndex}
              style="--hover-bg: {getHoverBgColor(hoveredSection)}"
            >
              <span class="ordinal-number" style:color={row.partyColor}>{row.partyNumber}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Bottom zone -->
      {#if byZone.bottom.length > 0}
        <div class="zone-anchor" bind:this={bottomAnchor}>
          {#each byZone.bottom as row (row.id)}
            <div 
              class="ordinal-row" 
              class:is-even={isEven(row.rowIndex)}
              class:is-hovered={hoveredIndex === row.rowIndex}
              style="--hover-bg: {getHoverBgColor(hoveredSection)}"
            >
              <span class="ordinal-number" style:color={row.partyColor}>{row.partyNumber}</span>
            </div>
          {/each}
        </div>
      {/if}

      <div class="col-spacer" aria-hidden="true"></div>
    </div>
  </div>
  
  <!-- Fade superior -->
  <div class="header-fade" aria-hidden="true"></div>
</div>

<style>
  .ordinal-outer {
    width: 60px;
    height: 100%;
    overflow: hidden;
    background: #f5f2e8;
    border-right: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
    position: relative;
    z-index: 10;
    
    /* Layout vertical: header arriba, viewport abajo */
    display: flex;
    flex-direction: column;
  }

  /* ─── Header - Matches ballot column headers ─────────────────────────────────── */
  .ordinal-header {
    padding: 10px 8px 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    background: rgba(0, 0, 0, 0.02);
    z-index: 20;
    
    /* Same height as ballot column headers */
    height: 46px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    flex-shrink: 0;
  }

  .ordinal-label {
    font-size: 13px;
    font-weight: 800;
    color: #6b6a67;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    line-height: 1;
  }

  /* ─── Viewport (recorta el contenido) ────────────────────────────────────────── */
  .ordinal-viewport {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: #f5f2e8;
  }

  /* ─── Contenido scrollable ─────────────────────────────────────────────────── */
  .ordinal-content {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
    background: #f5f2e8;
    
    /* Hide scrollbar */
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .ordinal-content::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .zone-anchor {
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  /* ─── Ordinal rows - Seamless integration with ballot rows ────────────────────── */
  .ordinal-row {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 88px; /* Same as ballot-row */
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    background: transparent;
    transition: background 0.12s ease;
  }

  /* Alternating background - matches ballot-row */
  .ordinal-row.is-even {
    background: rgba(0, 0, 0, 0.02);
  }

  /* Hover state - synchronized with ballot row hover */
  .ordinal-row.is-hovered {
    background: var(--hover-bg) !important;
  }

  .ordinal-row:last-child {
    border-bottom: none;
  }

  /* ─── Ordinal number - Integrated, subtle ────────────────────────────────────── */
  .ordinal-number {
    font-size: 17px;
    font-weight: 600;
    color: #6b6a67;
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
    height: 10px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.02), transparent);
    z-index: 15;
    pointer-events: none;
  }

  .col-spacer { 
    height: 64px; 
  }
</style>
