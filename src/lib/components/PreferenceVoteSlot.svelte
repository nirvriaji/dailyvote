<script lang="ts">
  import { 
    openPicker, 
    closePicker,
    isPickerActive,
    clearPreferenceNumber,
    getPreferenceValue
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  
  interface Props {
    columnKey: ColumnKey;
    rowId: string;
    slotIndex: number;
  }
  
  let { columnKey, rowId, slotIndex }: Props = $props();
  
  let slotElement: HTMLButtonElement;
  
  // Obtener valor actual
  let value = $derived(getPreferenceValue(rowId, columnKey, slotIndex));
  
  // Verificar si este picker está activo
  let isPickerOpen = $derived(isPickerActive(rowId, slotIndex));
  
  // Formatear valor para mostrar
  let displayValue = $derived(
    value !== null ? value.toString().padStart(2, '0') : ''
  );
  
  // Manejar click en casilla
  function handleSlotClick() {
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
  
  // Manejar teclado
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSlotClick();
    }
  }
  
  // Limpiar valor
  function handleClear(event: MouseEvent) {
    event.stopPropagation();
    clearPreferenceNumber(rowId, columnKey, slotIndex);
  }
</script>

<div class="preference-slot-wrapper">
  <button
    class="preference-slot"
    class:filled={value !== null}
    class:active={isPickerOpen}
    bind:this={slotElement}
    onclick={handleSlotClick}
    onkeydown={handleKeydown}
    type="button"
    aria-label="Seleccionar número de voto preferencial"
    aria-expanded={isPickerOpen}
    aria-haspopup="grid"
  >
    {#if value !== null}
      <span class="slot-value">{displayValue}</span>
    {:else}
      <span class="slot-placeholder">N°</span>
    {/if}
  </button>
  
  {#if value !== null}
    <button
      class="clear-button"
      onclick={handleClear}
      type="button"
      aria-label="Limpiar número"
      title="Limpiar"
    >
      ×
    </button>
  {/if}
</div>

<style>
  .preference-slot-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .preference-slot {
    width: 56px;
    height: 44px;
    min-width: 56px;
    min-height: 44px;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
    font-family: inherit;
  }

  .preference-slot:hover {
    border-color: #C8102E;
    box-shadow: 0 0 0 3px rgba(200, 16, 46, 0.1);
  }

  .preference-slot.active {
    border-color: #C8102E;
    background: rgba(200, 16, 46, 0.05);
    box-shadow: 0 0 0 4px rgba(200, 16, 46, 0.2);
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

  .clear-button {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: none;
    background: #f8f9fa;
    color: #6c757d;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: 2px;
    transition: all 0.2s;
  }

  .clear-button:hover {
    background: #dc3545;
    color: white;
  }

  @media (max-width: 768px) {
    .preference-slot {
      width: 52px;
      height: 44px;
      min-width: 52px;
    }
  }
</style>