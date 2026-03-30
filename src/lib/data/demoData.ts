// Demo Data - Fictional parties and candidates for demo mode
// Uses emojis for symbols and candidate faces to avoid real political content

// Generate 37 fictional parties with unique emojis
// Customized: 🏔️ for Coalición Marrón (mountain), 🥩 for Renovación Medieval (pork chop)
const PARTY_EMOJIS = [
  '⭐', '☀️', '🌿', '🏔️', '🌙', '🕊️', '🚀', '🥩', '🌲', '💎',
  '🔥', '💧', '🌍', '❤️', '💛', '💚', '💙', '💜', '🧡', '🤍',
  '🎯', '⚡', '🛡️', '⚓', '🎪', '🎨', '🎭', '🎪', '🎰', '🎱',
  '🎲', '🎳', '🎴', '🎵', '🎶', '🎷', '🎸'
];

const PARTY_NAMES = [
  'Alianza Estelar', 'Movimiento Solar', 'Frente Verde', 'Coalición Marrón', 'Partido Luna',
  'Unión Libertad', 'Fuerza Progreso', 'Renovación Medieval', 'Movimiento Ecologista', 'Frente Diamante',
  'Partido del Fuego', 'Coalición Aguamarina', 'Frente Global', 'Movimiento Solidario', 'Alianza Dorada',
  'Frente Esperanza', 'Coalición Celestial', 'Movimiento Imperial', 'Frente Popular', 'Unión Blanca',
  'Partido del Progreso', 'Frente Energía', 'Movimiento Defensa', 'Alianza Marítima', 'Coalición Cultural',
  'Frente Artístico', 'Movimiento Teatral', 'Coalición Circense', 'Frente Suerte', 'Alianza Deportiva',
  'Movimiento Juego', 'Coalición Bolos', 'Frente Cartas', 'Alianza Musical', 'Coalición Melodía',
  'Frente Instrumental', 'Movimiento Cuerdas'
];

const CANDIDATE_EMOJIS = [
  '👨', '👩', '👱‍♂️', '👩‍🦰', '👨‍🦱', '👩‍🦱', '👨‍🦲', '👩‍🦲', '👴', '👵',
  '🧔', '🧔‍♀️', '👨‍🦳', '👩‍🦳', '👱‍♀️', '👳‍♂️', '👳‍♀️', '🧕', '👲', '🧑',
  '👦', '👧', '👨‍🦰', '👩‍🦱', '👨‍🦲', '👩‍🦲', '👴', '👵', '👱‍♂️', '👱‍♀️',
  '👳‍♂️', '👳‍♀️', '👲', '🧕', '👨', '👩', '👱‍♂️'
];

// Generate 37 fictional parties
const FICTIONAL_PARTIES = Array.from({ length: 37 }, (_, i) => ({
  number: i + 1,
  name: PARTY_NAMES[i],
  abbr: `P${String(i + 1).padStart(2, '0')}`,
  color: `hsl(${(i * 10) % 360}, 70%, 50%)`,
  symbol: PARTY_EMOJIS[i],
  candidateName: `Candidato ${i + 1}`,
  candidateEmoji: CANDIDATE_EMOJIS[i]
}));

// Generate demo rows for a column
function generateDemoRows(columnId: string, hasPreferential: boolean) {
  return FICTIONAL_PARTIES.map((party, index) => ({
    id: `${columnId}-row-${index}`,
    partyName: party.name,
    partyAbbr: party.abbr,
    partyNumber: party.number,
    partyColor: party.color,
    partySymbol: party.symbol, // Emoji symbol for demo mode
    partySymbolUrl: '', // Empty - we use emoji instead
    isPresidential: columnId === 'col0',
    presidentialPhoto: columnId === 'col0' ? party.candidateEmoji : undefined,
    candidates: columnId === 'col0' ? [{
      id: `${columnId}-cand-${index}`,
      name: party.candidateName,
      avatarColor: party.color,
      partyAbbr: party.abbr
    }] : undefined,
    rowIndex: index,
    candidatesCount: hasPreferential ? 2 : 1
  }));
}

// Generate demo columns
export const DEMO_BALLOT_COLUMNS = [
  {
    id: 'col0',
    title: 'Presidente',
    section: 'presidente',
    scope: 'Nacional',
    rows: generateDemoRows('col0', false)
  },
  {
    id: 'col1',
    title: 'Senadores',
    section: 'senadores-nacional',
    scope: 'Nacional',
    rows: generateDemoRows('col1', true)
  },
  {
    id: 'col2',
    title: 'Senadores',
    section: 'senadores-regional',
    scope: 'Regional',
    rows: generateDemoRows('col2', true)
  },
  {
    id: 'col3',
    title: 'Diputados',
    section: 'diputados',
    scope: 'Regional',
    rows: generateDemoRows('col3', true)
  },
  {
    id: 'col4',
    title: 'Parlamento Andino',
    section: 'parlamento',
    scope: 'Andino',
    rows: generateDemoRows('col4', true)
  }
];

// Helper to check if we're in demo mode
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('demo=1');
}
