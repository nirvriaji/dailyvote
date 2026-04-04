<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { vote } from '$lib/stores/vote.svelte';
  import {
    resetAllSelections,
    getColumnPreferenceNumbers,
    loadPreferencesFromStorage,
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import ShareResults from '$lib/components/ShareResults.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  import {
    getAccumulatedResultsWithPercentages,
    getAccumulatedSimulations,
    getAccumulatedResults,
    subscribeToGlobalStats,
  } from '$lib/firebase/stats';
  import {
    initializeFirebase,
    isFirebaseReady,
    getVotingStatus,
    getCountdownToElection,
    canStillSimulate,
  } from '$lib/firebase';
  import type { GlobalStats } from '$lib/firebase/config';
  import type { Unsubscribe } from 'firebase/firestore';

  // ─── Party data ──────────────────────────────────────────────────────────────
  const presidentialRows = BALLOT_COLUMNS[0].rows.filter(r => r.partyName);
  const legislativeRows  = BALLOT_COLUMNS[1].rows.filter(r => r.partyName);

  // ─── Types ───────────────────────────────────────────────────────────────────
  interface Seat {
    partyColor: string;
    partyName: string;
    partySymbolUrl: string;
  }

  interface ElectionResult {
    partyId: string;
    partyName: string;
    partyColor: string;
    partySymbolUrl: string;
    photoUrl: string | null;
    votes: number;
    percentage: number;
    seats?: number;
  }

  interface CategoryResults {
    category: string;
    categoryId: string;
    totalVotes: number;
    totalSeats: number;
    results: ElectionResult[];
    seatDistribution: Seat[];
    userVote?: string;
  }

  interface SharedResult {
    category: string;
    partyName: string;
    partyColor: string;
    percentage: number;
  }

  interface SimpleGovernance {
    level: 'high' | 'balanced' | 'fragmented';
    label: string;
    color: string;
    description: string;
    microCopy: string;
  }

  interface GlobalScenario {
    type: 'high' | 'balanced' | 'fragmented';
    label: string;
    color: string;
    title: string;
    description: string;
    alignmentPoints: number;
    fragmentation: number;
  }

  // ─── Ballot definition ───────────────────────────────────────────────────────
  const BALLOT_DEF = [
    { colId: 'col0', key: 'presidente'       as ColumnKey, label: 'Presidencia',      hasPreferential: false, catId: 'president'        },
    { colId: 'col1', key: 'senadoNacional'   as ColumnKey, label: 'Senado nacional',  hasPreferential: true,  catId: 'senatorsNational' },
    { colId: 'col2', key: 'senadoRegional'   as ColumnKey, label: 'Senado regional',  hasPreferential: true,  catId: 'senatorsRegional' },
    { colId: 'col3', key: 'diputados'        as ColumnKey, label: 'Diputados',        hasPreferential: true,  catId: 'deputies'         },
    { colId: 'col4', key: 'parlamentoAndino' as ColumnKey, label: 'Parlamento Andino',hasPreferential: true,  catId: 'andeanParliament' },
  ] as const;

  // ─── Results state ───────────────────────────────────────────────────────────
  let allResults     = $state<CategoryResults[]>([]);
  let isLoading      = $state(true);
  let totalVoters    = $state(0);
  let liveVoterCount = $state(0);
  let lastUpdateTime = $state<Date | null>(null);
  let restarting     = $state(false);
  let showShareModal = $state(false);
  let showHelpPanel  = $state(false);
  let unsubscribe: Unsubscribe | null = null;

  // ─── Countdown ───────────────────────────────────────────────────────────────
  let electionCountdown = $state(getCountdownToElection(new Date()));
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  // ─── Entry veil ──────────────────────────────────────────────────────────────
  let arriving = $state(true);

  // ─── Protagonist flow (Senado nacional only) ─────────────────────────────────
  // Each step appears ONLY after the previous one has finished.
  let protagonistStep = $state(0); // 0 = hidden, 1–4 = nodes visible sequentially
  let protagonistStarted = false;

  function startProtagonistFlow() {
    if (protagonistStarted) return;
    protagonistStarted = true;
    const next = (step: number) => {
      protagonistStep = step;
      if (step < 4) setTimeout(() => next(step + 1), 620);
    };
    setTimeout(() => next(1), 250);
  }

  // ─── User ballot summary ─────────────────────────────────────────────────────
  let userBallot = $derived(
    BALLOT_DEF.map(def => ({
      ...def,
      selection: vote.getVote(def.colId),
      prefs: def.hasPreferential ? getColumnPreferenceNumbers(def.key) : [] as number[],
    }))
  );
  let hasUserVote = $derived(vote.count > 0);

  // ─── Projection ──────────────────────────────────────────────────────────────
  let projectionMultiplier = $state(1);
  let projectionMode = $state<'same' | 'random' | 'proportional'>('same');

  const projectionOptions = [
    { label: 'Solo tú',     value: 1     },
    { label: '10',          value: 10    },
    { label: '100',         value: 100   },
    { label: '1.000',       value: 1000  },
    { label: '10.000',      value: 10000 },
  ];

  const projectionModes = [
    { id: 'same'         as const, label: 'Igual que tú',              icon: '👥', description: 'Todos votan exactamente como tú' },
    { id: 'random'       as const, label: 'Distribución aleatoria',    icon: '🎲', description: 'Votos distribuidos al azar entre partidos' },
    { id: 'proportional' as const, label: 'Proporcional a resultados', icon: '📊', description: 'Votos distribuidos según tendencias actuales' },
  ];

  $effect(() => {
    sessionStorage.setItem('projection_multiplier', projectionMultiplier.toString());
    sessionStorage.setItem('projection_mode', projectionMode);
  });

  let userVotes = $derived(
    Array.from(vote.votes.entries()).map(([colId, voteData]) => ({
      colId,
      partyName: voteData.partyName,
      category: voteData.columnId,
    }))
  );

  function getHypotheticalExtra(multiplier: number) {
    return Math.max(0, multiplier - 1);
  }

  function getProjectedResults(mode: 'same' | 'random' | 'proportional' = projectionMode) {
    if (projectionMultiplier === 1) return allResults;
    const extra = getHypotheticalExtra(projectionMultiplier);
    const colIdToCategoryId: Record<string, string> = {
      'col0': 'president', 'col1': 'senatorsNational',
      'col2': 'senatorsRegional', 'col3': 'deputies', 'col4': 'andeanParliament',
    };
    const categoryInfo: Record<string, { name: string; totalSeats: number }> = {
      'president': { name: 'Presidente', totalSeats: 1 },
      'senatorsNational': { name: 'Senado nacional', totalSeats: 30 },
      'senatorsRegional': { name: 'Senado regional', totalSeats: 30 },
      'deputies': { name: 'Diputados', totalSeats: 130 },
      'andeanParliament': { name: 'Parlamento Andino', totalSeats: 5 },
    };
    let cloned: CategoryResults[] = allResults.length > 0 ? JSON.parse(JSON.stringify(allResults)) : [];
    const allParties = [...presidentialRows, ...legislativeRows].filter(r => r.partyName);
    for (const uv of userVotes) {
      const targetCategoryId = colIdToCategoryId[uv.colId];
      let category = cloned.find(c => c.categoryId === targetCategoryId);
      if (!category && targetCategoryId) {
        const info = categoryInfo[targetCategoryId];
        category = { category: info.name, categoryId: targetCategoryId, totalVotes: 0, totalSeats: info.totalSeats, results: [], seatDistribution: [], userVote: uv.partyName };
        cloned.push(category);
      }
      if (!category) continue;
      if (mode === 'same') {
        let result = category.results.find(r => r.partyName === uv.partyName);
        if (!result) {
          const isPresident = targetCategoryId === 'president';
          const partyRow = isPresident ? presidentialRows.find(r => r.partyName === uv.partyName) : legislativeRows.find(r => r.partyName === uv.partyName);
          if (partyRow) { result = { partyId: partyRow.partyAbbr || uv.partyName, partyName: partyRow.partyName, partyColor: partyRow.partyColor, partySymbolUrl: partyRow.partySymbolUrl || '', photoUrl: isPresident ? partyRow.presidentialPhoto : null, votes: 1, percentage: 0, seats: 0 }; category.results.push(result); }
        }
        if (result) result.votes += extra;
      } else if (mode === 'random') {
        const isPresident = targetCategoryId === 'president';
        const availableParties = isPresident ? presidentialRows.filter(r => r.partyName) : legislativeRows.filter(r => r.partyName);
        let userPartyResult = category.results.find(r => r.partyName === uv.partyName);
        if (!userPartyResult) {
          const partyRow = availableParties.find(r => r.partyName === uv.partyName);
          if (partyRow) { userPartyResult = { partyId: partyRow.partyAbbr || uv.partyName, partyName: partyRow.partyName, partyColor: partyRow.partyColor, partySymbolUrl: partyRow.partySymbolUrl || '', photoUrl: isPresident ? partyRow.presidentialPhoto : null, votes: 1, percentage: 0, seats: 0 }; category.results.push(userPartyResult); }
        }
        for (let i = 0; i < extra; i++) {
          const random = Math.random();
          const targetParty = random < 0.3 ? uv.partyName : availableParties[Math.floor(Math.random() * availableParties.length)].partyName;
          let targetResult = category.results.find(r => r.partyName === targetParty);
          if (!targetResult) {
            const partyRow = availableParties.find(r => r.partyName === targetParty);
            if (partyRow) { targetResult = { partyId: partyRow.partyAbbr || targetParty, partyName: partyRow.partyName, partyColor: partyRow.partyColor, partySymbolUrl: partyRow.partySymbolUrl || '', photoUrl: isPresident ? partyRow.presidentialPhoto : null, votes: 0, percentage: 0, seats: 0 }; category.results.push(targetResult); }
          }
          if (targetResult) targetResult.votes += 1;
        }
      } else if (mode === 'proportional') {
        const currentResults = allResults.find(r => r.categoryId === targetCategoryId);
        if (currentResults && currentResults.results.length > 0) {
          const totalCurrentVotes = currentResults.results.reduce((sum, r) => sum + r.votes, 0);
          const weights = currentResults.results.map(r => ({ partyName: r.partyName, weight: totalCurrentVotes > 0 ? r.votes / totalCurrentVotes : 1 / currentResults.results.length }));
          const isPresident = targetCategoryId === 'president';
          let userPartyResult = category.results.find(r => r.partyName === uv.partyName);
          if (!userPartyResult) {
            const partyRow = isPresident ? presidentialRows.find(r => r.partyName === uv.partyName) : legislativeRows.find(r => r.partyName === uv.partyName);
            if (partyRow) { userPartyResult = { partyId: partyRow.partyAbbr || uv.partyName, partyName: partyRow.partyName, partyColor: partyRow.partyColor, partySymbolUrl: partyRow.partySymbolUrl || '', photoUrl: isPresident ? partyRow.presidentialPhoto : null, votes: 1, percentage: 0, seats: 0 }; category.results.push(userPartyResult); }
          }
          for (let i = 0; i < extra; i++) {
            const random = Math.random();
            let cumulativeWeight = 0;
            let selectedParty = weights[0]?.partyName || uv.partyName;
            for (const w of weights) { cumulativeWeight += w.weight; if (random <= cumulativeWeight) { selectedParty = w.partyName; break; } }
            let targetResult = category.results.find(r => r.partyName === selectedParty);
            if (!targetResult) {
              const sourceResult = currentResults.results.find(r => r.partyName === selectedParty);
              if (sourceResult) { targetResult = { partyId: sourceResult.partyId, partyName: sourceResult.partyName, partyColor: sourceResult.partyColor, partySymbolUrl: sourceResult.partySymbolUrl || '', photoUrl: sourceResult.photoUrl, votes: 0, percentage: 0, seats: 0 }; category.results.push(targetResult); }
            }
            if (targetResult) targetResult.votes += 1;
          }
        }
      }
      category.totalVotes = category.results.reduce((sum, r) => sum + r.votes, 0);
    }
    for (const category of cloned) {
      for (const result of category.results) { result.percentage = category.totalVotes > 0 ? (result.votes / category.totalVotes) * 100 : 0; }
      category.results.sort((a, b) => b.votes - a.votes);
      if (category.totalSeats > 1 && category.totalVotes > 0) {
        const minVotesForSeats = category.totalSeats * 10;
        if (category.totalVotes >= minVotesForSeats) {
          let remainingSeats = category.totalSeats;
          for (let i = 0; i < category.results.length && remainingSeats > 0; i++) {
            const result = category.results[i];
            if (result.votes > 0) { let seatCount = Math.max(1, Math.round((result.percentage / 100) * category.totalSeats)); seatCount = Math.min(seatCount, remainingSeats); result.seats = seatCount; remainingSeats -= seatCount; } else { result.seats = 0; }
          }
          const seatDistribution: Seat[] = [];
          category.results.forEach(result => { for (let i = 0; i < (result.seats || 0); i++) { seatDistribution.push({ partyColor: result.partyColor, partyName: result.partyName, partySymbolUrl: result.partySymbolUrl }); } });
          category.seatDistribution = seatDistribution;
        }
      }
    }
    return cloned;
  }

  let displayResults = $derived.by(() => {
    const multiplier = projectionMultiplier;
    const hasVotes = userVotes.length > 0;
    if (multiplier > 1 && hasVotes) return getProjectedResults(projectionMode);
    if (allResults.length === 0) return [];
    if (multiplier === 1) return allResults;
    return getProjectedResults(projectionMode);
  });

  let shareData = $derived<SharedResult[]>(
    displayResults.map(r => ({
      category: r.category,
      partyName: r.results[0]?.partyName || 'Sin datos',
      partyColor: r.results[0]?.partyColor || '#ccc',
      percentage: r.results[0]?.percentage || 0,
    }))
  );

  // ─── Actions ─────────────────────────────────────────────────────────────────
  async function startNewSimulation() {
    if (restarting) return;
    restarting = true;
    sessionStorage.setItem('entry_mode', 'new_simulation');
    vote.resetForNewSimulation();
    resetAllSelections();
    await new Promise(r => setTimeout(r, 300));
    goto('/simular');
  }

  function startCountdown() {
    electionCountdown = getCountdownToElection(new Date());
    countdownInterval = setInterval(() => {
      electionCountdown = getCountdownToElection(new Date());
    }, 1000);
  }

  // ─── Results loading ─────────────────────────────────────────────────────────
  async function loadRealResults(): Promise<CategoryResults[]> {
    if (!isFirebaseReady) initializeFirebase();
    const accumulatedSimulations = await getAccumulatedSimulations();
    const accumulatedResults     = await getAccumulatedResults();
    const resultsWithPercentages = await getAccumulatedResultsWithPercentages();
    const uVotes = Array.from(vote.votes.entries());
    const categories = [
      { id: 'president',        name: 'Presidente',      subtitle: 'y Vicepresidentes', totalSeats: 1,   colId: 'col0' },
      { id: 'senatorsNational', name: 'Senado nacional', subtitle: 'Nacionales',        totalSeats: 30,  colId: 'col1' },
      { id: 'senatorsRegional', name: 'Senado regional', subtitle: 'Regionales',        totalSeats: 30,  colId: 'col2' },
      { id: 'deputies',         name: 'Diputados',       subtitle: '130 puestos',       totalSeats: 130, colId: 'col3' },
      { id: 'andeanParliament', name: 'Parlamento Andino', subtitle: '',                totalSeats: 5,   colId: 'col4' },
    ];
    totalVoters = accumulatedSimulations || 0;
    const totalVoteCount = totalVoters;
    return categories.map(cat => {
      const userVoteForCat = uVotes.find(([colId]) => colId === cat.colId);
      const userPartyName  = userVoteForCat ? userVoteForCat[1].partyName : null;
      const accumulatedCatResults = accumulatedResults?.[cat.id];
      let realResults: Array<{partyId: string; count: number; percentage?: number}> = [];
      if (accumulatedCatResults && typeof accumulatedCatResults === 'object' && !Array.isArray(accumulatedCatResults)) {
        const entries = Object.entries(accumulatedCatResults);
        const totalCatVotes = entries.reduce((sum, [, count]) => sum + (count as number), 0);
        realResults = entries.map(([partyId, count]) => ({ partyId, count: count as number, percentage: totalCatVotes > 0 ? ((count as number) / totalCatVotes) * 100 : 0 })).sort((a, b) => b.count - a.count);
      } else if (resultsWithPercentages?.[cat.id]) {
        realResults = resultsWithPercentages[cat.id];
      }
      let parties: ElectionResult[];
      if (realResults.length === 0) {
        if (userPartyName && projectionMultiplier > 1) {
          const partyRow = cat.id === 'president' ? presidentialRows.find(r => r.partyName === userPartyName) : legislativeRows.find(r => r.partyName === userPartyName);
          parties = partyRow ? [{ partyId: partyRow.partyAbbr || userPartyName, partyName: partyRow.partyName, partyColor: partyRow.partyColor, partySymbolUrl: partyRow.partySymbolUrl || '', photoUrl: cat.id === 'president' ? partyRow.presidentialPhoto : null, votes: 1, percentage: 100, seats: 0 }] : [];
        } else { parties = []; }
      } else if (totalVoteCount < 5) {
        const totalCatVotes = realResults.reduce((sum, r) => sum + r.count, 0);
        if (cat.id === 'president') {
          parties = realResults.map(result => { const partyRow = presidentialRows.find(r => r.partyName === result.partyId || r.partyAbbr === result.partyId); return { partyId: result.partyId, partyName: partyRow?.partyName || result.partyId, partyColor: partyRow?.partyColor || '#666', partySymbolUrl: partyRow?.partySymbolUrl || '', photoUrl: partyRow?.presidentialPhoto || null, votes: result.count, percentage: totalCatVotes > 0 ? (result.count / totalCatVotes) * 100 : 0, seats: 0 }; }).sort((a, b) => b.votes - a.votes);
        } else {
          parties = realResults.map(result => { const partyRow = legislativeRows.find(r => r.partyName === result.partyId || r.partyAbbr === result.partyId); return { partyId: result.partyId, partyName: partyRow?.partyName || result.partyId, partyColor: partyRow?.partyColor || '#666', partySymbolUrl: partyRow?.partySymbolUrl || '', photoUrl: null, votes: result.count, percentage: totalCatVotes > 0 ? (result.count / totalCatVotes) * 100 : 0, seats: 0 }; }).sort((a, b) => b.votes - a.votes);
        }
      } else {
        const totalCatVotes = realResults.reduce((sum, r) => sum + r.count, 0);
        if (cat.id === 'president') {
          parties = realResults.slice(0, 3).map(result => { const partyRow = presidentialRows.find(r => r.partyName === result.partyId || r.partyAbbr === result.partyId); return { partyId: result.partyId, partyName: partyRow?.partyName || result.partyId, partyColor: partyRow?.partyColor || '#666', partySymbolUrl: partyRow?.partySymbolUrl || '', photoUrl: partyRow?.presidentialPhoto || null, votes: result.count, percentage: result.percentage || 0, seats: 0 }; });
        } else {
          const resultsMap = new Map(realResults.map(r => [r.partyId, r]));
          parties = legislativeRows.map(row => { const result = resultsMap.get(row.partyName) || resultsMap.get(row.partyAbbr); const voteCount = result?.count || 0; return { partyId: row.partyAbbr, partyName: row.partyName || '', partyColor: row.partyColor, partySymbolUrl: row.partySymbolUrl || '', photoUrl: null, votes: voteCount, percentage: totalCatVotes > 0 ? (voteCount / totalCatVotes) * 100 : 0, seats: 0 }; }).sort((a, b) => b.votes - a.votes);
          const minVotesForSeats = cat.totalSeats * 10;
          if (cat.totalSeats > 1 && totalCatVotes >= minVotesForSeats) {
            let remainingSeats = cat.totalSeats;
            parties = parties.map((p, i) => { let seatCount = 0; if (p.votes > 0 && remainingSeats > 0) { seatCount = Math.max(1, Math.round((p.percentage / 100) * cat.totalSeats)); seatCount = Math.min(seatCount, remainingSeats); remainingSeats -= seatCount; } return { ...p, seats: seatCount }; });
          }
          parties = parties.slice(0, 10);
        }
      }
      let seatDistribution: Seat[] = [];
      const totalVotesForSeats = parties.reduce((sum, r) => sum + r.votes, 0);
      if (cat.totalSeats > 1 && totalVotesForSeats >= cat.totalSeats * 10) {
        let remainingSeats = cat.totalSeats;
        parties.forEach(party => {
          if (party.votes > 0 && remainingSeats > 0) {
            const percentage = totalVotesForSeats > 0 ? (party.votes / totalVotesForSeats) * 100 : 0;
            let seatCount = Math.max(1, Math.round((percentage / 100) * cat.totalSeats));
            seatCount = Math.min(seatCount, remainingSeats);
            party.seats = seatCount;
            remainingSeats -= seatCount;
            for (let j = 0; j < seatCount; j++) { seatDistribution.push({ partyColor: party.partyColor, partyName: party.partyName, partySymbolUrl: party.partySymbolUrl }); }
          }
        });
      }
      return { category: cat.name, categoryId: cat.id, totalVotes: parties.reduce((sum, r) => sum + r.votes, 0), totalSeats: cat.totalSeats, results: parties, seatDistribution, userVote: userPartyName || undefined };
    });
  }

  // ─── Analysis ────────────────────────────────────────────────────────────────
  function hasAbsoluteMajority(results: ElectionResult[]): boolean {
    return results.length > 0 && results[0].percentage > 50;
  }

  function analyzeSeatConcentration(seatDistribution: Seat[], totalSeats: number): SimpleGovernance {
    if (seatDistribution.length === 0) {
      return { level: 'fragmented', label: 'Fragmentado', color: '#DC3545', description: 'Aún no hay suficientes datos.', microCopy: '' };
    }
    const partyCounts = new Map<string, number>();
    for (const seat of seatDistribution) { partyCounts.set(seat.partyName, (partyCounts.get(seat.partyName) || 0) + 1); }
    const sorted = Array.from(partyCounts.entries()).sort((a, b) => b[1] - a[1]);
    const [, dominantSeats] = sorted[0] || ['', 0];
    const concentration = (dominantSeats / totalSeats) * 100;
    const uniqueParties = sorted.length;
    if (concentration >= 40 && uniqueParties <= 3) {
      return { level: 'high', label: 'Alta coordinación', color: '#22c55e', description: 'Mayor concentración de puestos.', microCopy: 'Puede facilitar la coordinación entre el Ejecutivo y el Congreso.' };
    } else if (concentration >= 25 && uniqueParties <= 5) {
      return { level: 'balanced', label: 'Equilibrado', color: '#f59e0b', description: 'Puestos distribuidos entre varias fuerzas.', microCopy: 'Puede generar mayor debate y necesidad de acuerdos.' };
    } else {
      return { level: 'fragmented', label: 'Fragmentado', color: '#ef4444', description: 'Hemiciclo muy fragmentado.', microCopy: 'Cuando hay muchas fuerzas pequeñas, alcanzar consensos puede ser más complejo.' };
    }
  }

  function analyzeGlobalScenario(): GlobalScenario | null {
    if (displayResults.length === 0) return null;
    const presidentResults  = displayResults.find(r => r.categoryId === 'president');
    const senateNatResults  = displayResults.find(r => r.categoryId === 'senatorsNational');
    const senateRegResults  = displayResults.find(r => r.categoryId === 'senatorsRegional');
    const deputiesResults   = displayResults.find(r => r.categoryId === 'deputies');
    const topPresident  = presidentResults?.results[0]?.partyName;
    const topSenateNat  = senateNatResults?.results[0]?.partyName;
    const topSenateReg  = senateRegResults?.results[0]?.partyName;
    const topDeputies   = deputiesResults?.results[0]?.partyName;
    if (!topPresident || !topSenateNat || !topSenateReg || !topDeputies) return null;
    let alignmentPoints = 0;
    if (topPresident === topSenateNat) alignmentPoints++;
    if (topPresident === topSenateReg) alignmentPoints++;
    if (topPresident === topDeputies)  alignmentPoints++;
    if (topSenateNat === topSenateReg) alignmentPoints++;
    if (topSenateNat === topDeputies)  alignmentPoints++;
    if (topSenateReg === topDeputies)  alignmentPoints++;
    const allGroups = [presidentResults, senateNatResults, senateRegResults, deputiesResults].filter(Boolean) as CategoryResults[];
    const partyVotes = new Map<string, number>();
    let totalVotesGlobal = 0;
    allGroups.forEach(cat => { cat.results.forEach(r => { partyVotes.set(r.partyName, (partyVotes.get(r.partyName) || 0) + r.votes); totalVotesGlobal += r.votes; }); });
    let concentration = 0;
    if (totalVotesGlobal > 0) { partyVotes.forEach(votes => { const share = votes / totalVotesGlobal; concentration += share * share; }); }
    const fragmentation = 1 - concentration;
    let type: 'high' | 'balanced' | 'fragmented';
    let label: string, color: string, title: string, description: string;
    if (alignmentPoints >= 4 && fragmentation < 0.68) {
      type = 'high'; label = 'Alta coordinación'; color = '#22c55e';
      title = 'Escenario más coordinado';
      description = 'Las preferencias en presidencia y Congreso siguen una línea similar. Esto puede facilitar la coordinación política y hacer más ágil la implementación de propuestas.';
    } else if (alignmentPoints <= 1 || fragmentation >= 0.78) {
      type = 'fragmented'; label = 'Fragmentado'; color = '#ef4444';
      title = 'Escenario fragmentado';
      description = 'Las preferencias están muy dispersas entre varias fuerzas. Cuando el poder se reparte demasiado, alcanzar acuerdos puede ser más complejo.';
    } else {
      type = 'balanced'; label = 'Equilibrado'; color = '#f59e0b';
      title = 'Escenario equilibrado';
      description = 'Las decisiones están distribuidas entre distintas opciones. Puede generar mayor debate y control, aunque también requiere más acuerdos para avanzar.';
    }
    return { type, label, color, title, description, alignmentPoints, fragmentation };
  }

  let globalScenario = $derived(analyzeGlobalScenario());

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  onMount(async () => {
    // Hydrate vote store + preferencePicker from storage
    const savedVotes = sessionStorage.getItem('dailyvote');
    if (savedVotes && vote.count === 0) vote.hydrate(savedVotes);
    loadPreferencesFromStorage();

    // Restore projection preferences
    const savedMultiplier = sessionStorage.getItem('projection_multiplier');
    const savedMode = sessionStorage.getItem('projection_mode');
    if (savedMultiplier) projectionMultiplier = parseInt(savedMultiplier, 10);
    if (savedMode) projectionMode = savedMode as 'same' | 'random' | 'proportional';

    // Lift entry veil — 1200ms to satisfy the 800-1500ms blocking requirement
    setTimeout(() => { arriving = false; }, 1200);

    // Start countdown
    startCountdown();

    // Load Firebase results
    if (!isFirebaseReady) initializeFirebase();
    try {
      const loadedResults = await loadRealResults();
      allResults = loadedResults;
    } catch (err) {
      console.error('Error loading results:', err);
    } finally {
      isLoading = false;
    }

    // Subscribe to live updates
    if (isFirebaseReady) {
      const today = new Date().toISOString().split('T')[0];
      unsubscribe = subscribeToGlobalStats(today, async (stats: GlobalStats | null) => {
        if (stats) {
          liveVoterCount = stats.totalSimulations || Math.floor((stats.totalVotes || 0) / 5) || 0;
          lastUpdateTime = new Date();
          if (liveVoterCount > 0) {
            const accumulatedSimulations = await getAccumulatedSimulations();
            if (accumulatedSimulations > 0) {
              totalVoters = accumulatedSimulations;
              const newResults = await loadRealResults();
              allResults = newResults;
            }
          }
        }
      });
    }

    // IntersectionObserver — only for the protagonist flow (Senado nacional)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) startProtagonistFlow();
      });
    }, { threshold: 0.3 });

    setTimeout(() => {
      const el = document.querySelector('[data-protagonist-flow]');
      if (el) observer.observe(el);
    }, 800);

    return () => {
      observer.disconnect();
      if (countdownInterval) clearInterval(countdownInterval);
      if (unsubscribe) unsubscribe();
    };
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (countdownInterval) clearInterval(countdownInterval);
  });
</script>

<svelte:head>
  <title>Así se procesó tu voto — Simulación Electoral Perú 2026</title>
  <meta name="description" content="Ve cómo tu voto se transformó en resultados. Entiende la lógica de partido, valla y voto preferencial en las elecciones Perú 2026." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://lafechamasimportante.com/resultados" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://lafechamasimportante.com/resultados" />
  <meta property="og:title" content="Así se procesó tu voto — Elecciones Perú 2026" />
  <meta property="og:description" content="Ve cómo tu voto se transformó en resultados en la simulación electoral Perú 2026." />
  <meta property="og:image" content="https://lafechamasimportante.com/favicon.svg" />
  <meta property="og:locale" content="es_PE" />
  <meta property="twitter:card" content="summary" />
  <meta property="twitter:url" content="https://lafechamasimportante.com/resultados" />
  <meta property="twitter:title" content="Así se procesó tu voto — Elecciones Perú 2026" />
  <meta property="twitter:description" content="Ve cómo tu voto se transformó en resultados." />
  <meta property="twitter:image" content="https://lafechamasimportante.com/favicon.svg" />
</svelte:head>

<!-- ── Entry veil ─────────────────────────────────────────────────────────── -->
{#if arriving}
  <div class="arrival-veil" out:fade={{ duration: 600 }}>
    <div class="arrival-inner">
      <div class="arrival-check">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <p class="arrival-title">Tu voto fue registrado</p>
      <p class="arrival-sub">Preparando la simulación de resultados...</p>
    </div>
  </div>
{/if}

<!-- ── Page ───────────────────────────────────────────────────────────────── -->
<div class="res-page">

  <!-- ═══ SECCIÓN 2: HERO ══════════════════════════════════════════════════ -->
  <section class="hero-sect" in:fly={{ y: 28, duration: 700, delay: 500 }}>
    <p class="hero-eyebrow">Simulación electoral · Perú 2026</p>
    <h1 class="hero-title">Así se procesó tu voto</h1>
    <p class="hero-subtitle">Tu elección impactó en presidencia, partido y voto preferencial. Mira qué pasó paso a paso.</p>
  </section>

  <!-- ═══ SECCIÓN 3: TU SELECCIÓN ══════════════════════════════════════════ -->
  {#if hasUserVote}
    <section class="ballot-summary-sect" in:fly={{ y: 20, duration: 600, delay: 700 }}>
      <h2 class="section-label">Tu selección</h2>
      <div class="ballot-summary-grid">
        {#each userBallot as row}
          <div
            class="ballot-card"
            class:has-vote={!!row.selection}
            style="--party-color: {row.selection?.partyColor ?? '#334155'}"
          >
            <span class="bc-col-label">{row.label}</span>
            {#if row.selection}
              <div class="bc-party-row">
                <div class="bc-party-dot"></div>
                <span class="bc-party-name">{row.selection.partyName}</span>
              </div>
              {#if row.prefs.length > 0}
                <div class="bc-prefs">
                  {#each row.prefs as num}
                    <span class="pref-chip">N° {num}</span>
                  {/each}
                </div>
              {/if}
            {:else}
              <span class="bc-empty">Sin marcar</span>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ═══ SECCIÓN 4: QUÉ PASÓ CON TU VOTO ═════════════════════════════════ -->
  <section class="processing-sect">
    <div class="processing-header">
      <h2 class="section-label">Qué pasó con tu voto</h2>
      <p class="section-sub">Cada decisión en tu cédula sigue una lógica distinta. Aquí puedes ver cómo se procesa cada una.</p>
    </div>

    <!-- 4A — Presidencia -->
    <div class="proc-card pres-proc-card">
      <h3 class="proc-card-title">Presidencia</h3>
      <p class="proc-card-desc">Tu voto fue directo a esta candidatura presidencial.</p>
      {#if userBallot[0]?.selection}
        <div class="pres-selection-row">
          <div class="pres-dot" style="background: {userBallot[0].selection.partyColor}"></div>
          <span class="pres-party">{userBallot[0].selection.partyName}</span>
          <span class="direct-impact">+1 voto presidencial</span>
        </div>
      {:else}
        <p class="proc-no-vote">No registraste voto presidencial en esta simulación.</p>
      {/if}
    </div>

    <!-- 4B — Senado nacional: PROTAGONISTA con flujo animado secuencial -->
    {#if userBallot[1]}
      {@const senadoNac = userBallot[1]}
    <div class="proc-card leg-proc-card" data-protagonist-flow>
      <h3 class="proc-card-title">{senadoNac.label}</h3>

      {#if senadoNac.selection}
        <div class="flow-track-animated">

          {#if protagonistStep >= 1}
            <div class="fn" in:fly={{ y: 12, duration: 380 }}>
              <div class="fn-icon-wrap" style="border-color: {senadoNac.selection.partyColor}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:{senadoNac.selection.partyColor}"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <p class="fn-label">Tu voto</p>
              <p class="fn-desc">Tu voto sumó al partido que elegiste.</p>
              <span class="fn-tag" style="border-color:{senadoNac.selection.partyColor}25;background:{senadoNac.selection.partyColor}12;color:{senadoNac.selection.partyColor}">{senadoNac.selection.partyName}</span>
            </div>
          {/if}

          {#if protagonistStep >= 2}
            <div class="fn-arrow" in:fade={{ duration: 220 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div class="fn" in:fly={{ y: 12, duration: 380 }}>
              <div class="fn-icon-wrap fi-partido">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <p class="fn-label">Partido</p>
              <p class="fn-desc">Si el partido pasa la valla y obtiene puestos, entra en la distribución.</p>
            </div>
          {/if}

          {#if protagonistStep >= 3}
            <div class="fn-arrow" in:fade={{ duration: 220 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div class="fn" in:fly={{ y: 12, duration: 380 }}>
              <div class="fn-icon-wrap fi-puestos">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </div>
              <p class="fn-label">Puestos</p>
              <p class="fn-desc">Los puestos dependen de cuántos votos obtiene el partido.</p>
            </div>
          {/if}

          {#if protagonistStep >= 4}
            <div class="fn-arrow" in:fade={{ duration: 220 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
            <div class="fn" in:fly={{ y: 12, duration: 380 }}>
              <div class="fn-icon-wrap fi-candidatos">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <p class="fn-label">Candidatos</p>
              <p class="fn-desc">Si marcaste números preferenciales, esos números ayudan a definir qué candidatos entran dentro del partido.</p>
              {#if senadoNac.prefs.length > 0}
                <div class="fn-prefs-row">
                  {#each senadoNac.prefs as num}<span class="fn-pref-num">N° {num}</span>{/each}
                </div>
                <p class="fn-pref-note">Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos entran dentro del partido.</p>
              {:else}
                <span class="fn-no-pref">Sin voto preferencial</span>
              {/if}
            </div>
          {/if}

        </div>
      {:else}
        <p class="proc-no-vote">No realizaste una selección en esta sección.</p>
      {/if}
    </div>
    {/if}

    <!-- 4C — Secciones colapsadas: misma lógica, sin repetir explicación -->
    {#each userBallot.slice(2) as col}
      <div class="bloque-resumen">
        <h3 class="proc-card-title">{col.label}</h3>
        {#if col.selection}
          <div class="resumen-partido" style="--party-color: {col.selection.partyColor}">
            <div class="resumen-dot"></div>
            <span class="resumen-name">{col.selection.partyName}</span>
            {#if col.prefs.length > 0}
              <div class="bc-prefs">
                {#each col.prefs as num}<span class="pref-chip">N° {num}</span>{/each}
              </div>
            {/if}
          </div>
          <p class="resumen-logic">Tu voto sigue la misma lógica: suma al partido y, si hay preferenciales, define qué candidatos entran.</p>
        {:else}
          <p class="proc-no-vote">No realizaste una selección en esta sección.</p>
        {/if}
      </div>
    {/each}
  </section>

  <!-- ═══ SECCIÓN 5: RESULTADOS POR CARGO ══════════════════════════════════ -->
  <section class="results-sect">
    <div class="results-sect-header">
      <h2 class="section-label">Así se vería la distribución de puestos</h2>
      <p class="section-sub">Esta distribución muestra cómo se reparte el poder entre los partidos según los votos acumulados.</p>
    </div>

    {#if projectionMultiplier > 1}
      <div class="proj-active-banner">
        Proyección activa: {projectionMultiplier.toLocaleString()} personas · modo "{projectionModes.find(m => m.id === projectionMode)?.label}"
      </div>
    {/if}

    {#if isLoading}
      <div class="results-loading-state">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <p>Cargando resultados acumulados...</p>
      </div>
    {:else if displayResults.length === 0}
      <div class="results-empty-state">
        <p>Aún no hay simulaciones suficientes para mostrar distribución.</p>
        <p class="results-empty-hint">Comparte esta simulación para sumar más participación.</p>
      </div>
    {:else}
      <!-- Presidential -->
      {@const presResults = displayResults.find(r => r.categoryId === 'president')}
      {#if presResults && presResults.results.length > 0}
        <div class="result-block">
          <h3 class="result-block-title">Presidencia</h3>
          <div class="pres-results">
            {#each presResults.results as r, i}
              {@const isUserVote = userBallot[0]?.selection?.partyName === r.partyName}
              <div class="pres-row" class:is-first={i === 0} class:is-user={isUserVote}>
                <span class="pres-rank">{i + 1}°</span>
                <div class="pres-color-mark" style="background: {r.partyColor}"></div>
                <span class="pres-name">{r.partyName}</span>
                <div class="pres-bar-track">
                  <div class="pres-bar-fill" style="width: {Math.max(r.percentage, 1)}%; background: {r.partyColor}"></div>
                </div>
                <span class="pres-pct">{r.percentage.toFixed(1)}%</span>
                {#if isUserVote}<span class="your-vote-badge">Tu voto</span>{/if}
              </div>
            {/each}
          </div>
          {#if presResults.results.length > 0 && !hasAbsoluteMajority(presResults.results)}
            <p class="runoff-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Ningún candidato supera el 50%. En la elección real habría segunda vuelta.
            </p>
          {/if}
        </div>
      {/if}

      <!-- Senado nacional: detalle completo -->
      {#each displayResults.filter(r => r.categoryId === 'senatorsNational') as cat}
        {@const catDef = BALLOT_DEF.find(d => d.catId === cat.categoryId)}
        {@const userVoteForCat = catDef ? userBallot.find(b => b.colId === catDef.colId) : null}
        <div class="result-block">
          <h3 class="result-block-title">{catDef?.label ?? cat.category}</h3>
          <div class="party-results">
            {#each cat.results.filter(r => r.votes > 0).slice(0, 5) as r}
              {@const isUserVote = userVoteForCat?.selection?.partyName === r.partyName}
              <div class="party-row" class:is-user={isUserVote}>
                <div class="party-color-dot" style="background: {r.partyColor}"></div>
                <span class="party-name">{r.partyName}</span>
                <div class="party-bar-track">
                  <div class="party-bar-fill" style="width: {Math.max(r.percentage, 0.5)}%; background: {r.partyColor}"></div>
                </div>
                <span class="party-pct">{r.percentage.toFixed(1)}%</span>
                {#if r.seats}<span class="party-seats">{r.seats} pt.</span>{/if}
                {#if isUserVote}<span class="your-vote-badge">Tu voto</span>{/if}
              </div>
            {/each}
          </div>
          {#if cat.seatDistribution.length === 0 && cat.totalVotes < cat.totalSeats * 10}
            <p class="seats-pending-note">Los puestos se calcularán cuando haya más simulaciones.</p>
          {/if}
        </div>
      {/each}

      <!-- Resto de categorías legislativas: versión resumida -->
      {#each displayResults.filter(r => r.categoryId !== 'president' && r.categoryId !== 'senatorsNational') as cat}
        {@const catDef = BALLOT_DEF.find(d => d.catId === cat.categoryId)}
        {@const userVoteForCat = catDef ? userBallot.find(b => b.colId === catDef.colId) : null}
        {@const userResult = userVoteForCat?.selection ? cat.results.find(r => r.partyName === userVoteForCat.selection?.partyName) : null}
        <div class="result-block-mini">
          <h3 class="result-mini-title">{catDef?.label ?? cat.category}</h3>
          {#if userVoteForCat?.selection}
            <div class="result-mini-row">
              <div class="party-color-dot" style="background: {userVoteForCat.selection.partyColor}"></div>
              <span class="result-mini-party">{userVoteForCat.selection.partyName}</span>
              {#if userResult?.seats}<span class="party-seats">{userResult.seats} pt.</span>{/if}
              <span class="your-vote-badge">Tu voto</span>
            </div>
          {:else}
            <p class="proc-no-vote">Sin selección.</p>
          {/if}
        </div>
      {/each}
    {/if}
  </section>

  <!-- ═══ SECCIÓN 6: QUÉ SIGNIFICA ESTE ESCENARIO ══════════════════════════ -->
  {#if globalScenario && !isLoading}
    <section class="scenario-sect" in:fade={{ duration: 400 }}>
      <h2 class="section-label">Qué significa este escenario</h2>
      <div class="scenario-card" style="--sc-color: {globalScenario.color}">
        <h3 class="scenario-title">{globalScenario.title}</h3>
        <p class="scenario-desc">{globalScenario.description}</p>
      </div>
    </section>
  {/if}

  <!-- ═══ SECCIÓN 7: EXPLORAR ESCENARIOS ═══════════════════════════════════ -->
  <section class="projection-sect">
    <div class="projection-header">
      <h2 class="section-label">¿Qué pasaría si más personas votaran parecido a ti?</h2>
      <p class="section-sub">Explora cómo cambiarían los resultados si más personas tomaran decisiones similares en toda la cédula.</p>
    </div>

    {#if hasUserVote}
      <div class="proj-modes">
        {#each projectionModes as mode}
          <button
            class="proj-mode-btn"
            class:active={projectionMode === mode.id}
            onclick={() => projectionMode = mode.id}
          >
            <span class="proj-mode-icon">{mode.icon}</span>
            <span class="proj-mode-label">{mode.label}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="proj-no-votes">
        <p>Completa una simulación para explorar cómo tu voto afectaría los resultados.</p>
        <a class="proj-cta-link" href="/simular">Ir a la cédula →</a>
      </div>
    {/if}
  </section>

  <!-- ═══ SECCIÓN 8: CTA ════════════════════════════════════════════════════ -->
  <section class="restart-sect">
    <div class="restart-card">
      <div class="restart-left">
        <h3 class="restart-title">Probar otra combinación</h3>
        <p class="restart-desc">Vuelve a la cédula y mira cómo cambian los resultados según tus decisiones.</p>
      </div>
      <button
        class="restart-btn"
        onclick={startNewSimulation}
        disabled={restarting}
      >
        {restarting ? 'Preparando...' : 'Probar otra combinación'}
      </button>
    </div>
  </section>

  <HelpPanel isOpen={showHelpPanel} onClose={() => showHelpPanel = false} />

</div>

<style>
  /* ─────────────────────────────────────────────────────────────────────────
     Base
  ───────────────────────────────────────────────────────────────────────── */
  :global(body) {
    background: #0b1220;
    color: #e2e8f0;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .res-page {
    max-width: 860px;
    margin: 0 auto;
    padding: 0 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Entry veil
  ───────────────────────────────────────────────────────────────────────── */
  .arrival-veil {
    position: fixed;
    inset: 0;
    background: #0b1220;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arrival-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }

  .arrival-check {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arrival-title {
    font-size: 20px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }

  .arrival-sub {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Section primitives
  ───────────────────────────────────────────────────────────────────────── */
  .section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #C8102E;
    margin: 0 0 8px;
  }

  .section-sub {
    font-size: 15px;
    color: #94a3b8;
    line-height: 1.6;
    margin: 0 0 28px;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Hero
  ───────────────────────────────────────────────────────────────────────── */
  .hero-sect {
    padding-top: 48px;
  }

  .hero-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #475569;
    margin: 0 0 12px;
  }

  .hero-title {
    font-size: clamp(28px, 5vw, 44px);
    font-weight: 800;
    color: #f8fafc;
    line-height: 1.15;
    margin: 0 0 14px;
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    font-size: 17px;
    color: #94a3b8;
    line-height: 1.65;
    margin: 0 0 28px;
    max-width: 560px;
  }


  /* ─────────────────────────────────────────────────────────────────────────
     Ballot summary
  ───────────────────────────────────────────────────────────────────────── */
  .ballot-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }

  .ballot-card {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s;
  }

  .ballot-card.has-vote {
    border-color: color-mix(in srgb, var(--party-color) 35%, transparent);
  }

  .bc-col-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #475569;
  }

  .bc-party-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .bc-party-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--party-color);
    flex-shrink: 0;
  }

  .bc-party-name {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.3;
  }

  .bc-prefs {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 2px;
  }

  .pref-chip {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    background: rgba(200, 16, 46, 0.12);
    border: 1px solid rgba(200, 16, 46, 0.25);
    border-radius: 99px;
    color: #f87171;
  }

  .bc-empty {
    font-size: 12px;
    color: #334155;
    font-style: italic;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Processing section
  ───────────────────────────────────────────────────────────────────────── */
  .processing-sect {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .processing-header {
    margin-bottom: 4px;
  }

  .proc-card {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 24px;
  }

  .proc-card-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }

  .proc-card-title {
    font-size: 16px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }

  .proc-type-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid;
  }

  .proc-type-badge.direct {
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.08);
  }

  .proc-type-badge.preferential {
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.3);
    background: rgba(245, 158, 11, 0.08);
  }

  .proc-card-desc {
    font-size: 14px;
    color: #94a3b8;
    margin: 0 0 16px;
    line-height: 1.6;
  }

  .proc-steps-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #334155;
    margin: 0 0 20px;
  }

  /* Presidential card */
  .pres-selection-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
  }

  .pres-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .pres-party {
    font-size: 15px;
    font-weight: 600;
    color: #e2e8f0;
    flex: 1;
  }

  .direct-impact {
    font-size: 11px;
    color: #22c55e;
    font-weight: 600;
  }

  .proc-no-vote {
    font-size: 13px;
    color: #334155;
    font-style: italic;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Flow track (protagonist — Senado nacional)
  ───────────────────────────────────────────────────────────────────────── */
  .flow-track-animated {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Collapsed summary blocks (other legislative columns)
  ───────────────────────────────────────────────────────────────────────── */
  .bloque-resumen {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .resumen-partido {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .resumen-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--party-color);
    flex-shrink: 0;
  }

  .resumen-name {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .resumen-logic {
    font-size: 12px;
    color: #475569;
    line-height: 1.55;
    margin: 0;
  }

  .fn {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .fn-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #1e293b;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .fi-partido  { border-color: rgba(99, 102, 241, 0.3); color: #818cf8; }
  .fi-puestos  { border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; }
  .fi-candidatos { border-color: rgba(34, 197, 94, 0.3); color: #4ade80; }

  .fn-label {
    font-size: 12px;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0;
  }

  .fn-desc {
    font-size: 11px;
    color: #64748b;
    line-height: 1.55;
    margin: 0;
  }

  .fn-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid;
    margin-top: 2px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fn-tag.no-vote {
    color: #334155;
    border-color: #1e293b;
    background: transparent;
  }

  .fn-prefs-row {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .fn-pref-num {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    background: rgba(200, 16, 46, 0.12);
    border: 1px solid rgba(200, 16, 46, 0.25);
    border-radius: 99px;
    color: #f87171;
  }

  .fn-no-pref {
    font-size: 10px;
    color: #334155;
    font-style: italic;
    margin-top: 2px;
  }

  .fn-pref-note {
    font-size: 10px;
    color: #64748b;
    line-height: 1.55;
    margin: 4px 0 0;
    padding: 6px 8px;
    background: rgba(200, 16, 46, 0.06);
    border-left: 2px solid rgba(200, 16, 46, 0.3);
    border-radius: 0 4px 4px 0;
  }

  .fn-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #334155;
    padding-top: 18px;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Results section
  ───────────────────────────────────────────────────────────────────────── */
  .results-sect {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .results-sect-header {
    margin-bottom: -8px;
  }

  .proj-active-banner {
    font-size: 12px;
    font-weight: 600;
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: 8px;
    padding: 8px 14px;
  }

  .results-loading-state,
  .results-empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #475569;
    font-size: 14px;
    line-height: 1.7;
  }

  .loading-dots {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-bottom: 12px;
  }

  .loading-dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #334155;
    animation: dot-pulse 1.4s ease-in-out infinite;
  }

  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dot-pulse {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  .results-empty-hint {
    font-size: 12px;
    color: #334155;
    margin-top: 6px;
  }

  .result-block {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .result-block-head {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: space-between;
  }

  .result-block-title {
    font-size: 15px;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0;
  }

  .gov-badge {
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid;
    letter-spacing: 0.04em;
  }

  /* Presidential results */
  .pres-results {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pres-row {
    display: grid;
    grid-template-columns: 24px 12px 1fr 100px 52px auto;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    background: #0f172a;
    border: 1px solid #1e293b;
    transition: border-color 0.15s;
  }

  .pres-row.is-user {
    border-color: rgba(200, 16, 46, 0.3);
    background: rgba(200, 16, 46, 0.04);
  }

  .pres-rank {
    font-size: 12px;
    font-weight: 700;
    color: #475569;
  }

  .pres-color-mark {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .pres-name {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pres-bar-track {
    height: 6px;
    background: #1e293b;
    border-radius: 99px;
    overflow: hidden;
  }

  .pres-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.8s ease;
    min-width: 2px;
  }

  .pres-pct {
    font-size: 13px;
    font-weight: 700;
    color: #cbd5e1;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .runoff-note {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #64748b;
    margin: 0;
    padding: 8px 12px;
    background: rgba(100, 116, 139, 0.06);
    border-radius: 6px;
    border: 1px solid #1e293b;
  }

  /* Party results (legislative) */
  .party-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .party-row {
    display: grid;
    grid-template-columns: 10px 1fr 80px 46px 40px auto;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 7px;
    background: #0f172a;
    border: 1px solid transparent;
    transition: border-color 0.15s;
  }

  .party-row.is-user {
    border-color: rgba(200, 16, 46, 0.25);
    background: rgba(200, 16, 46, 0.04);
  }

  .party-color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .party-name {
    font-size: 12px;
    font-weight: 600;
    color: #cbd5e1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .party-bar-track {
    height: 5px;
    background: #1e293b;
    border-radius: 99px;
    overflow: hidden;
  }

  .party-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.8s ease;
    min-width: 2px;
  }

  .party-pct {
    font-size: 12px;
    font-weight: 700;
    color: #94a3b8;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .party-seats {
    font-size: 11px;
    color: #475569;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .your-vote-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 99px;
    background: rgba(200, 16, 46, 0.14);
    border: 1px solid rgba(200, 16, 46, 0.3);
    color: #f87171;
    white-space: nowrap;
  }

  .seats-pending-note {
    font-size: 12px;
    color: #334155;
    font-style: italic;
    margin: 0;
    text-align: center;
    padding: 8px 0;
  }

  /* Mini result blocks (Senado regional, Diputados, Parlamento Andino) */
  .result-block-mini {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .result-mini-title {
    font-size: 13px;
    font-weight: 700;
    color: #64748b;
    margin: 0;
    min-width: 120px;
  }

  .result-mini-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .result-mini-party {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Scenario section
  ───────────────────────────────────────────────────────────────────────── */
  .scenario-card {
    background: #111827;
    border: 1px solid color-mix(in srgb, var(--sc-color) 20%, transparent);
    border-radius: 12px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .scenario-badge-row {
    display: flex;
  }

  .scenario-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid;
  }

  .scenario-title {
    font-size: 18px;
    font-weight: 800;
    color: #f1f5f9;
    margin: 0;
  }

  .scenario-desc {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.65;
    margin: 0;
  }

  .scenario-insight {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 14px;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
    color: #64748b;
  }

  .scenario-insight p {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  .scenario-insight svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #475569;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Projection section
  ───────────────────────────────────────────────────────────────────────── */
  .projection-sect {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .projection-header {
    margin-bottom: 0;
  }

  .proj-modes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  .proj-mode-btn {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 5px;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    font-family: inherit;
  }

  .proj-mode-btn:hover {
    border-color: #334155;
    background: #1a2332;
  }

  .proj-mode-btn.active {
    border-color: rgba(200, 16, 46, 0.4);
    background: rgba(200, 16, 46, 0.06);
  }

  .proj-mode-icon {
    font-size: 18px;
    line-height: 1;
  }

  .proj-mode-label {
    font-size: 12px;
    font-weight: 700;
    color: #e2e8f0;
  }

  .proj-no-votes {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px 20px;
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 12px;
    text-align: center;
  }

  .proj-no-votes p {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .proj-cta-link {
    font-size: 13px;
    font-weight: 700;
    color: #C8102E;
    text-decoration: none;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Restart CTA
  ───────────────────────────────────────────────────────────────────────── */
  .restart-sect {
    padding-bottom: 24px;
  }

  .restart-card {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 28px 28px;
    display: flex;
    align-items: center;
    gap: 24px;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .restart-left {
    flex: 1;
    min-width: 200px;
  }

  .restart-title {
    font-size: 17px;
    font-weight: 800;
    color: #f1f5f9;
    margin: 0 0 6px;
  }

  .restart-desc {
    font-size: 13px;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }

  .restart-actions {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }

  .restart-btn {
    padding: 12px 22px;
    background: #C8102E;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .restart-btn:hover:not(:disabled) {
    background: #a50d26;
  }

  .restart-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .share-btn {
    padding: 12px 22px;
    background: transparent;
    border: 1px solid #334155;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    font-family: inherit;
  }

  .share-btn:hover {
    border-color: #475569;
    color: #e2e8f0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Responsive
  ───────────────────────────────────────────────────────────────────────── */
  @media (max-width: 700px) {
    .res-page {
      gap: 40px;
      padding: 0 16px 80px;
    }

    .hero-sect {
      padding-top: 32px;
    }

    .ballot-summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    /* Flow: vertical on mobile */
    .flow-track-animated {
      flex-direction: column;
      gap: 4px;
    }

    .fn-arrow {
      padding-top: 0;
      transform: rotate(90deg);
      height: 24px;
    }

    .pres-row {
      grid-template-columns: 24px 10px 1fr 60px 46px;
    }

    .party-row {
      grid-template-columns: 10px 1fr 50px 42px;
    }

    .party-seats,
    .your-vote-badge {
      display: none;
    }

    .pres-row .your-vote-badge {
      display: none;
    }

    .proj-modes {
      grid-template-columns: 1fr;
    }

    .restart-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      padding: 20px;
    }

    .restart-actions {
      width: 100%;
      flex-direction: column;
    }

    .restart-btn,
    .share-btn {
      width: 100%;
      text-align: center;
    }
  }

  @media (max-width: 420px) {
    .ballot-summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
