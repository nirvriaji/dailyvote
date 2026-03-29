<script lang="ts">
  import type { BallotColumn as BallotColumnData } from '$lib/types';
  import BallotColumn from './BallotColumn.svelte';
  import PickerOverlay from './PickerOverlay.svelte';
  import { getActivePicker } from '$lib/stores/preferencePicker.svelte';

  interface Props {
    columns: BallotColumnData[];
  }
  let { columns }: Props = $props();

  // ─── Layout Constants ─────────────────────────────────────────────────────────
  const BASE_COL_WIDTH = 320;
  const BORDER_SIZE = 24; // 24px uniform border on all sides
  
  // Obtener picker activo global
  let activePicker = $derived(getActivePicker());
</script>

<!--
  stage-viewport: scrollable window to view the entire ballot.
  Uniform border visible on all sides when scrolling to extremes.
-->
<div
  class="stage-viewport"
  aria-label="Cédula electoral — hoja única"
>
  <div class="scroll-container">
    <!-- Top spacer -->
    <div class="spacer-top"></div>
    
    <!-- Middle row with left spacer, content, right spacer -->
    <div class="content-row">
      <div class="spacer-left"></div>
      
      <!-- The ballot sheet -->
      <div class="ballot-content">
        {#each columns as column, i (column.id)}
          <BallotColumn
            {column}
            width={BASE_COL_WIDTH}
          />
        {/each}
      </div>
      
      <div class="spacer-right"></div>
    </div>
    
    <!-- Bottom spacer -->
    <div class="spacer-bottom"></div>
  </div>
</div>

<!-- Single global PickerOverlay - rendered only when active -->
{#if activePicker}
  <PickerOverlay
    anchorEl={activePicker.anchorEl}
    columnKey={activePicker.columnKey}
    rowId={activePicker.rowId}
    slotIndex={activePicker.slotIndex}
  />
{/if}

<style>
  /* ─── Stage viewport ─────────────────────────────────────────────────────────── */
  .stage-viewport {
    width: 100%;
    height: 100%;
    overflow: auto; /* Scroll both directions */
    background: var(--paper-offwhite);
  }

  /* ─── Scroll container ─────────────────────────────────────────────────────────── */
  .scroll-container {
    display: flex;
    flex-direction: column;
    width: fit-content;
    min-width: 100%;
    min-height: 100%;
  }

  /* ─── Spacers ─────────────────────────────────────────────────────────────────── */
  .spacer-top,
  .spacer-bottom {
    height: 24px;
    flex-shrink: 0;
    background: var(--paper-offwhite);
  }

  .spacer-left,
  .spacer-right {
    width: 24px;
    flex-shrink: 0;
    background: var(--paper-offwhite);
  }

  /* ─── Content row ────────────────────────────────────────────────────────────── */
  .content-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
  }

  /* ─── Ballot content ─────────────────────────────────────────────────────────── */
  .ballot-content {
    display: flex;
    gap: 16px;
    height: auto;
    align-items: flex-start;
    background: var(--paper-white);
  }
</style>
