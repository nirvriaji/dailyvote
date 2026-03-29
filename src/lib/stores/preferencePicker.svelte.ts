// Estado global para manejar el picker de voto preferencial
// Solo permite 1 picker abierto a la vez en toda la aplicación

import type { VoteSelection, VoteZoneType } from '$lib/types';
import { vote } from './vote.svelte';

export type ColumnKey = 'presidente' | 'senadoNacional' | 'senadoRegional' | 'diputados' | 'parlamentoAndino';

// Mapeo de columnKey a columnId
const columnKeyToId: Record<ColumnKey, string> = {
  presidente: 'col0',
  senadoNacional: 'col1',
  senadoRegional: 'col2',
  diputados: 'col3',
  parlamentoAndino: 'col4'
};

// Estado del picker activo (solo 1 en toda la app)
export type ActivePicker = {
  columnKey: ColumnKey;
  rowId: string;
  slotIndex: number;
  anchorEl: HTMLElement;
} | null;

// Estado de los valores seleccionados por fila
export type RowPreferences = {
  presidente?: never; // Presidente no tiene voto preferencial
  senadoNacional?: [number | null, number | null];
  senadoRegional?: [number | null];
  diputados?: [number | null, number | null];
  parlamentoAndino?: [number | null, number | null];
};

// Fila seleccionada por cada columna (solo 1 por columna)
export type ColumnSelectionState = {
  presidente: string | null;
  senadoNacional: string | null;
  senadoRegional: string | null;
  diputados: string | null;
  parlamentoAndino: string | null;
};

// Estado global reactivo
let activePicker = $state<ActivePicker>(null);

// Estado de selección de fila por columna
let selectedRowByColumn = $state<ColumnSelectionState>({
  presidente: null,
  senadoNacional: null,
  senadoRegional: null,
  diputados: null,
  parlamentoAndino: null
});

// Estado de los valores de preferencia por fila
let preferenceState = $state<Record<string, RowPreferences>>({});

// Funciones derivadas para progreso de votación
export function isColumnValid(columnKey: ColumnKey): boolean {
  return selectedRowByColumn[columnKey] !== null;
}

export function getValidColumnCount(): number {
  let count = 0;
  (Object.keys(selectedRowByColumn) as ColumnKey[]).forEach(key => {
    if (selectedRowByColumn[key] !== null) count++;
  });
  return count;
}

export function getRemainingColumnCount(): number {
  return 5 - getValidColumnCount();
}

export function isBallotReady(): boolean {
  return getValidColumnCount() === 5;
}

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

// Función para guardar voto en el store (llamada desde BallotRow)
export async function castVoteFromSelection(
  columnKey: ColumnKey,
  rowId: string,
  rowData: {
    partyName: string;
    partyNumber: number;
    partyColor: string;
  },
  zoneType: VoteZoneType,
  zoneLabel: string,
  preferenceNumbers?: (number | null)[]
) {
  const columnId = columnKeyToId[columnKey];
  
  const voteSelection: VoteSelection = {
    columnId,
    rowId,
    partyName: rowData.partyName,
    partyNumber: rowData.partyNumber,
    partyColor: rowData.partyColor,
    zoneId: zoneType,
    zoneType,
    zoneLabel,
    preferenceNumbers
  };
  
  await vote.cast(voteSelection);
}

// Función para remover voto (cuando se deselecciona)
export function removeVote(columnKey: ColumnKey) {
  const columnId = columnKeyToId[columnKey];
  vote.remove(columnId);
}

// Estado de selección independiente para presidente (símbolo y foto por separado)
type PresidentSelection = {
  symbolSelected: boolean;
  photoSelected: boolean;
};

// Fila presidencial actualmente seleccionada (solo 1 a la vez, como en columnas legislativas)
let presidentSelectedRowId = $state<string | null>(null);

// Estado de selección presidencial por fila (almacena qué elementos están marcados)
let presidentSelections = $state<Record<string, PresidentSelection>>({});

// Obtener la fila presidencial seleccionada
export function getPresidentSelectedRow(): string | null {
  return presidentSelectedRowId;
}

// Verificar si una fila presidencial específica está seleccionada
export function isPresidentRowSelected(rowId: string): boolean {
  return presidentSelectedRowId === rowId;
}

// Verificar si hay alguna fila presidencial seleccionada (diferente a la dada)
export function hasOtherPresidentRowSelected(rowId: string): boolean {
  return presidentSelectedRowId !== null && presidentSelectedRowId !== rowId;
}

// Limpiar todas las selecciones de una fila presidencial específica
function clearPresidentRow(rowId: string) {
  if (presidentSelections[rowId]) {
    presidentSelections = {
      ...presidentSelections,
      [rowId]: { symbolSelected: false, photoSelected: false }
    };
    persistPresidentSelections();
  }
}

// Establecer nueva fila presidencial (limpia la anterior si existe)
function setPresidentRow(rowId: string) {
  // Si hay una fila previa diferente, limpiarla completamente
  if (presidentSelectedRowId && presidentSelectedRowId !== rowId) {
    clearPresidentRow(presidentSelectedRowId);
  }
  
  // Establecer la nueva fila seleccionada
  presidentSelectedRowId = rowId;
  persistPresidentRow();
}

// Toggle selección de símbolo del presidente
export function togglePresidentSymbol(rowId: string) {
  const currentRow = presidentSelectedRowId;
  const isSameRow = currentRow === rowId;
  
  // Si es una fila diferente, cambiar a esa fila y marcar el símbolo
  if (!isSameRow) {
    setPresidentRow(rowId);
    // Inicializar o mantener estado de foto si existía
    const existing = presidentSelections[rowId] || { symbolSelected: false, photoSelected: false };
    presidentSelections = {
      ...presidentSelections,
      [rowId]: {
        ...existing,
        symbolSelected: true
      }
    };
  } else {
    // Misma fila: toggle del símbolo
    const current = presidentSelections[rowId] || { symbolSelected: false, photoSelected: false };
    const newSymbolSelected = !current.symbolSelected;
    const newPhotoSelected = current.photoSelected;
    
    // Si ambos quedan desmarcados, deseleccionar la fila completamente
    if (!newSymbolSelected && !newPhotoSelected) {
      presidentSelectedRowId = null;
    }
    
    presidentSelections = {
      ...presidentSelections,
      [rowId]: {
        symbolSelected: newSymbolSelected,
        photoSelected: newPhotoSelected
      }
    };
  }
  
  persistPresidentSelections();
  persistPresidentRow();
}

// Toggle selección de foto del presidente
export function togglePresidentPhoto(rowId: string) {
  const currentRow = presidentSelectedRowId;
  const isSameRow = currentRow === rowId;
  
  // Si es una fila diferente, cambiar a esa fila y marcar la foto
  if (!isSameRow) {
    setPresidentRow(rowId);
    // Inicializar o mantener estado de símbolo si existía
    const existing = presidentSelections[rowId] || { symbolSelected: false, photoSelected: false };
    presidentSelections = {
      ...presidentSelections,
      [rowId]: {
        ...existing,
        photoSelected: true
      }
    };
  } else {
    // Misma fila: toggle de la foto
    const current = presidentSelections[rowId] || { symbolSelected: false, photoSelected: false };
    const newSymbolSelected = current.symbolSelected;
    const newPhotoSelected = !current.photoSelected;
    
    // Si ambos quedan desmarcados, deseleccionar la fila completamente
    if (!newSymbolSelected && !newPhotoSelected) {
      presidentSelectedRowId = null;
    }
    
    presidentSelections = {
      ...presidentSelections,
      [rowId]: {
        symbolSelected: newSymbolSelected,
        photoSelected: newPhotoSelected
      }
    };
  }
  
  persistPresidentSelections();
  persistPresidentRow();
}

// Verificar si el símbolo del presidente está seleccionado
export function isPresidentSymbolSelected(rowId: string): boolean {
  return presidentSelectedRowId === rowId && (presidentSelections[rowId]?.symbolSelected || false);
}

// Verificar si la foto del presidente está seleccionada
export function isPresidentPhotoSelected(rowId: string): boolean {
  return presidentSelectedRowId === rowId && (presidentSelections[rowId]?.photoSelected || false);
}

// Verificar si la fila presidencial está activa (es la fila seleccionada y tiene algo marcado)
export function isPresidentRowActive(rowId: string): boolean {
  return presidentSelectedRowId === rowId && (
    presidentSelections[rowId]?.symbolSelected || 
    presidentSelections[rowId]?.photoSelected || 
    false
  );
}

// Persistir selección de fila presidencial
function persistPresidentRow() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dailyvote_president_row', JSON.stringify(presidentSelectedRowId));
  }
}

// Persistir selecciones presidenciales
function persistPresidentSelections() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dailyvote_president_selections', JSON.stringify(presidentSelections));
  }
}

// Cargar selecciones presidenciales desde localStorage
function loadPresidentSelections() {
  if (typeof window !== 'undefined') {
    const savedSelections = localStorage.getItem('dailyvote_president_selections');
    const savedRow = localStorage.getItem('dailyvote_president_row');
    
    if (savedSelections) {
      try {
        presidentSelections = JSON.parse(savedSelections);
      } catch (e) {
        console.error('Error loading president selections:', e);
      }
    }
    
    if (savedRow) {
      try {
        presidentSelectedRowId = JSON.parse(savedRow);
      } catch (e) {
        console.error('Error loading president row:', e);
      }
    }
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
    
    // Cargar selecciones presidenciales
    loadPresidentSelections();
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