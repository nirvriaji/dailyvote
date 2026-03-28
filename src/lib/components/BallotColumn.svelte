<script lang="ts">
  import type { BallotColumn } from '$lib/types';
  import BallotRow from './BallotRow.svelte';

  interface Props {
    column: BallotColumn;
    /** Width of the column in pixels */
    width?: number;
  }

  let { column, width = 320 }: Props = $props();
</script>

<!--
  Columna simple - parte de la hoja única
  No tiene scroll interno ni lógica de activación
-->
<div
  class="col-outer"
  style:width="{width}px"
>
  <!-- Header de la columna -->
  <header class="col-header">
    <h2 class="col-title">{column.title}</h2>
    {#if column.subtitle}
      <p class="col-subtitle">{column.subtitle}</p>
    {/if}
  </header>

  <!-- Contenido - todas las filas visibles sin scroll -->
  <div class="col-content">
    {#each column.rows as row (row.id)}
      <BallotRow {row} columnId={column.id} section={column.section} />
    {/each}
  </div>
</div>

<style>
  /* ─── Document section shell ────────────────────────────────────────────────── */
  .col-outer {
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

  /* ─── Column header - Official document style ─────────────────────────────── */
  .col-header {
    padding: 8px 12px 6px;
    border-bottom: 1px solid var(--grid-border);
    /* Soft gray/plomo header background */
    background: var(--col-header-bg);
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

  /* ─── Contenido completo (sin scroll interno) ───────────────────────────────── */
  .col-content {
    height: auto;
    overflow: visible;
    /* Inherits tinted background from viewport */
    background: transparent;
  }
</style>
