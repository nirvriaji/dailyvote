// Estado global para manejar el picker de voto preferencial
// Solo permite 1 picker abierto a la vez en toda la aplicación

export type ColumnKey = 'senadoNacional' | 'senadoRegional' | 'diputados' | 'parlamentoAndino';

// Estado del picker activo (solo 1 en toda la app)
export type ActivePicker = {
  columnKey: ColumnKey;
  rowId: string;
  slotIndex: number;
  anchorEl: HTMLElement;
} | null;

// Estado de los valores seleccionados por fila
export type RowPreferences = {
  senadoNacional?: [number | null, number | null];
  senadoRegional?: [number | null];
  diputados?: [number | null, number | null];
  parlamentoAndino?: [number | null, number | null];
};

// Fila seleccionada por cada columna (solo 1 por columna)
export type ColumnSelectionState = {
  senadoNacional: string | null;
  senadoRegional: string | null;
  diputados: string | null;
  parlamentoAndino: string | null;
};

// Estado global reactivo
let activePicker = $state<ActivePicker>(null);

// Estado de selección de fila por columna
let selectedRowByColumn = $state<ColumnSelectionState>({
  senadoNacional: null,
  senadoRegional: null,
  diputados: null,
  parlamentoAndino: null
});

// Estado de los valores de preferencia por fila
let preferenceState = $state<Record<string, RowPreferences>>({});

// Obtener fila seleccionada por columna
export function getSelectedRow(columnKey: ColumnKey): string | null {
  return selectedRowByColumn[columnKey];
}

// Verificar si una fila está seleccionada en una columna
export function isRowSelected(columnKey: ColumnKey, rowId: string): boolean {
  return selectedRowByColumn[columnKey] === rowId;
}

// Seleccionar fila (reemplaza cualquier selección previa en esa columna)
export function selectRow(columnKey: ColumnKey, rowId: string) {
  updateSelectedRowByColumn({
    ...selectedRowByColumn,
    [columnKey]: rowId
  });
}

// Deseleccionar fila
export function deselectRow(columnKey: ColumnKey) {
  updateSelectedRowByColumn({
    ...selectedRowByColumn,
    [columnKey]: null
  });
}

// Limpiar preferencias de una fila específica en una columna
export function clearRowPreferences(rowId: string, columnKey: ColumnKey) {
  const rowPrefs = preferenceState[rowId];
  if (!rowPrefs) return;
  
  preferenceState = {
    ...preferenceState,
    [rowId]: {
      ...rowPrefs,
      [columnKey]: undefined
    }
  };
  
  // Persistir
  if (typeof window !== 'undefined') {
    localStorage.setItem('dailyvote_preferences', JSON.stringify(preferenceState));
  }
}

// Reemplazar fila seleccionada (limpia preferencias de la fila anterior)
export function replaceSelectedRow(columnKey: ColumnKey, newRowId: string) {
  const prevRowId = selectedRowByColumn[columnKey];
  
  // Si había una fila previa diferente, limpiar sus preferencias
  if (prevRowId && prevRowId !== newRowId) {
    clearRowPreferences(prevRowId, columnKey);
  }
  
  // Seleccionar nueva fila
  selectRow(columnKey, newRowId);
}

// Toggle selección de símbolo
export function toggleSymbolSelection(columnKey: ColumnKey, rowId: string) {
  const isSelected = selectedRowByColumn[columnKey] === rowId;
  
  if (isSelected) {
    // Deseleccionar: limpiar preferencias y cerrar picker
    clearRowPreferences(rowId, columnKey);
    deselectRow(columnKey);
    
    // Cerrar picker si estaba abierto para esta fila
    if (activePicker?.columnKey === columnKey && activePicker?.rowId === rowId) {
      closePicker();
    }
  } else {
    // Seleccionar nueva fila
    replaceSelectedRow(columnKey, rowId);
    closePicker();
  }
}

// Abrir picker
export function openPicker(params: {
  columnKey: ColumnKey;
  rowId: string;
  slotIndex: number;
  anchorEl: HTMLElement;
}) {
  activePicker = params;
}

// Cerrar picker
export function closePicker() {
  activePicker = null;
}

// Obtener picker activo
export function getActivePicker(): ActivePicker {
  return activePicker;
}

// Verificar si un picker específico está activo
export function isPickerActive(rowId: string, slotIndex: number): boolean {
  return activePicker?.rowId === rowId && activePicker?.slotIndex === slotIndex;
}

// Establecer número de preferencia
export function setPreferenceNumber(
  rowId: string,
  columnKey: ColumnKey,
  slotIndex: number,
  value: number | null
) {
  const rowPrefs = preferenceState[rowId] || {};
  const currentValues = rowPrefs[columnKey] || [];
  const newValues = [...currentValues] as typeof currentValues;
  newValues[slotIndex] = value;
  
  preferenceState = {
    ...preferenceState,
    [rowId]: {
      ...rowPrefs,
      [columnKey]: newValues
    }
  };
  
  // Persistir en localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('dailyvote_preferences', JSON.stringify(preferenceState));
  }
}

// Obtener valor actual
export function getPreferenceValue(
  rowId: string, 
  columnKey: ColumnKey, 
  slotIndex: number
): number | null {
  const values = preferenceState[rowId]?.[columnKey];
  return values?.[slotIndex] ?? null;
}

// Obtener números deshabilitados (usados por otra casilla en la misma fila/columna)
export function getDisabledNumbers(
  rowId: string,
  columnKey: ColumnKey,
  currentSlotIndex: number
): number[] {
  const values = preferenceState[rowId]?.[columnKey];
  if (!values) return [];
  
  const disabled: number[] = [];
  values.forEach((value, index) => {
    if (index !== currentSlotIndex && value !== null) {
      disabled.push(value);
    }
  });
  
  return disabled;
}

// Limpiar número de preferencia
export function clearPreferenceNumber(rowId: string, columnKey: ColumnKey, slotIndex: number) {
  setPreferenceNumber(rowId, columnKey, slotIndex, null);
}

// Cargar desde localStorage al iniciar
export function loadPreferencesFromStorage() {
  if (typeof window !== 'undefined') {
    const savedPrefs = localStorage.getItem('dailyvote_preferences');
    const savedRows = localStorage.getItem('dailyvote_selected_rows');
    
    if (savedPrefs) {
      try {
        preferenceState = JSON.parse(savedPrefs);
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
    
    if (savedRows) {
      try {
        selectedRowByColumn = JSON.parse(savedRows);
      } catch (e) {
        console.error('Error loading selected rows:', e);
      }
    }
  }
}

// Persistir selección de filas
function persistSelectedRows() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dailyvote_selected_rows', JSON.stringify(selectedRowByColumn));
  }
}

// Helper para actualizar selectedRowByColumn y persistir
function updateSelectedRowByColumn(newState: ColumnSelectionState) {
  selectedRowByColumn = newState;
  persistSelectedRows();
}

// Manejo global de tecla Escape para cerrar picker
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && activePicker !== null) {
      closePicker();
    }
  });
}