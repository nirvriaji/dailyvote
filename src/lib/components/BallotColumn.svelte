<script lang="ts">
  import type { BallotColumn } from '$lib/types';
  import BallotRow from './BallotRow.svelte';

  interface Props {
    column: BallotColumn;
    /** Width of the column in pixels */
    width?: number;
  }

  let { column, width = 320 }: Props = $props();
  
  // Determine if this column has preferential voting
  // Only President (col0) does NOT have preferential voting
  const hasPreferential = column.id !== 'col0';
  
  // Format title based on column type - combine title with scope in two lines
  function getTitleParts(col: BallotColumn): string[] {
    if (col.id === 'col0') {
      return ['PRESIDENTE Y', 'VICEPRESIDENTES'];
    }
    if (col.id === 'col1') {
      return ['SENADORES', 'NACIONAL'];
    }
    if (col.id === 'col2') {
      return ['SENADORES', 'REGIONAL'];
    }
    if (col.id === 'col3') {
      return ['DIPUTADOS', 'REGIONAL'];
    }
    if (col.id === 'col4') {
      return ['PARLAMENTO', 'ANDINO'];
    }
    return [col.title.toUpperCase()];
  }
  
  const titleParts = getTitleParts(column);
</script>

<!--
  Columna de cédula electoral - estilo documento oficial
  Headers inspirados en la cédula real del Perú
-->
<div
  class="col-outer"
  style:width="{width}px"
>
  <!-- NIVEL 1: ENCABEZADO DE TÍTULO -->
  <header class="col-header">
    <div class="title-container">
      {#each titleParts as part, i}
        <span class="title-line">{part}</span>
      {/each}
    </div>
  </header>

  <!-- NIVEL 2: FRANJA INSTRUCTIVA -->
  {#if hasPreferential}
    <!-- Columnas CON voto preferencial -->
    <div class="instructional-strip dual">
      <!-- Bloque instructivo principal -->
      <div class="instruction-block main-instruction">
        <p class="instruction-text">
          Marque con una cruz (+) o un aspa (×)<br>dentro del recuadro del símbolo de su preferencia
        </p>
      </div>
      
      <!-- Bloque de voto preferencial -->
      <div class="instruction-block preferential-block">
        <p class="preferential-title">VOTO PREFERENCIAL</p>
        <p class="preferential-text">
          Escriba 1 o 2 números<br>de sus candidatos
        </p>
      </div>
    </div>
  {:else}
    <!-- Columnas SIN voto preferencial (solo Presidente) -->
    <div class="instructional-strip single">
      <div class="instruction-block full-width">
        <p class="instruction-text">
          Marque con una cruz (+) o un aspa (×)<br>dentro del recuadro del símbolo y/o fotografía de su preferencia
        </p>
      </div>
    </div>
  {/if}

  <!-- Contenido - todas las filas visibles -->
  <div class="col-content">
    {#each column.rows as row (row.id)}
      <BallotRow {row} columnId={column.id} section={column.section} />
    {/each}
  </div>
</div>

<style>
  /* ─── Contenedor principal ──────────────────────────────────────────── */
  .col-outer {
    flex-shrink: 0;
    height: 100%;
    overflow: hidden;
    background: #FFFFFF;
    border-right: 1px solid #BDBDBD;
    display: flex;
    flex-direction: column;
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

  /* ─── NIVEL 1: ENCABEZADO DE TÍTULO ─────────────────────────────────── */
  .col-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    text-align: center;
    min-height: 64px;
    padding: 6px 6px;
    background: #FFFFFF;
    border-bottom: 1px solid #BDBDBD;
    flex-shrink: 0;
  }

  .title-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  .title-line {
    font-size: 18px;
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: -0.4px;
    text-transform: uppercase;
    color: #1F1F1F;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
  }

  /* ─── NIVEL 2: FRANJA INSTRUCTIVA ──────────────────────────────────── */
  .instructional-strip {
    background: #CFCFCF;
    border-bottom: 1px solid #BDBDBD;
    flex-shrink: 0;
  }

  /* Versión única (Presidente) */
  .instructional-strip.single {
    padding: 6px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 52px;
  }

  /* Versión dual (con voto preferencial) */
  .instructional-strip.dual {
    display: grid;
    grid-template-columns: 1fr 118px;
    column-gap: 4px;
    padding: 0;
    align-items: stretch;
    min-height: 52px;
  }

  /* Bloques instructivos */
  .instruction-block {
    background: #CFCFCF;
    border: 1px solid #BDBDBD;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .instruction-block.main-instruction {
    padding: 6px 8px;
    text-align: center;
  }

  .instruction-block.full-width {
    width: 100%;
    padding: 6px 8px;
    text-align: center;
    border: none;
    background: transparent;
  }

  .instruction-block.preferential-block {
    padding: 4px 6px;
    text-align: center;
    flex-direction: column;
    width: 118px;
    border: none;
    border-left: 1px solid #BDBDBD;
    background: transparent;
  }

  /* Textos instructivos */
  .instruction-text {
    font-size: 11px;
    font-weight: 700;
    line-height: 1.05;
    color: #111111;
    margin: 0;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
  }

  .preferential-title {
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
    margin: 0 0 2px 0;
    text-transform: uppercase;
    color: #111111;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
  }

  .preferential-text {
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
    color: #111111;
    margin: 0;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
  }

  /* ─── Contenido de la columna ───────────────────────────────────────── */
  .col-content {
    flex: 1;
    height: auto;
    overflow: visible;
    background: transparent;
  }
</style>
