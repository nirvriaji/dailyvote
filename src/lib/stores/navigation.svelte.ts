export const COLUMN_COUNT = 5;

export const COLUMN_TITLES: string[] = [
  'Presidente y Vicepresidentes',
  'Senadores Nacionales',
  'Senadores Regionales',
  'Diputados',
  'Parlamento Andino',
];

class NavigationStore {
  column = $state(0);
  dragOffsetX = $state(0);

  // Scroll vertical compartido entre todas las columnas (continuous, no zones)
  sharedScrollY = $state(0);

  // Hover state para resaltar filas entre columnas
  hoveredRowIndex = $state<number | null>(null);
  hoveredSection = $state<string | null>(null);

  get title(): string {
    return COLUMN_TITLES[this.column];
  }

  get columnType(): 'presidential' | 'legislative' {
    return this.column === 0 ? 'presidential' : 'legislative';
  }

  get canGoLeft(): boolean {
    return this.column > 0;
  }

  get canGoRight(): boolean {
    return this.column < COLUMN_COUNT - 1;
  }

  goTo(index: number) {
    if (index < 0 || index >= COLUMN_COUNT) return;
    this.column = index;
    this.dragOffsetX = 0;
  }

  next() {
    this.goTo(this.column + 1);
  }

  prev() {
    this.goTo(this.column - 1);
  }

  // Sincronizar scroll vertical entre todas las columnas (free scroll)
  syncScroll(y: number) {
    this.sharedScrollY = y;
  }

  // Set hover state for row highlighting
  setHoveredRow(index: number, section: string) {
    this.hoveredRowIndex = index;
    this.hoveredSection = section;
  }

  // Clear hover state
  clearHoveredRow() {
    this.hoveredRowIndex = null;
    this.hoveredSection = null;
  }
}

export const nav = new NavigationStore();
