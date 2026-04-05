// Pure helper — derives personalised insights from the user's ballot.
// No external data, no seat calculations, no electoral math.

export interface UserBallotRow {
  colId: string;
  key: string;
  label: string;
  hasPreferential: boolean;
  selection: { partyName: string; partyColor: string } | undefined;
  prefs: number[];
}

export interface SimulationInsights {
  votedCount: number;
  uniqueParties: number;
  isConcentrated: boolean;      // same party across all voted legislative columns (≥2)
  isFragmented: boolean;        // 4+ distinct parties
  hasAnyPreferences: boolean;
  hasAllPrefs: boolean;         // every voted legislative column has ≥1 pref
  prefCoverage: number;         // 0.0–1.0
  blankColumns: string[];       // labels of unmarked columns
  presidentialSelectionExists: boolean;
  legislativeSelectionsCount: number;
  ballotCompleteness: 'complete' | 'partial' | 'blank';
}

export function deriveInsights(userBallot: UserBallotRow[]): SimulationInsights {
  const voted           = userBallot.filter(r => r.selection);
  const votedCount      = voted.length;

  const partyNames      = voted.map(r => r.selection!.partyName);
  const uniqueParties   = new Set(partyNames).size;

  const legVoted        = voted.filter(r => r.hasPreferential);
  const legCount        = legVoted.length;

  const legParties      = new Set(legVoted.map(r => r.selection!.partyName));
  const isConcentrated  = legCount >= 2 && legParties.size === 1;
  const isFragmented    = uniqueParties >= 4;

  const hasAnyPreferences = userBallot.some(r => r.prefs.length > 0);
  const hasAllPrefs       = legCount > 0 && legVoted.every(r => r.prefs.length > 0);
  const prefCoverage      = legCount === 0 ? 0
    : legVoted.filter(r => r.prefs.length > 0).length / legCount;

  const blankColumns    = userBallot.filter(r => !r.selection).map(r => r.label);
  const ballotCompleteness: SimulationInsights['ballotCompleteness'] =
    votedCount === 5 ? 'complete' : votedCount === 0 ? 'blank' : 'partial';

  return {
    votedCount,
    uniqueParties,
    isConcentrated,
    isFragmented,
    hasAnyPreferences,
    hasAllPrefs,
    prefCoverage,
    blankColumns,
    presidentialSelectionExists: !!userBallot[0]?.selection,
    legislativeSelectionsCount: legCount,
    ballotCompleteness,
  };
}
