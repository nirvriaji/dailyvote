<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { portal } from '$lib/actions/portal';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import { 
    closePicker, 
    setPreferenceNumber,
    getDisabledNumbers,
    getPreferenceValue,
    getActivePicker
  } from '$lib/stores/preferencePicker.svelte';
  
  interface Props {
    anchorEl: HTMLElement;
    columnKey: ColumnKey;
    rowId: string;
    slotIndex: number;
  }
  
  let { anchorEl, columnKey, rowId, slotIndex }: Props = $props();
  
  // Configuración según columna - usar $derived para reactividad
  let config = $derived({
    senadoNacional: { min: 1, max: 32, columns: 8, rows: 4 },
    senadoRegional: { min: 1, max: 32, columns: 8, rows: 4 },
    diputados: { min: 1, max: 32, columns: 8, rows: 4 },
    parlamentoAndino: { min: 1, max: 16, columns: 8, rows: 2 }
  }[columnKey]);
  
  // Generar array de números - recalcular cuando cambia config
  let numbers = $derived(Array.from({ length: config.max - config.min + 1 }, (_, i) => config.min + i));
  
  // Estado
  let pickerElement: HTMLDivElement;
  let position = $state<'below' | 'above'>('below');
  let left = $state(0);
  let top = $state(0);
  
  // Obtener valor actual y números deshabilitados
  let currentValue = $derived(getPreferenceValue(rowId, columnKey, slotIndex));
  let disabledNumbers = $derived(getDisabledNumbers(rowId, columnKey, slotIndex));
  
  // Calcular posición al montar
  onMount(() => {
    calculatePosition();
    tick().then(() => {
      pickerElement?.querySelector('button:not([disabled])')?.focus();
    });
  });
  
  function calculatePosition() {
    if (!anchorEl || !pickerElement) return;
    
    const anchorRect = anchorEl.getBoundingClientRect();
    const pickerHeight = config.rows === 4 ? 200 : 120; // Estimación
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    
    // Decidir posición
    if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
      position = 'above';
    } else {
      position = 'below';
    }
    
    // Calcular left (alineado al borde izquierdo de la casilla, sin salir del viewport)
    let calculatedLeft = anchorRect.left;
    const pickerWidth = 356;
    const viewportWidth = window.innerWidth;
    
    if (calculatedLeft + pickerWidth > viewportWidth - 12) {
      calculatedLeft = viewportWidth - pickerWidth - 12;
    }
    if (calculatedLeft < 12) {
      calculatedLeft = 12;
    }
    
    left = calculatedLeft;
    
    // Calcular top
    if (position === 'below') {
      top = anchorRect.bottom + 8;
    } else {
      top = anchorRect.top - pickerHeight - 8;
    }
  }
  
  // Manejar selección
  function handleSelect(value: number) {
    if (disabledNumbers.includes(value)) return;
    
    setPreferenceNumber(rowId, columnKey, slotIndex, value);
    closePicker();
  }
  
  // Click fuera
  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closePicker();
    }
  }
  
  // Manejar teclado
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closePicker();
      return;
    }
    
    const buttons = pickerElement?.querySelectorAll('button:not([disabled])');
    if (!buttons || buttons.length === 0) return;
    
    const currentIndex = Array.from(buttons).findIndex(btn => 
      parseInt(btn.getAttribute('data-value') || '0') === currentValue
    );
    
    let newIndex = currentIndex;
    const cols = config.columns;
    
    switch (event.key) {
      case 'ArrowRight':
        newIndex = Math.min(buttons.length - 1, currentIndex + 1);
        break;
      case 'ArrowLeft':
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
        newIndex = Math.min(buttons.length - 1, currentIndex + cols);
        break;
      case 'ArrowUp':
        newIndex = Math.max(0, currentIndex - cols);
        break;
      case 'Enter':
        if (currentIndex >= 0) {
          const btn = buttons[currentIndex] as HTMLButtonElement;
          if (!btn.disabled) {
            const value = parseInt(btn.getAttribute('data-value') || '0');
            handleSelect(value);
          }
        }
        return;
    }
    
    if (newIndex !== currentIndex && newIndex >= 0) {
      event.preventDefault();
      (buttons[newIndex] as HTMLButtonElement).focus();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="picker-backdrop" 
  onclick={handleBackdropClick}
  use:portal={'body'}
  transition:fade={{ duration: 150 }}
>
  <div
    class="picker-container"
    class:position-below={position === 'below'}
    class:position-above={position === 'above'}
    style="left: {left}px; top: {top}px;"
    bind:this={pickerElement}
    onkeydown={handleKeydown}
    tabindex="-1"
    transition:scale={{ duration: 150, start: 0.95 }}
  >
    <div 
      class="picker-grid"
      style="grid-template-columns: repeat({config.columns}, 1fr);"
      role="grid"
      aria-label={`Selector de números ${config.min} a ${config.max}`}
    >
      {#each numbers as number}
        {@const isSelected = currentValue === number}
        {@const isDisabled = disabledNumbers.includes(number)}
        <button
          class="picker-button"
          class:selected={isSelected}
          class:disabled={isDisabled}
          data-value={number}
          disabled={isDisabled}
          onclick={() => handleSelect(number)}
          role="gridcell"
          aria-selected={isSelected}
          aria-disabled={isDisabled}
          tabindex={isSelected ? 0 : -1}
        >
          {number.toString().padStart(2, '0')}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: transparent;
  }

  .picker-container {
    position: fixed;
    width: 356px;
    max-width: calc(100vw - 24px);
    background: white;
    border-radius: 16px;
    padding: 12px;
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.25),
      0 2px 8px rgba(0, 0, 0, 0.15);
    border: 2px solid #e9ecef;
  }

  .picker-grid {
    display: grid;
    gap: 8px;
  }

  .picker-button {
    width: 34px;
    height: 34px;
    min-width: 34px;
    min-height: 34px;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    background: white;
    font-size: 0.85rem;
    font-weight: 500;
    color: #495057;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    padding: 0;
    font-family: inherit;
  }

  @media (max-width: 400px) {
    .picker-button {
      width: 32px;
      height: 32px;
      min-width: 32px;
      min-height: 32px;
      font-size: 0.8rem;
    }
  }

  .picker-button:hover:not(.disabled) {
    border-color: #C8102E;
    background: rgba(200, 16, 46, 0.05);
    transform: translateY(-1px);
  }

  .picker-button:active:not(.disabled) {
    transform: translateY(0);
    background: rgba(200, 16, 46, 0.1);
  }

  .picker-button.selected {
    background: #C8102E;
    border-color: #C8102E;
    color: white;
    box-shadow: 0 2px 6px rgba(200, 16, 46, 0.4);
    font-weight: 600;
  }

  .picker-button.disabled {
    background: #f8f9fa;
    border-color: #e9ecef;
    color: #adb5bd;
    cursor: not-allowed;
    text-decoration: line-through;
    opacity: 0.6;
  }

  .picker-button:focus {
    outline: 2px solid rgba(200, 16, 46, 0.4);
    outline-offset: 2px;
  }
</style>