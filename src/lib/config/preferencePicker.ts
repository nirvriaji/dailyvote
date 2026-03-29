// Configuración de rangos para picker de voto preferencial
// Rangos exactos según especificación

export type ColumnKey = 'senadoNacional' | 'senadoRegional' | 'diputados' | 'parlamentoAndino';

export interface PreferencePickerConfig {
  columnKey: ColumnKey;
  columnId: string;
  slots: number;
  min: number;
  max: number;
  columns: number;
  rows: number;
}

export const preferencePickerConfig: Record<ColumnKey, PreferencePickerConfig> = {
  senadoNacional: {
    columnKey: 'senadoNacional',
    columnId: 'col1',
    slots: 2,
    min: 1,
    max: 32,
    columns: 8,
    rows: 4
  },
  senadoRegional: {
    columnKey: 'senadoRegional',
    columnId: 'col2',
    slots: 1,
    min: 1,
    max: 32,
    columns: 8,
    rows: 4
  },
  diputados: {
    columnKey: 'diputados',
    columnId: 'col3',
    slots: 2,
    min: 1,
    max: 32,
    columns: 8,
    rows: 4
  },
  parlamentoAndino: {
    columnKey: 'parlamentoAndino',
    columnId: 'col4',
    slots: 2,
    min: 1,
    max: 16,
    columns: 8,
    rows: 2
  }
};

// Helper para obtener config por columnId
export function getPreferenceConfigByColumnId(columnId: string): PreferencePickerConfig | null {
  const configs = Object.values(preferencePickerConfig);
  return configs.find(config => config.columnId === columnId) || null;
}

// Generar array de números para la grilla
export function generateNumberRange(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}