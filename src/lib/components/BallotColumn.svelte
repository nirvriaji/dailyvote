<script lang="ts">
  import type { BallotColumn } from '$lib/types';
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

  // Referencias para scroll y sincronización
  let viewportEl = $state<HTMLElement | null>(null);
  let contentEl = $state<HTMLElement | null>(null);

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
    <!-- Contenido scrollable - todas las filas de forma continua -->
    <div 
      class="col-content" 
      bind:this={contentEl}
      onscroll={onScroll}
      aria-label={column.title}
    >
      {#each column.rows as row (row.id)}
        <BallotRow {row} columnId={column.id} section={column.section} />
      {/each}

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
    /* Official ballot paper background */
    background: var(--paper-white);
    border-right: 1px solid var(--grid-border);
    
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

  /* ─── Column header - Official document style ─────────────────────────────── */
  .col-header {
    padding: 8px 12px 6px;
    border-bottom: 1px solid var(--grid-border);
    /* Sky blue header background */
    background: var(--sky-blue);
    z-index: 20;
    
    /* Fixed height */
    height: 46px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    flex-shrink: 0;
  }

  .col-title {
    /* Official document style: condensed, uppercase, bold */
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--sky-text);
    margin: 0 0 1px;
    line-height: 1.1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-subtitle {
    /* Supporting text - smaller, official */
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    margin: 0;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    line-height: 1.2;
  }

  /* ─── Viewport (recorta el contenido) ──────────────────────────────── */
  .col-viewport {
    flex: 1;
    overflow: hidden;
    position: relative;
    /* Clean white background - colors applied at row level */
    background: var(--paper-white);
  }

  /* ─── Contenido scrollable ──────────────────────────────────────────── */
  .col-content {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    /* Free scroll - no zones */
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

  /* ─── Fade superior ───────────────────────────────────────────────────────── */
  .header-fade {
    position: absolute;
    top: 46px;
    left: 0;
    right: 0;
    height: 8px;
    /* Fade matching sky blue header */
    background: linear-gradient(to bottom, var(--sky-blue), transparent);
    z-index: 15;
    pointer-events: none;
  }

  .col-spacer { height: 64px; }
</style>
