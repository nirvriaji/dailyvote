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

// Estado global reactivo
let activePicker = $state<ActivePicker>(null);

// Estado de los valores seleccionados por fila
export type RowPreferences = {
  senadoNacional?: [number | null, number | null];
  senadoRegional?: [number | null];
  diputados?: [number | null, number | null];
  parlamentoAndino?: [number | null, number | null];
};

let preferenceState = $state<Record<string, RowPreferences>>({});

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
    const saved = localStorage.getItem('dailyvote_preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        preferenceState = parsed;
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
  }
}

// Manejo global de tecla Escape para cerrar picker
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && activePicker !== null) {
      closePicker();
    }
  });
}