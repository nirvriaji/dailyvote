// ─── Ballot structure ─────────────────────────────────────────────────────────

export type ColumnSection =
  | 'presidente'
  | 'senadores-nacional'
  | 'senadores-regional'
  | 'diputados'
  | 'parlamento-andino';

export type ZoneId = 'top' | 'middle' | 'bottom';

/** The kind of area on a ballot row where a voter can place a mark */
export type VoteZoneType = 'symbol' | 'photo' | 'number' | 'list';

export interface VoteZone {
  id: string;
  type: VoteZoneType;
  label: string;
  description: string;
}

export interface Candidate {
  id: string;
  name: string;
  position: string;
  initials: string;
  avatarColor: string;
}

export interface BallotRow {
  id: string;
  partyNumber: number;
  partyName: string;
  partyAbbr: string;
  partyColor: string;
  partySymbolUrl?: string;
  candidates: Candidate[];
  voteZones: VoteZone[];
  zone: ZoneId;
  isPresidential: boolean;
  presidentialPhoto?: string;
  // Casillas de votación para columnas legislativas (1-3 casillas según el cargo)
  voteBoxes?: number;
  // Índice de fila para aplicar fondos alternados (zebra striping)
  rowIndex: number;
}

export interface BallotColumn {
  id: string;
  index: number;
  section: ColumnSection;
  title: string;
  subtitle?: string;
  rows: BallotRow[];
}

// ─── Vote state ───────────────────────────────────────────────────────────────

export interface VoteSelection {
  columnId: string;
  rowId: string;
  partyName: string;
  partyNumber: number;
  partyColor: string;
  zoneId: string;
  zoneType: VoteZoneType;
  zoneLabel: string;
  // Números de voto preferencial (para columnas legislativas)
  preferenceNumbers?: (number | null)[]; // Ej: [12, 18] o [32] o null
}

// ─── Vote Preference Configuration ───────────────────────────────────────────

export interface PreferenceVoteConfig {
  columnId: string;
  slots: number; // 1 o 2 casillas
  min: number;
  max: number;
  uniqueWithinColumn: boolean;
  label: string;
}

// ─── Gesture ──────────────────────────────────────────────────────────────────

export type GestureIntent = 'horizontal' | 'vertical' | null;

export interface GestureCallbacks {
  onStart?: () => void;
  onMove?: (dx: number, dy: number, intent: GestureIntent) => void;
  onEnd?: (intent: GestureIntent, vx: number, vy: number) => void;
}
