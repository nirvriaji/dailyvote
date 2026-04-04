<script lang="ts">
  import type { BallotColumn as BallotColumnData } from '$lib/types';
  import BallotColumn from './BallotColumn.svelte';
  import PickerOverlay from './PickerOverlay.svelte';
  import { getActivePicker } from '$lib/stores/preferencePicker.svelte';

  interface Props {
    columns: BallotColumnData[];
    scroller?: HTMLDivElement | null;
    activeColumnId?: string | null;
    completedColumnIds?: string[];
    onColumnFocus?: (colId: string) => void;
  }
  let { columns, scroller = $bindable(), activeColumnId = null, completedColumnIds = [], onColumnFocus }: Props = $props();

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
  bind:this={scroller}
  class="stage-viewport"
  data-demo="scroll-container"
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
          {@const isActive = activeColumnId === column.id}
          {@const isCompleted = completedColumnIds.includes(column.id)}
          {@const isDimmed = activeColumnId !== null && !isActive}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="col-wrapper"
            class:col-active={isActive}
            class:col-completed={isCompleted}
            class:col-dimmed={isDimmed && !isCompleted}
            class:col-done={isCompleted && !isActive}
            data-col-id={column.id}
            onclick={() => onColumnFocus?.(column.id)}
          >
            <BallotColumn {column} width={BASE_COL_WIDTH} />
          </div>
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
    height: 6px;
    flex-shrink: 0;
    background: var(--paper-offwhite);
  }

  /* Desktop: more top space for comfortable viewing */
  @media (min-width: 769px) {
    .spacer-top {
      height: 32px;
    }
  }

  /* Mobile: extra top space to prevent headers being cut off by fixed header */
  @media (max-width: 768px) {
    .spacer-top {
      height: 60px;
    }
  }

  /* Mobile: bottom clearance so last ballot row isn't hidden behind the fixed panel */
  @media (max-width: 900px) {
    .spacer-bottom {
      height: var(--mobile-panel-h, 120px);
    }
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

  /* ─── Column focus states ─────────────────────────────────────────────────────── */
  .col-wrapper {
    position: relative;
    transition: opacity 0.35s ease, filter 0.35s ease;
    flex-shrink: 0;
  }

  .col-wrapper.col-dimmed {
    opacity: 0.38;
    filter: saturate(0.3) brightness(0.92);
  }

  .col-wrapper.col-done {
    opacity: 0.65;
    filter: saturate(0.7);
  }

  .col-wrapper.col-active {
    opacity: 1;
    filter: none;
  }

  .col-wrapper.col-active::after {
    content: '';
    position: absolute;
    inset: -3px;
    border: 2px solid rgba(200, 16, 46, 0.55);
    border-radius: 4px;
    pointer-events: none;
    z-index: 10;
    box-shadow: 0 0 0 4px rgba(200, 16, 46, 0.08);
  }
</style>
