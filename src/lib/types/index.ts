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
}

// ─── Gesture ──────────────────────────────────────────────────────────────────

export type GestureIntent = 'horizontal' | 'vertical' | null;

export interface GestureCallbacks {
  onStart?: () => void;
  onMove?: (dx: number, dy: number, intent: GestureIntent) => void;
  onEnd?: (intent: GestureIntent, vx: number, vy: number) => void;
}
