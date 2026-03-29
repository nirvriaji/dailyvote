<script lang="ts">
  import { 
    openPicker, 
    closePicker,
    isPickerActive,
    clearPreferenceNumber,
    getPreferenceValue,
    isRowSelected,
    replaceSelectedRow,
    getSelectedRow
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  
  interface Props {
    columnKey: ColumnKey;
    rowId: string;
    slotIndex: number;
  }
  
  let { columnKey, rowId, slotIndex }: Props = $props();
  
  let slotElement: HTMLButtonElement;
  
  // Verificar si esta fila está seleccionada en esta columna
  let isThisRowSelected = $derived(isRowSelected(columnKey, rowId));
  
  // Verificar si hay otra fila seleccionada en esta columna
  let selectedRowId = $derived(getSelectedRow(columnKey));
  let hasOtherRowSelected = $derived(selectedRowId !== null && selectedRowId !== rowId);
  
  // Obtener valor actual de esta casilla
  let value = $derived(getPreferenceValue(rowId, columnKey, slotIndex));
  
  // Verificar si picker está activo para esta casilla
  let isPickerOpen = $derived(isPickerActive(rowId, slotIndex));
  
  // Formatear valor para mostrar
  let displayValue = $derived(
    value !== null ? value.toString().padStart(2, '0') : ''
  );
  
  // Manejar click en casilla
  function handleSlotClick() {
    // Si esta fila NO está seleccionada
    if (!isThisRowSelected) {
      // Seleccionar esta fila (reemplaza cualquier otra)
      replaceSelectedRow(columnKey, rowId);
      // Abrir picker
      openPicker({
        columnKey,
        rowId,
        slotIndex,
        anchorEl: slotElement
      });
      return;
    }
    
    // Si esta fila SÍ está seleccionada
    if (value !== null) {
      // Casilla tiene valor: limpiarla
      clearPreferenceNumber(rowId, columnKey, slotIndex);
      // Cerrar picker si estaba abierto
      if (isPickerOpen) {
        closePicker();
      }
    } else {
      // Casilla vacía: abrir picker (toggle)
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
  
  // Manejar teclado
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSlotClick();
    }
  }
</script>

<button
  class="preference-slot"
  class:filled={value !== null}
  class:active={isPickerOpen}
  class:row-selected={isThisRowSelected}
  bind:this={slotElement}
  onclick={handleSlotClick}
  onkeydown={handleKeydown}
  type="button"
  aria-label={value !== null ? `Número ${displayValue}, click para limpiar` : "Seleccionar número de voto preferencial"}
  aria-expanded={isPickerOpen}
  aria-haspopup="grid"
>
  {#if value !== null}
    <span class="slot-value">{displayValue}</span>
  {:else}
    <span class="slot-placeholder">N°</span>
  {/if}
</button>

<style>
  .preference-slot {
    width: 56px;
    height: 52px;
    min-width: 56px;
    min-height: 52px;
    border: 2px solid #dee2e6;
    border-radius: 12px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    font-family: inherit;
    /* Mantener mismo tamaño en todos los estados */
    box-sizing: border-box;
  }

  .preference-slot:hover {
    border-color: #C8102E;
  }

  .preference-slot.row-selected {
    border-color: #C8102E;
    background: rgba(200, 16, 46, 0.05);
  }

  .preference-slot.active {
    border-color: #C8102E;
    background: rgba(200, 16, 46, 0.1);
    box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.2);
  }

  .preference-slot.filled {
    background: #C8102E;
    border-color: #C8102E;
    color: white;
  }

  .preference-slot.filled:hover {
    background: #a00d25;
    border-color: #a00d25;
  }

  .preference-slot.filled.row-selected {
    background: #C8102E;
    box-shadow: 0 0 0 2px rgba(200, 16, 46, 0.3);
  }

  .slot-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: inherit;
  }

  .slot-placeholder {
    font-size: 0.9rem;
    color: #adb5bd;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .preference-slot {
      width: 52px;
      height: 48px;
      min-width: 52px;
      min-height: 48px;
    }
  }
</style>