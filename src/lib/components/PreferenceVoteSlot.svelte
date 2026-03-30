<script lang="ts">
  import { 
    openPicker, 
    closePicker,
    isPickerActive,
    clearPreferenceNumber,
    getPreferenceValue,
    isRowSelected,
    replaceSelectedRow
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  
  interface Props {
    columnKey: ColumnKey;
    rowId: string;
    slotIndex: number;
  }
  
  let { columnKey, rowId, slotIndex }: Props = $props();
  
  let slotElement: HTMLButtonElement;
  
  // Verificar si esta fila está seleccionada
  let isThisRowSelected = $derived(isRowSelected(columnKey, rowId));
  
  // Obtener valor actual
  let value = $derived(getPreferenceValue(rowId, columnKey, slotIndex));
  
  // Verificar si picker está activo
  let isPickerOpen = $derived(isPickerActive(rowId, slotIndex));
  
  // Formatear valor
  let displayValue = $derived(
    value !== null ? value.toString().padStart(2, '0') : ''
  );
  
  // Manejar click
  function handleSlotClick() {
    if (!isThisRowSelected) {
      // Seleccionar fila y abrir picker
      replaceSelectedRow(columnKey, rowId);
      openPicker({
        columnKey,
        rowId,
        slotIndex,
        anchorEl: slotElement
      });
      return;
    }
    
    // Fila ya seleccionada
    if (value !== null) {
      // Limpiar valor
      clearPreferenceNumber(rowId, columnKey, slotIndex);
      if (isPickerOpen) closePicker();
    } else {
      // Toggle picker
      if (isPickerOpen) {
        closePicker();
      } else {
        openPicker({
          columnKey,
          rowId,
          slotIndex,
          anchorEl: slotElement
        });
      }
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSlotClick();
    }
  }
</script>

<button
  class="ballot-slot"
  class:filled={value !== null}
  class:active={isPickerOpen}
  class:row-selected={isThisRowSelected}
  bind:this={slotElement}
  onclick={handleSlotClick}
  onkeydown={handleKeydown}
  type="button"
  aria-label={value !== null ? `Número ${displayValue}` : "Seleccionar número"}
>
  {#if value !== null}
    <span class="slot-number">{displayValue}</span>
  {:else}
    <span class="slot-placeholder">N°</span>
  {/if}
</button>

<style>
  .ballot-slot {
    /* Match image-frame size: 48px to fit within 56px grid cell with 4px padding */
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
    
    /* Mismo borde que los símbolos */
    border: 1.5px solid var(--grid-border);
    
    /* Sin border-radius */
    border-radius: 0;
    
    /* Sin margen */
    margin: 0;
    
    /* Fondo blanco igual que símbolo */
    background: #ffffff !important;
    
    /* Layout */
    display: flex;
    align-items: center;
    justify-content: center;
    
    /* Cursor */
    cursor: pointer;
    
    /* Reset */
    padding: 0;
    font-family: inherit;
    box-sizing: border-box;
    
    /* Sin transiciones agresivas */
    transition: none;
  }

  /* Estado: fila seleccionada - sin cambio visible */
  .ballot-slot.row-selected {
    /* Sin cambio - solo el símbolo indica selección */
  }

  /* Estado: picker activo - solo ligero cambio de fondo */
  .ballot-slot.active {
    background: #f5f5f5;
  }

  /* Estado: con valor - sin cambio visual */
  .ballot-slot.filled {
    background: #ffffff;
  }

  /* Hover sutil */
  .ballot-slot:hover {
    background: #f5f5f5;
  }

  /* Número centrado */
  .slot-number {
    font-size: 1rem;
    font-weight: 600;
    color: #000000;
    font-family: monospace;
  }

  /* Placeholder */
  .slot-placeholder {
    font-size: 0.8rem;
    color: #666666;
    font-weight: 400;
  }
</style>