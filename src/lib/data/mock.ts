import type { BallotColumn, BallotRow, VoteZone, Candidate, ZoneId } from '$lib/types';

// ─── Vote zones by column type ────────────────────────────────────────────────

const PRESIDENTIAL_ZONES: VoteZone[] = [
  { id: 'symbol', type: 'symbol', label: 'Símbolo del partido', description: 'Marca el símbolo o logo del partido' },
  { id: 'photo', type: 'photo', label: 'Fotografía del candidato/a', description: 'Marca la foto del candidato/a presidencial' },
];

const LEGISLATIVE_ZONES: VoteZone[] = [
  { id: 'symbol', type: 'symbol', label: 'Símbolo del partido', description: 'Marca el símbolo o logo del partido' },
  { id: 'number', type: 'number', label: 'Número del candidato', description: 'Escribe el número del candidato de tu preferencia (diferente al número del partido)' },
];

// ─── Parties (Perú 2026 - placeholder) ─────────────────────────────────────────

interface Party { number: number; name: string; abbr: string; color: string }

const PARTIES: Party[] = [
  { number: 1,  name: 'Perú Libre',               abbr: 'PL',  color: '#C62828' },
  { number: 2,  name: 'Acción Popular',            abbr: 'AP',  color: '#D84315' },
  { number: 3,  name: 'Podemos Perú',              abbr: 'PP',  color: '#1565C0' },
  { number: 4,  name: 'Alianza para el Progreso',  abbr: 'APP', color: '#E65100' },
  { number: 5,  name: 'Fuerza Popular',            abbr: 'FP',  color: '#F57F17' },
  { number: 6,  name: 'Renovación Popular',        abbr: 'RP',  color: '#2E7D32' },
  { number: 7,  name: 'Juntos por el Perú',        abbr: 'JP',  color: '#558B2F' },
  { number: 8,  name: 'Partido Morado',            abbr: 'PM',  color: '#6A1B9A' },
  { number: 9,  name: 'Avanza País',               abbr: 'AVP', color: '#0277BD' },
  { number: 10, name: 'Somos Perú',                abbr: 'SP',  color: '#00695C' },
  { number: 11, name: 'Frente Amplio',             abbr: 'FA',  color: '#AD1457' },
  { number: 12, name: 'Solidaridad Nacional',      abbr: 'SN',  color: '#5D4037' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#5C6BC0', '#26A69A', '#8D6E63', '#EC407A', '#78909C',
  '#EF5350', '#7E57C2', '#66BB6A', '#42A5F5', '#FFA726',
  '#AB47BC', '#26C6DA', '#D4E157', '#FF7043', '#8BC34A',
];

function initials(name: string): string {
  return name.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('');
}

function avatarColor(seed: number): string {
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

function zoneFor(index: number, total: number): ZoneId {
  const third = Math.ceil(total / 3);
  if (index < third) return 'top';
  if (index < third * 2) return 'middle';
  return 'bottom';
}

// ─── Presidential candidates ───────────────────────────────────────────────────

const PRES_NAMES: Array<[string, string, string]> = [
  ['Carlos Quispe Mamani',  'Ana Torres Vega',      'Roberto Díaz Salas'],
  ['María Elena Romero',    'Juan Carlos Flores',   'Patricia Mendoza'],
  ['José Luis Vargas',      'Carmen Salinas',       'Pedro Huamán Ríos'],
  ['César Ramírez Silva',   'Lucía Ortega Ruiz',    'Marco Antonio Soto'],
  ['Elena de la Fuente',    'Diego Castro Lima',    'Sofía Paredes Vidal'],
  ['Rafael Gutiérrez Paz',  'Isabel Morales',       'Luis Quispe Ccoa'],
  ['Andrés Fernández',      'Gabriela Núñez Cruz',  'Fernando Paz Llanos'],
  ['Verónica Castillo',     'Héctor Lozano',        'Natalia Cruz Pinto'],
  ['Guillermo Torres',      'Rosa Delgado Vásquez', 'Álvaro Méndez'],
  ['Claudia Rivera',        'Manuel Santos Vera',   'Yolanda Vega'],
  ['Pedro Alvarado Ríos',   'Carmen López Vargas',  'Jorge Enriquez'],
  ['Sofía Martínez Cruz',   'Ricardo Flores',       'María Elena Pachacuti'],
];

function makePresidentialRow(partyIdx: number): BallotRow {
  const p = PARTIES[partyIdx];
  const [pres, v1, v2] = PRES_NAMES[partyIdx];
  const candidates: Candidate[] = [
    { id: `c0-${partyIdx}-0`, name: pres, position: 'Presidente/a', initials: initials(pres), avatarColor: avatarColor(partyIdx * 3) },
    { id: `c0-${partyIdx}-1`, name: v1,   position: '1.° Vicepresidente/a', initials: initials(v1), avatarColor: avatarColor(partyIdx * 3 + 1) },
    { id: `c0-${partyIdx}-2`, name: v2,   position: '2.° Vicepresidente/a', initials: initials(v2), avatarColor: avatarColor(partyIdx * 3 + 2) },
  ];
  return {
    id: `col0-row${partyIdx}`,
    partyNumber: p.number,
    partyName: p.name,
    partyAbbr: p.abbr,
    partyColor: p.color,
    candidates,
    voteZones: PRESIDENTIAL_ZONES,
    zone: zoneFor(partyIdx, PARTIES.length),
    isPresidential: true,
    rowIndex: partyIdx,
  };
}

// ─── Legislative rows ─────────────────────────────────────────────────────────

function makeLegislativeRow(colId: string, partyIdx: number): BallotRow {
  const p = PARTIES[partyIdx];
  return {
    id: `${colId}-row${partyIdx}`,
    partyNumber: p.number,
    partyName: p.name,
    partyAbbr: p.abbr,
    partyColor: p.color,
    candidates: [],
    voteZones: LEGISLATIVE_ZONES,
    zone: zoneFor(partyIdx, PARTIES.length),
    isPresidential: false,
    rowIndex: partyIdx,
  };
}

// ─── Ballot columns (estructura real de cédula) ─────────────────────────────────

export const BALLOT_COLUMNS: BallotColumn[] = [
  {
    id: 'col0', index: 0, section: 'presidente',
    title: 'Presidente y Vicepresidentes',
    rows: PARTIES.map((_, i) => makePresidentialRow(i)),
  },
  {
    id: 'col1', index: 1, section: 'senadores-nacional',
    title: 'Senadores a Nivel Nacional',
    subtitle: 'Lista Nacional',
    rows: PARTIES.map((_, i) => makeLegislativeRow('col1', i)),
  },
  {
    id: 'col2', index: 2, section: 'senadores-regional',
    title: 'Senadores a Nivel Regional',
    subtitle: 'Lima Metropolitana',
    rows: PARTIES.map((_, i) => makeLegislativeRow('col2', i)),
  },
  {
    id: 'col3', index: 3, section: 'diputados',
    title: 'Diputados',
    subtitle: 'Distrito Electoral Lima',
    rows: PARTIES.map((_, i) => makeLegislativeRow('col3', i)),
  },
  {
    id: 'col4', index: 4, section: 'parlamento-andino',
    title: 'Parlamento Andino',
    rows: PARTIES.map((_, i) => makeLegislativeRow('col4', i)),
  },
];
