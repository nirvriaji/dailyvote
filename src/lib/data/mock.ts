import type { BallotColumn, BallotRow, VoteZone, Candidate, ZoneId } from '$lib/types';

// ─── Image URLs Configuration ───────────────────────────────────────────
// Images are served from static folder via Firebase Hosting CDN
const BASE_IMAGE_URL = '/images/parties';

// Helper to generate local URLs for party logos and candidate photos
function getPartyImageUrl(partyNumber: number, type: 'logo' | 'candidate'): string {
  const partyMap: Record<number, { logo: string; candidate: string }> = {
    1: { logo: '1-alianza-venceremos-logo.webp', candidate: '1-alianza-venceremos-candidate.webp' },
    2: { logo: '2-partido-patri-tico-del-per--logo.webp', candidate: '2-partido-patri-tico-del-per--candidate.webp' },
    3: { logo: '3-partido-c-vico-obras-logo.webp', candidate: '3-partido-c-vico-obras-candidate.webp' },
    4: { logo: '4-partido-dem-crata-verde-logo.webp', candidate: '4-partido-dem-crata-verde-candidate.webp' },
    5: { logo: '5-partido-del-buen-gobierno-logo.webp', candidate: '5-partido-del-buen-gobierno-candidate.webp' },
    6: { logo: '6-per-acci-n-logo.webp', candidate: '6-per-acci-n-candidate.webp' },
    7: { logo: '7-prin-logo.webp', candidate: '7-prin-candidate.webp' },
    8: { logo: '8-progresemos-logo.webp', candidate: '8-progresemos-candidate.webp' },
    9: { logo: '9-s-creo-logo.webp', candidate: '9-s-creo-candidate.webp' },
    10: { logo: '10-pa-s-para-todos-logo.webp', candidate: '10-pa-s-para-todos-candidate.webp' },
    11: { logo: '11-frente-de-la-esperanza-logo.webp', candidate: '11-frente-de-la-esperanza-candidate.webp' },
    12: { logo: '12-per-libre-logo.webp', candidate: '12-per-libre-candidate.webp' },
    13: { logo: '13-primero-la-gente-logo.webp', candidate: '13-primero-la-gente-candidate.webp' },
    14: { logo: '14-juntos-por-el-per--logo.webp', candidate: '14-juntos-por-el-per--candidate.webp' },
    15: { logo: '15-podemos-per--logo.webp', candidate: '15-podemos-per--candidate.webp' },
    16: { logo: '16-partido-democr-tico-federal-logo.webp', candidate: '16-partido-democr-tico-federal-candidate.webp' },
    17: { logo: '17-fe-en-el-per--logo.webp', candidate: '17-fe-en-el-per--candidate.webp' },
    18: { logo: '18-integridad-democr-tica-logo.webp', candidate: '18-integridad-democr-tica-candidate.webp' },
    19: { logo: '19-fuerza-popular-logo.webp', candidate: '19-fuerza-popular-candidate.webp' },
    20: { logo: '20-alianza-para-el-progreso-logo.webp', candidate: '20-alianza-para-el-progreso-candidate.webp' },
    21: { logo: '21-cooperaci-n-popular-logo.webp', candidate: '21-cooperaci-n-popular-candidate.webp' },
    22: { logo: '22-ahora-naci-n-logo.webp', candidate: '22-ahora-naci-n-candidate.webp' },
    23: { logo: '23-libertad-popular-logo.webp', candidate: '23-libertad-popular-candidate.webp' },
    24: { logo: '24-un-camino-diferente-logo.webp', candidate: '24-un-camino-diferente-candidate.webp' },
    25: { logo: '25-avanza-pa-s-logo.webp', candidate: '25-avanza-pa-s-candidate.webp' },
    26: { logo: '26-per-moderno-logo.webp', candidate: '26-per-moderno-candidate.webp' },
    27: { logo: '27-per-primero-logo.webp', candidate: '27-per-primero-candidate.webp' },
    28: { logo: '28-salvemos-al-per--logo.webp', candidate: '28-salvemos-al-per--candidate.webp' },
    29: { logo: '29-somos-per--logo.webp', candidate: '29-somos-per--candidate.webp' },
    30: { logo: '30-partido-aprista-peruano-logo.webp', candidate: '30-partido-aprista-peruano-candidate.webp' },
    31: { logo: '31-renovaci-n-popular-logo.webp', candidate: '31-renovaci-n-popular-candidate.webp' },
    32: { logo: '32-partido-dem-crata-unido-per--logo.webp', candidate: '32-partido-dem-crata-unido-per--candidate.webp' },
    33: { logo: '33-alianza-fuerza-y-libertad-logo.webp', candidate: '33-alianza-fuerza-y-libertad-candidate.webp' },
    34: { logo: '34-partido-de-los-trabajadores-y--logo.webp', candidate: '34-partido-de-los-trabajadores-y--candidate.webp' },
    35: { logo: '35-alianza-unidad-nacional-logo.webp', candidate: '35-alianza-unidad-nacional-candidate.webp' },
    36: { logo: '36-partido-morado-logo.webp', candidate: '36-partido-morado-candidate.webp' },
  };
  
  const fileName = partyMap[partyNumber]?.[type];
  if (!fileName) return '';
  
  const folder = type === 'logo' ? 'logos' : 'candidates';
  return `${BASE_IMAGE_URL}/${folder}/${fileName}`;
}

// Frepap logo URL (legislative only)
function getFrepapLogoUrl(): string {
  return `${BASE_IMAGE_URL}/logos/4-frepap-logo.webp`;
}

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

interface Party { 
  number: number; 
  name: string; 
  abbr: string;
  color: string;
  symbolUrl: string;
  candidatePhotoUrl: string;
}

// 36 parties participating in presidential election
const PARTIES: Party[] = [
  { number: 1,  name: 'Alianza Venceremos',                     abbr: 'AV',   color: '#D32F2F',   symbolUrl: getPartyImageUrl(1, 'logo'), candidatePhotoUrl: getPartyImageUrl(1, 'candidate') },
  { number: 2,  name: 'Partido Patriótico del Perú',            abbr: 'PPP',  color: '#1976D2',   symbolUrl: getPartyImageUrl(2, 'logo'), candidatePhotoUrl: getPartyImageUrl(2, 'candidate') },
  { number: 3,  name: 'Partido Cívico Obras',                   abbr: 'PCO',  color: '#388E3C',   symbolUrl: getPartyImageUrl(3, 'logo'), candidatePhotoUrl: getPartyImageUrl(3, 'candidate') },
  { number: 4,  name: 'Partido Demócrata Verde',                abbr: 'PDV',  color: '#689F38',   symbolUrl: getPartyImageUrl(4, 'logo'), candidatePhotoUrl: getPartyImageUrl(4, 'candidate') },
  { number: 5,  name: 'Partido del Buen Gobierno',              abbr: 'PBG',  color: '#FBC02D',   symbolUrl: getPartyImageUrl(5, 'logo'), candidatePhotoUrl: getPartyImageUrl(5, 'candidate') },
  { number: 6,  name: 'Perú Acción',                            abbr: 'PA',   color: '#E64A19',   symbolUrl: getPartyImageUrl(6, 'logo'), candidatePhotoUrl: getPartyImageUrl(6, 'candidate') },
  { number: 7,  name: 'PRIN',                                   abbr: 'PRIN', color: '#5E35B1',   symbolUrl: getPartyImageUrl(7, 'logo'), candidatePhotoUrl: getPartyImageUrl(7, 'candidate') },
  { number: 8,  name: 'Progresemos',                            abbr: 'PROG', color: '#00796B',   symbolUrl: getPartyImageUrl(8, 'logo'), candidatePhotoUrl: getPartyImageUrl(8, 'candidate') },
  { number: 9,  name: 'Sí Creo',                                abbr: 'SC',   color: '#F57C00',   symbolUrl: getPartyImageUrl(9, 'logo'), candidatePhotoUrl: getPartyImageUrl(9, 'candidate') },
  { number: 10, name: 'País para Todos',                        abbr: 'PPT',  color: '#C2185B',   symbolUrl: getPartyImageUrl(10, 'logo'), candidatePhotoUrl: getPartyImageUrl(10, 'candidate') },
  { number: 11, name: 'Frente de la Esperanza',                 abbr: 'FE',   color: '#303F9F',   symbolUrl: getPartyImageUrl(11, 'logo'), candidatePhotoUrl: getPartyImageUrl(11, 'candidate') },
  { number: 12, name: 'Perú Libre',                             abbr: 'PL',   color: '#D32F2F',   symbolUrl: getPartyImageUrl(12, 'logo'), candidatePhotoUrl: getPartyImageUrl(12, 'candidate') },
  { number: 13, name: 'Primero la Gente',                       abbr: 'PG',   color: '#0288D1',   symbolUrl: getPartyImageUrl(13, 'logo'), candidatePhotoUrl: getPartyImageUrl(13, 'candidate') },
  { number: 14, name: 'Juntos por el Perú',                     abbr: 'JP',   color: '#7B1FA2',   symbolUrl: getPartyImageUrl(14, 'logo'), candidatePhotoUrl: getPartyImageUrl(14, 'candidate') },
  { number: 15, name: 'Podemos Perú',                           abbr: 'PP',   color: '#303F9F',   symbolUrl: getPartyImageUrl(15, 'logo'), candidatePhotoUrl: getPartyImageUrl(15, 'candidate') },
  { number: 16, name: 'Partido Democrático Federal',            abbr: 'PDF',  color: '#455A64',   symbolUrl: getPartyImageUrl(16, 'logo'), candidatePhotoUrl: getPartyImageUrl(16, 'candidate') },
  { number: 17, name: 'Fe en el Perú',                          abbr: 'FEP',  color: '#795548',   symbolUrl: getPartyImageUrl(17, 'logo'), candidatePhotoUrl: getPartyImageUrl(17, 'candidate') },
  { number: 18, name: 'Integridad Democrática',                 abbr: 'ID',   color: '#E91E63',   symbolUrl: getPartyImageUrl(18, 'logo'), candidatePhotoUrl: getPartyImageUrl(18, 'candidate') },
  { number: 19, name: 'Fuerza Popular',                         abbr: 'FP',   color: '#FF6F00',   symbolUrl: getPartyImageUrl(19, 'logo'), candidatePhotoUrl: getPartyImageUrl(19, 'candidate') },
  { number: 20, name: 'Alianza para el Progreso',               abbr: 'APP',  color: '#F57F17',   symbolUrl: getPartyImageUrl(20, 'logo'), candidatePhotoUrl: getPartyImageUrl(20, 'candidate') },
  { number: 21, name: 'Cooperación Popular',                    abbr: 'CP',   color: '#558B2F',   symbolUrl: getPartyImageUrl(21, 'logo'), candidatePhotoUrl: getPartyImageUrl(21, 'candidate') },
  { number: 22, name: 'Ahora Nación',                           abbr: 'AN',   color: '#1565C0',   symbolUrl: getPartyImageUrl(22, 'logo'), candidatePhotoUrl: getPartyImageUrl(22, 'candidate') },
  { number: 23, name: 'Libertad Popular',                       abbr: 'LP',   color: '#00695C',   symbolUrl: getPartyImageUrl(23, 'logo'), candidatePhotoUrl: getPartyImageUrl(23, 'candidate') },
  { number: 24, name: 'Un Camino Diferente',                    abbr: 'UCD',  color: '#AD1457',   symbolUrl: getPartyImageUrl(24, 'logo'), candidatePhotoUrl: getPartyImageUrl(24, 'candidate') },
  { number: 25, name: 'Avanza País',                            abbr: 'AVP',  color: '#0277BD',   symbolUrl: getPartyImageUrl(25, 'logo'), candidatePhotoUrl: getPartyImageUrl(25, 'candidate') },
  { number: 26, name: 'Perú Moderno',                           abbr: 'PMOD', color: '#6A1B9A',   symbolUrl: getPartyImageUrl(26, 'logo'), candidatePhotoUrl: getPartyImageUrl(26, 'candidate') },
  { number: 27, name: 'Perú Primero',                           abbr: 'PPRI', color: '#283593',   symbolUrl: getPartyImageUrl(27, 'logo'), candidatePhotoUrl: getPartyImageUrl(27, 'candidate') },
  { number: 28, name: 'Salvemos al Perú',                       abbr: 'SPP',  color: '#C62828',   symbolUrl: getPartyImageUrl(28, 'logo'), candidatePhotoUrl: getPartyImageUrl(28, 'candidate') },
  { number: 29, name: 'Somos Perú',                             abbr: 'SP',   color: '#00695C',   symbolUrl: getPartyImageUrl(29, 'logo'), candidatePhotoUrl: getPartyImageUrl(29, 'candidate') },
  { number: 30, name: 'Partido Aprista Peruano',                abbr: 'APRA', color: '#B71C1C',   symbolUrl: getPartyImageUrl(30, 'logo'), candidatePhotoUrl: getPartyImageUrl(30, 'candidate') },
  { number: 31, name: 'Renovación Popular',                     abbr: 'RP',   color: '#2E7D32',   symbolUrl: getPartyImageUrl(31, 'logo'), candidatePhotoUrl: getPartyImageUrl(31, 'candidate') },
  { number: 32, name: 'Partido Demócrata Unido Perú',           abbr: 'PDUP', color: '#00838F',   symbolUrl: getPartyImageUrl(32, 'logo'), candidatePhotoUrl: getPartyImageUrl(32, 'candidate') },
  { number: 33, name: 'Alianza Fuerza y Libertad',              abbr: 'AFYL', color: '#4527A0',   symbolUrl: getPartyImageUrl(33, 'logo'), candidatePhotoUrl: getPartyImageUrl(33, 'candidate') },
  { number: 34, name: 'Partido de los Trabajadores y Emprendedores', abbr: 'PTYE', color: '#BF360C',   symbolUrl: getPartyImageUrl(34, 'logo'), candidatePhotoUrl: getPartyImageUrl(34, 'candidate') },
  { number: 35, name: 'Alianza Unidad Nacional',                abbr: 'AUN',  color: '#4A148C',   symbolUrl: getPartyImageUrl(35, 'logo'), candidatePhotoUrl: getPartyImageUrl(35, 'candidate') },
  { number: 36, name: 'Partido Morado',                         abbr: 'PM',   color: '#6A1B9A',   symbolUrl: getPartyImageUrl(36, 'logo'), candidatePhotoUrl: getPartyImageUrl(36, 'candidate') },
];

// Legislative elections include Frepap at position #4 (after Partido Cívico Obras)
const LEGISLATIVE_PARTIES: Party[] = [
  PARTIES[0],  // 1. Alianza Venceremos
  PARTIES[1],  // 2. Partido Patriótico del Perú
  PARTIES[2],  // 3. Partido Cívico Obras
  { number: 4, name: 'Frepap', abbr: 'FREPAP', color: '#3E2723', symbolUrl: getFrepapLogoUrl(), candidatePhotoUrl: '' },  // 4. Frepap (legislative only, no presidential candidate)
  PARTIES[3],  // 5. Partido Demócrata Verde
  PARTIES[4],  // 6. Partido del Buen Gobierno
  PARTIES[5],  // 7. Perú Acción
  PARTIES[6],  // 8. PRIN
  PARTIES[7],  // 9. Progresemos
  PARTIES[8],  // 10. Sí Creo
  PARTIES[9],  // 11. País para Todos
  PARTIES[10], // 12. Frente de la Esperanza
  PARTIES[11], // 13. Perú Libre
  PARTIES[12], // 14. Primero la Gente
  PARTIES[13], // 15. Juntos por el Perú
  PARTIES[14], // 16. Podemos Perú
  PARTIES[15], // 17. Partido Democrático Federal
  PARTIES[16], // 18. Fe en el Perú
  PARTIES[17], // 19. Integridad Democrática
  PARTIES[18], // 20. Fuerza Popular
  PARTIES[19], // 21. Alianza para el Progreso
  PARTIES[20], // 22. Cooperación Popular
  PARTIES[21], // 23. Ahora Nación
  PARTIES[22], // 24. Libertad Popular
  PARTIES[23], // 25. Un Camino Diferente
  PARTIES[24], // 26. Avanza País
  PARTIES[25], // 27. Perú Moderno
  PARTIES[26], // 28. Perú Primero
  PARTIES[27], // 29. Salvemos al Perú
  PARTIES[28], // 30. Somos Perú
  PARTIES[29], // 31. Partido Aprista Peruano
  PARTIES[30], // 32. Renovación Popular
  PARTIES[31], // 33. Partido Demócrata Unido Perú
  PARTIES[32], // 34. Alianza Fuerza y Libertad
  PARTIES[33], // 35. Partido de los Trabajadores y Emprendedores
  PARTIES[34], // 36. Alianza Unidad Nacional
  PARTIES[35], // 37. Partido Morado
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
  ['Ronald Atencio',        'Vicepresidente 1A',    'Vicepresidente 1B'],
  ['Hebert Caller',         'Vicepresidente 2A',    'Vicepresidente 2B'],
  ['Ricardo Belmont',       'Vicepresidente 3A',    'Vicepresidente 3B'],
  ['Alex Gonzales',         'Vicepresidente 4A',    'Vicepresidente 4B'],
  ['Jorge Nieto',           'Vicepresidente 5A',    'Vicepresidente 5B'],
  ['Francisco Diez Canseco','Vicepresidente 6A',    'Vicepresidente 6B'],
  ['Walter Chirinos',       'Vicepresidente 7A',    'Vicepresidente 7B'],
  ['Paul Jaimes',           'Vicepresidente 8A',    'Vicepresidente 8B'],
  ['Carlos Espa',           'Vicepresidente 9A',    'Vicepresidente 9B'],
  ['Carlos Alvarez',        'Vicepresidente 10A',   'Vicepresidente 10B'],
  ['Fernando Olivera',      'Vicepresidente 11A',   'Vicepresidente 11B'],
  ['Vladimir Cerron',       'Vicepresidente 12A',   'Vicepresidente 12B'],
  ['Marisol Perez Tello',   'Vicepresidente 13A',   'Vicepresidente 13B'],
  ['Roberto Sanchez',       'Vicepresidente 14A',   'Vicepresidente 14B'],
  ['Jose Luna Galvez',      'Vicepresidente 15A',   'Vicepresidente 15B'],
  ['Armando Masse',         'Vicepresidente 16A',   'Vicepresidente 16B'],
  ['Alvaro Paz de la Barra','Vicepresidente 17A',   'Vicepresidente 17B'],
  ['Wolfgang Grozo',        'Vicepresidente 18A',   'Vicepresidente 18B'],
  ['Keiko Fujimori',        'Vicepresidente 19A',   'Vicepresidente 19B'],
  ['Cesar Acuna',           'Vicepresidente 20A',   'Vicepresidente 20B'],
  ['Yonhy Lescano',         'Vicepresidente 21A',   'Vicepresidente 21B'],
  ['Alfonso Lopez Chau',    'Vicepresidente 22A',   'Vicepresidente 22B'],
  ['Rafael Belaunde',       'Vicepresidente 23A',   'Vicepresidente 23B'],
  ['Rosario Fernandez Bazan','Vicepresidente 24A',  'Vicepresidente 24B'],
  ['Jose Williams',         'Vicepresidente 25A',   'Vicepresidente 25B'],
  ['Carlos Jaico',          'Vicepresidente 26A',   'Vicepresidente 26B'],
  ['Martin Vizcarra',       'Vicepresidente 27A',   'Vicepresidente 27B'],
  ['Antonio Ortiz',         'Vicepresidente 28A',   'Vicepresidente 28B'],
  ['George Forsyth',        'Vicepresidente 29A',   'Vicepresidente 29B'],
  ['Enrique Valderrama',    'Vicepresidente 30A',   'Vicepresidente 30B'],
  ['Rafael Lopez Aliaga',   'Vicepresidente 31A',   'Vicepresidente 31B'],
  ['Charlie Carrasco',      'Vicepresidente 32A',   'Vicepresidente 32B'],
  ['Fiorella Molinelli',    'Vicepresidente 33A',   'Vicepresidente 33B'],
  ['Napoleon Becerra',      'Vicepresidente 34A',   'Vicepresidente 34B'],
  ['Roberto Chiabra',       'Vicepresidente 35A',   'Vicepresidente 35B'],
  ['Mesias Guevara',        'Vicepresidente 36A',   'Vicepresidente 36B'],
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
    partySymbolUrl: p.symbolUrl,
    candidates,
    voteZones: PRESIDENTIAL_ZONES,
    zone: zoneFor(partyIdx, PARTIES.length),
    isPresidential: true,
    presidentialPhoto: p.candidatePhotoUrl,
    rowIndex: partyIdx,
  };
}

// ─── Legislative rows ─────────────────────────────────────────────────────────

function makeLegislativeRow(colId: string, partyIdx: number, parties: Party[] = LEGISLATIVE_PARTIES): BallotRow {
  const p = parties[partyIdx];
  return {
    id: `${colId}-row${partyIdx}`,
    partyNumber: p.number,
    partyName: p.name,
    partyAbbr: p.abbr,
    partyColor: p.color,
    partySymbolUrl: p.symbolUrl,
    candidates: [],
    voteZones: LEGISLATIVE_ZONES,
    zone: zoneFor(partyIdx, parties.length),
    isPresidential: false,
    rowIndex: partyIdx,
  };
}

  // ─── Ballot columns (estructura real de cédula) ─────────────────────────────────

// Create presidential rows with a spacer at index 3 for Frepap alignment
function createPresidentialRows(): BallotRow[] {
  const rows: BallotRow[] = [];
  
  // First 3 parties (indices 0-2)
  for (let i = 0; i < 3; i++) {
    rows.push(makePresidentialRow(i));
  }
  
  // Spacer row for Frepap (index 3) - empty row to align with legislative columns
  rows.push({
    id: 'col0-row-frepap-spacer',
    partyNumber: 4,
    partyName: '',
    partyAbbr: '',
    partyColor: '#3E2723',
    partySymbolUrl: '',
    candidates: [],
    voteZones: [],
    zone: 'top' as ZoneId,
    isPresidential: true,
    presidentialPhoto: '',
    rowIndex: 3,
  });
  
  // Remaining parties (indices 3-35 from PARTIES, placed at indices 4-36)
  for (let i = 3; i < PARTIES.length; i++) {
    const row = makePresidentialRow(i);
    row.rowIndex = i + 1; // Shift row index to account for spacer
    row.partyNumber = i + 2; // Shift party number: 3->5, 4->6, etc. (since 4 is Frepap)
    rows.push(row);
  }
  
  return rows;
}

export const BALLOT_COLUMNS: BallotColumn[] = [
  {
    id: 'col0', index: 0, section: 'presidente',
    title: 'Presidente y Vicepresidentes',
    rows: createPresidentialRows(),
  },
  {
    id: 'col1', index: 1, section: 'senadores-nacional',
    title: 'Senadores a Nivel Nacional',
    subtitle: 'Lista Nacional',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col1', i)),
  },
  {
    id: 'col2', index: 2, section: 'senadores-regional',
    title: 'Senadores a Nivel Regional',
    subtitle: 'Lima Metropolitana',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col2', i)),
  },
  {
    id: 'col3', index: 3, section: 'diputados',
    title: 'Diputados',
    subtitle: 'Distrito Electoral Lima',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col3', i)),
  },
  {
    id: 'col4', index: 4, section: 'parlamento-andino',
    title: 'Parlamento Andino',
    rows: LEGISLATIVE_PARTIES.map((_, i) => makeLegislativeRow('col4', i)),
  },
];
