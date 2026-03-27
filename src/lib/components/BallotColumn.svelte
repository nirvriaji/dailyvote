<script lang="ts">
  import type { BallotColumn, ZoneId } from '$lib/types';
  import { nav } from '$lib/stores/navigation.svelte';
  import BallotRow from './BallotRow.svelte';

  interface Props {
    column: BallotColumn;
    /**
     * Distance from active column. 0 = active, 1 = adjacent, 2+ = far.
     * Controls depth effect (opacity + scale).
     */
    distance?: number;
    /** Called when an inactive column is clicked — navigates to it. */
    onActivate?: () => void;
    /** Called with the scroll container element after mount (used by onboarding). */
    onScrollRef?: (el: HTMLElement) => void;
    /** Called when scroll position changes — for syncing with other columns. */
    onScrollChange?: (y: number) => void;
  }

  let { column, distance = 0, onActivate, onScrollRef, onScrollChange }: Props = $props();

  let active = $derived(distance === 0);

  // Section-specific tint colors for body content (not headers)
  const SECTION_TINTS: Record<string, string> = {
    'presidente': 'rgba(120, 170, 200, 0.10)',        // Blue-ish
    'senadores-nacional': 'rgba(220, 150, 170, 0.10)', // Pink-ish
    'senadores-regional': 'rgba(190, 160, 140, 0.10)', // Light brown
    'diputados': 'rgba(150, 190, 170, 0.10)',          // Light green
    'parlamento-andino': 'rgba(220, 210, 140, 0.12)',  // Light yellow
  };

  let sectionTint = $derived(SECTION_TINTS[column.section] || 'transparent');

  // Referencias para scroll y sincronización
  let viewportEl = $state<HTMLElement | null>(null);
  let contentEl = $state<HTMLElement | null>(null);
  let topAnchor    = $state<HTMLElement | null>(null);
  let middleAnchor = $state<HTMLElement | null>(null);
  let bottomAnchor = $state<HTMLElement | null>(null);

  const byZone = $derived({
    top:    column.rows.filter(r => r.zone === 'top'),
    middle: column.rows.filter(r => r.zone === 'middle'),
    bottom: column.rows.filter(r => r.zone === 'bottom'),
  });

  // Register scroll container con BallotStage
  $effect(() => {
    if (contentEl) onScrollRef?.(contentEl);
  });

  // Sincronizar scroll desde el store compartido
  $effect(() => {
    if (contentEl && !active && nav.sharedScrollY !== contentEl.scrollTop) {
      contentEl.scrollTop = nav.sharedScrollY;
    }
  });

  function onScroll() {
    if (!contentEl) return;
    
    const scrollTop = contentEl.scrollTop;
    
    // Solo la columna activa actualiza el scroll compartido
    if (active) {
      nav.syncScroll(scrollTop);
      onScrollChange?.(scrollTop);
    }

    // Detectar zona actual
    const anchors: Array<{ id: ZoneId; el: HTMLElement | null }> = [
      { id: 'top',    el: topAnchor },
      { id: 'middle', el: middleAnchor },
      { id: 'bottom', el: bottomAnchor },
    ];

    let nearest: ZoneId = 'top';
    let minDist = Infinity;

    for (const { id, el } of anchors) {
      if (!el) continue;
      const dist = Math.abs((el as HTMLElement).offsetTop - scrollTop);
      if (dist < minDist) { minDist = dist; nearest = id; }
    }

    nav.setZone(nearest);
  }
</script>

<!--
  Estructura con viewport real para evitar que el contenido se vea debajo del header:
  
  .col-outer (contenedor principal, overflow hidden)
    ├── .col-header (header fijo, sticky)
    └── .col-viewport (viewport que recorta contenido)
        └── .col-content (contenido scrollable)
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="col-outer"
  class:depth-active={distance === 0}
  class:depth-near={distance === 1}
  class:depth-far={distance >= 2}
  style="--section-tint: {sectionTint}"
  aria-hidden={distance > 1}
  onclick={distance > 0 ? onActivate : undefined}
  role={distance > 0 && onActivate ? 'button' : undefined}
  tabindex={distance > 0 && onActivate ? 0 : undefined}
  onkeydown={distance > 0 && onActivate ? (e) => (e.key === 'Enter' || e.key === ' ') && onActivate() : undefined}
>
  <!-- Header fijo (fuera del viewport de scroll) -->
  <header class="col-header">
    <h2 class="col-title">{column.title}</h2>
    {#if column.subtitle}
      <p class="col-subtitle">{column.subtitle}</p>
    {/if}
  </header>

  <!-- Viewport que recorta el contenido -->
  <div class="col-viewport" bind:this={viewportEl}>
    <!-- Contenido scrollable -->
    <div 
      class="col-content" 
      bind:this={contentEl}
      onscroll={onScroll}
      aria-label={column.title}
    >
      <!-- Top zone -->
      <div class="zone-anchor" bind:this={topAnchor} data-zone="top">
        {#each byZone.top as row (row.id)}
          <BallotRow {row} columnId={column.id} section={column.section} />
        {/each}
      </div>

      <!-- Middle zone -->
      {#if byZone.middle.length > 0}
        <div class="zone-anchor" bind:this={middleAnchor} data-zone="middle">
          {#each byZone.middle as row (row.id)}
            <BallotRow {row} columnId={column.id} section={column.section} />
          {/each}
        </div>
      {/if}

      <!-- Bottom zone -->
      {#if byZone.bottom.length > 0}
        <div class="zone-anchor" bind:this={bottomAnchor} data-zone="bottom">
          {#each byZone.bottom as row (row.id)}
            <BallotRow {row} columnId={column.id} section={column.section} />
          {/each}
        </div>
      {/if}

      <div class="col-spacer" aria-hidden="true"></div>
    </div>
  </div>
  
  <!-- Fade superior para ocultar cualquier glitch visual -->
  <div class="header-fade" aria-hidden="true"></div>
</div>

<style>
  /* ─── Document section shell ────────────────────────────────────────────────── */
  .col-outer {
    /* Ancho fijo idéntico para todas las columnas */
    width: var(--col-width);
    flex-shrink: 0;
    height: 100%;
    overflow: hidden;
    /* Unified neutral paper background */
    background: #f5f2e8;
    border-right: 1px solid rgba(0, 0, 0, 0.04);
    
    /* Layout vertical: header arriba, viewport abajo */
    display: flex;
    flex-direction: column;

    /* Subtle depth transitions */
    transform-origin: center center;
    transition:
      opacity   0.4s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    
    position: relative;
  }

  /* Última columna sin borde derecho */
  .col-outer:last-child {
    border-right: none;
  }

  /* ─── Depth states — Refined, minimal ────────────────────────────────────────── */
  /* Active column: full presence */
  .col-outer.depth-active {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
    z-index: 10;
  }

  /* Adjacent columns: slight fade, no blur */
  .col-outer.depth-near {
    opacity: 0.7;
    transform: scale(0.98);
    cursor: pointer;
    z-index: 5;
  }

  /* Far columns: more fade, still readable */
  .col-outer.depth-far {
    opacity: 0.5;
    transform: scale(0.96);
    cursor: pointer;
    z-index: 1;
  }

  /* ─── Column header - Neutral printed ballot style ──────────────────────────── */
  .col-header {
    padding: 10px 14px 8px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    /* Neutral gray header background - consistent across all sections */
    background: #e8e5dd;
    z-index: 20;
    
    /* Fixed height */
    height: 46px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .col-title {
    /* Printed ballot style: dense, uppercase, bold */
    font-size: 14px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.02em;
    color: #1a1917;
    margin: 0 0 2px;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-subtitle {
    /* Supporting text - smaller but clear */
    font-size: 10px;
    font-weight: 700;
    color: #4a4946;
    margin: 0;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    line-height: 1.2;
  }

  /* ─── Viewport (recorta el contenido) ──────────────────────────────── */
  .col-viewport {
    flex: 1;
    overflow: hidden;
    position: relative;
    /* Section tint applied to body only, not header */
    background: linear-gradient(to bottom, var(--section-tint), var(--section-tint)),
                #f5f2e8;
  }

  /* ─── Contenido scrollable ──────────────────────────────────────────── */
  .col-content {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;
    overscroll-behavior-y: contain;
    -webkit-overflow-scrolling: touch;
    /* Inherits tinted background from viewport */
    background: transparent;
  }

  /* Ocultar scrollbar pero mantener funcionalidad */
  .col-content::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .zone-anchor {
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  /* ─── Fade superior ───────────────────────────────────────────────────────── */
  .header-fade {
    position: absolute;
    top: 46px;
    left: 0;
    right: 0;
    height: 10px;
    /* Neutral fade matching header color */
    background: linear-gradient(to bottom, #e8e5dd, transparent);
    z-index: 15;
    pointer-events: none;
  }

  .col-spacer { height: 64px; }
</style>
