<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { vote } from '$lib/stores/vote.svelte';
  import { resetAllSelections } from '$lib/stores/preferencePicker.svelte';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import ParliamentHemicycle from '$lib/components/ParliamentHemicycle.svelte';
  import ShareResults from '$lib/components/ShareResults.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  import { getAccumulatedResultsWithPercentages, getAccumulatedSimulations, getAccumulatedResults, subscribeToGlobalStats } from '$lib/firebase/stats';
  import { initializeFirebase, isFirebaseReady, getVotingStatus, ELECTION_DAY_TARGET, getCountdownToElection, formatCountdown, canStillSimulate } from '$lib/firebase';
  import type { GlobalStats } from '$lib/firebase/config';
  import type { Unsubscribe } from 'firebase/firestore';
  
  // State for help panel
  let showHelpPanel = $state(false);
  
  // Get party data from BALLOT_COLUMNS
  const presidentialRows = BALLOT_COLUMNS[0].rows.filter(r => r.partyName);
  const legislativeRows = BALLOT_COLUMNS[1].rows.filter(r => r.partyName);
  
  // Types
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
    seatDistribution: Seat[]; // Individual seats for hemicycle
    userVote?: string;
  }
  
  interface SharedResult {
    category: string;
    partyName: string;
    partyColor: string;
    percentage: number;
  }
  
  // State
  let allResults = $state<CategoryResults[]>([]);
  let votingStatus = $state<'open' | 'closed'>('open');
  let currentTime = $state(new Date());
  let activeCategory = $state<string | null>(null);
  let showConfetti = $state(false);
  let showShareModal = $state(false);
  let isLoading = $state(true);
  let totalVoters = $state(0);
  let liveVoterCount = $state(0); // Contador en vivo
  let lastUpdateTime = $state<Date | null>(null);
  let unsubscribe: Unsubscribe | null = null;
  let restarting = $state(false);
  
  // Countdown to election day (April 12, 2026 07:00 AM)
  let electionCountdown = $state(getCountdownToElection(new Date()));
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  
  // ─── Proyección de simulación ────────────────────────────────────────────────
  let projectionMultiplier = $state(1);
  let projectionMode = $state<'same' | 'random' | 'proportional'>('same');
  
  // Options for projection
  const projectionOptions = [
    { label: 'Solo tú (x1)', value: 1 },
    { label: '10 personas', value: 10 },
    { label: '100 personas', value: 100 },
    { label: '1,000 personas', value: 1000 },
    { label: '10,000 personas', value: 10000 }
  ];
  
  const projectionModes = [
    { 
      id: 'same' as const, 
      label: 'Igual que tú', 
      icon: '👥',
      description: 'Todos votan exactamente como tú'
    },
    { 
      id: 'random' as const, 
      label: 'Distribución aleatoria', 
      icon: '🎲',
      description: 'Votos distribuidos al azar entre partidos'
    },
    { 
      id: 'proportional' as const, 
      label: 'Proporcional a resultados', 
      icon: '📊',
      description: 'Votos distribuidos según tendencias actuales'
    }
  ];
  
  // Load saved projection from sessionStorage and hydrate vote store
  onMount(() => {
    const savedMultiplier = sessionStorage.getItem('projection_multiplier');
    const savedMode = sessionStorage.getItem('projection_mode');
    if (savedMultiplier) {
      projectionMultiplier = parseInt(savedMultiplier, 10);
    }
    if (savedMode) {
      projectionMode = savedMode as 'same' | 'random' | 'proportional';
    }
    
    // Hydrate vote store from sessionStorage so projection card shows on reload
    const savedVotes = sessionStorage.getItem('dailyvote');
    if (savedVotes && vote.count === 0) {
      vote.hydrate(savedVotes);
    }
  });
  
  // Save projection to sessionStorage when changed
  $effect(() => {
    sessionStorage.setItem('projection_multiplier', projectionMultiplier.toString());
    sessionStorage.setItem('projection_mode', projectionMode);
  });
  
  function getHypotheticalExtra(multiplier: number) {
    return Math.max(0, multiplier - 1);
  }
  
  // Get user's current votes from store
  let userVotes = $derived(Array.from(vote.votes.entries()).map(([colId, voteData]) => ({
    colId,
    partyName: voteData.partyName,
    category: voteData.columnId
  })));
  
  // Calculate projected results with different distribution modes
  function getProjectedResults(mode: 'same' | 'random' | 'proportional' = projectionMode) {
    console.log('🔧 getProjectedResults llamado. Multiplier:', projectionMultiplier, 'Mode:', mode);
    
    if (projectionMultiplier === 1) {
      console.log('↩️ Multiplier=1, retornando allResults sin cambios');
      return allResults;
    }
    
    const extra = getHypotheticalExtra(projectionMultiplier);
    console.log('➕ Extra a agregar:', extra);
    console.log('👤 User votes:', userVotes);
    
    // Mapeo de colId a categoryId
    const colIdToCategoryId: Record<string, string> = {
      'col0': 'president',
      'col1': 'senatorsNational',
      'col2': 'senatorsRegional',
      'col3': 'deputies',
      'col4': 'andeanParliament'
    };
    
    const categoryInfo: Record<string, { name: string; totalSeats: number }> = {
      'president': { name: 'Presidente', totalSeats: 1 },
      'senatorsNational': { name: 'Senadores', totalSeats: 30 },
      'senatorsRegional': { name: 'Senadores', totalSeats: 30 },
      'deputies': { name: 'Diputados', totalSeats: 130 },
      'andeanParliament': { name: 'Parlamento Andino', totalSeats: 5 }
    };
    
    // Start with existing results or create empty array
    let cloned: CategoryResults[] = allResults.length > 0 
      ? JSON.parse(JSON.stringify(allResults))
      : [];
    
    console.log('📊 Categorías disponibles:', cloned.map(c => ({ categoryId: c.categoryId, category: c.category })));
    
    // Get all available parties for random distribution
    const allParties = [...presidentialRows, ...legislativeRows].filter(r => r.partyName);
    
    // Apply extra votes based on mode
    for (const userVote of userVotes) {
      const targetCategoryId = colIdToCategoryId[userVote.colId];
      console.log('🔍 Procesando categoría:', { colId: userVote.colId, targetCategoryId, mode });
      
      let category = cloned.find(c => c.categoryId === targetCategoryId);
      
      // If category doesn't exist in results, create it
      if (!category && targetCategoryId) {
        console.log('🆕 Creando nueva categoría:', targetCategoryId);
        const info = categoryInfo[targetCategoryId];
        category = {
          category: info.name,
          categoryId: targetCategoryId,
          totalVotes: 0,
          totalSeats: info.totalSeats,
          results: [],
          seatDistribution: [],
          userVote: userVote.partyName
        };
        cloned.push(category);
      }
      
      if (category) {
        console.log('✅ Categoría encontrada/creada:', category.category);
        
        // MODE 1: Same as user - add all extra votes to user's party
        if (mode === 'same') {
          let result = category.results.find(r => r.partyName === userVote.partyName);
          
          if (!result) {
            console.log('🆕 Creando resultado para:', userVote.partyName);
            const isPresident = targetCategoryId === 'president';
            const partyRow = isPresident
              ? presidentialRows.find(r => r.partyName === userVote.partyName)
              : legislativeRows.find(r => r.partyName === userVote.partyName);
            
            if (partyRow) {
              result = {
                partyId: partyRow.partyAbbr || userVote.partyName,
                partyName: partyRow.partyName,
                partyColor: partyRow.partyColor,
                partySymbolUrl: partyRow.partySymbolUrl || '',
                photoUrl: isPresident ? partyRow.presidentialPhoto : null,
                votes: 1,
                percentage: 0,
                seats: 0
              };
              category.results.push(result);
            }
          }
          
          if (result) {
            console.log(`🎯 Modo SAME: Agregando ${extra} votos a ${userVote.partyName}`);
            result.votes += extra;
          }
        }
        
        // MODE 2: Random distribution
        else if (mode === 'random') {
          console.log(`🎲 Modo RANDOM: Distribuyendo ${extra} votos al azar`);
          
          // Get available parties for this category
          const isPresident = targetCategoryId === 'president';
          const availableParties = isPresident 
            ? presidentialRows.filter(r => r.partyName)
            : legislativeRows.filter(r => r.partyName);
          
          // Ensure user's party exists
          let userPartyResult = category.results.find(r => r.partyName === userVote.partyName);
          if (!userPartyResult) {
            const partyRow = availableParties.find(r => r.partyName === userVote.partyName);
            if (partyRow) {
              userPartyResult = {
                partyId: partyRow.partyAbbr || userVote.partyName,
                partyName: partyRow.partyName,
                partyColor: partyRow.partyColor,
                partySymbolUrl: partyRow.partySymbolUrl || '',
                photoUrl: isPresident ? partyRow.presidentialPhoto : null,
                votes: 1,
                percentage: 0,
                seats: 0
              };
              category.results.push(userPartyResult);
            }
          }
          
          // Distribute extra votes randomly
          // Give more weight to user's party (30% chance) vs others
          for (let i = 0; i < extra; i++) {
            const random = Math.random();
            let targetParty;
            
            if (random < 0.3) {
              // 30% chance: user's party
              targetParty = userVote.partyName;
            } else {
              // 70% chance: random party from available
              const randomIndex = Math.floor(Math.random() * availableParties.length);
              targetParty = availableParties[randomIndex].partyName;
            }
            
            let targetResult = category.results.find(r => r.partyName === targetParty);
            if (!targetResult) {
              const partyRow = availableParties.find(r => r.partyName === targetParty);
              if (partyRow) {
                targetResult = {
                  partyId: partyRow.partyAbbr || targetParty,
                  partyName: partyRow.partyName,
                  partyColor: partyRow.partyColor,
                  partySymbolUrl: partyRow.partySymbolUrl || '',
                  photoUrl: isPresident ? partyRow.presidentialPhoto : null,
                  votes: 0,
                  percentage: 0,
                  seats: 0
                };
                category.results.push(targetResult);
              }
            }
            
            if (targetResult) {
              targetResult.votes += 1;
            }
          }
        }
        
        // MODE 3: Proportional to current results
        else if (mode === 'proportional') {
          console.log(`📊 Modo PROPORTIONAL: Distribuyendo ${extra} votos según tendencias`);
          
          // Get current distribution from real results
          const currentResults = allResults.find(r => r.categoryId === targetCategoryId);
          
          if (currentResults && currentResults.results.length > 0) {
            // Calculate weights based on current percentages
            const totalCurrentVotes = currentResults.results.reduce((sum, r) => sum + r.votes, 0);
            const weights = currentResults.results.map(r => ({
              partyName: r.partyName,
              weight: totalCurrentVotes > 0 ? r.votes / totalCurrentVotes : 1 / currentResults.results.length
            }));
            
            // Ensure user's party exists
            let userPartyResult = category.results.find(r => r.partyName === userVote.partyName);
            if (!userPartyResult) {
              const isPresident = targetCategoryId === 'president';
              const partyRow = isPresident
                ? presidentialRows.find(r => r.partyName === userVote.partyName)
                : legislativeRows.find(r => r.partyName === userVote.partyName);
              
              if (partyRow) {
                userPartyResult = {
                  partyId: partyRow.partyAbbr || userVote.partyName,
                  partyName: partyRow.partyName,
                  partyColor: partyRow.partyColor,
                  partySymbolUrl: partyRow.partySymbolUrl || '',
                  photoUrl: isPresident ? partyRow.presidentialPhoto : null,
                  votes: 1,
                  percentage: 0,
                  seats: 0
                };
                category.results.push(userPartyResult);
              }
            }
            
            // Distribute extra votes proportionally
            for (let i = 0; i < extra; i++) {
              const random = Math.random();
              let cumulativeWeight = 0;
              let selectedParty = weights[0]?.partyName || userVote.partyName;
              
              for (const w of weights) {
                cumulativeWeight += w.weight;
                if (random <= cumulativeWeight) {
                  selectedParty = w.partyName;
                  break;
                }
              }
              
              let targetResult = category.results.find(r => r.partyName === selectedParty);
              if (!targetResult) {
                const sourceResult = currentResults.results.find(r => r.partyName === selectedParty);
                if (sourceResult) {
                  targetResult = {
                    partyId: sourceResult.partyId,
                    partyName: sourceResult.partyName,
                    partyColor: sourceResult.partyColor,
                    partySymbolUrl: sourceResult.partySymbolUrl || '',
                    photoUrl: sourceResult.photoUrl,
                    votes: 0,
                    percentage: 0,
                    seats: 0
                  };
                  category.results.push(targetResult);
                }
              }
              
              if (targetResult) {
                targetResult.votes += 1;
              }
            }
          } else {
            // Fallback to random if no current results
            console.log('⚠️ No hay resultados actuales, usando distribución aleatoria');
            mode = 'random';
          }
        }
        
        // Recalculate totalVotes
        category.totalVotes = category.results.reduce((sum, r) => sum + r.votes, 0);
      } else {
        console.log('❌ Categoría no encontrada para:', targetCategoryId);
      }
    }
    
    // Recalculate percentages and seats for all categories
    for (const category of cloned) {
      for (const result of category.results) {
        result.percentage = category.totalVotes > 0 
          ? (result.votes / category.totalVotes) * 100 
          : 0;
      }
      category.results.sort((a, b) => b.votes - a.votes);
      
      // Calculate seats for legislative categories (totalSeats > 1)
      if (category.totalSeats > 1 && category.totalVotes > 0) {
        const minVotesForSeats = category.totalSeats * 10;
        
        if (category.totalVotes >= minVotesForSeats) {
          let remainingSeats = category.totalSeats;
          
          for (let i = 0; i < category.results.length && remainingSeats > 0; i++) {
            const result = category.results[i];
            if (result.votes > 0) {
              let seatCount = Math.max(1, Math.round((result.percentage / 100) * category.totalSeats));
              seatCount = Math.min(seatCount, remainingSeats);
              result.seats = seatCount;
              remainingSeats -= seatCount;
            } else {
              result.seats = 0;
            }
          }
          
          // Generate seat distribution array for hemicycle
          const seatDistribution: Seat[] = [];
          category.results.forEach(result => {
            const partySeats = result.seats || 0;
            for (let i = 0; i < partySeats; i++) {
              seatDistribution.push({
                partyColor: result.partyColor,
                partyName: result.partyName,
                partySymbolUrl: result.partySymbolUrl
              });
            }
          });
          category.seatDistribution = seatDistribution;
        }
      }
    }
    
    return cloned;
  }
  
  // Display results - use derived with explicit dependencies
  let displayResults = $derived.by(() => {
    const multiplier = projectionMultiplier;
    const mode = projectionMode;
    const results = allResults;
    const resultsLength = results.length;
    const userVotesList = userVotes;
    const hasUserVotes = userVotesList.length > 0;
    
    console.log('🔄 Calculando displayResults. Multiplier:', multiplier, 'Results length:', resultsLength, 'User votes:', hasUserVotes);
    
    // If projection is active and user has votes, always calculate projection
    // even if allResults is empty
    if (multiplier > 1 && hasUserVotes) {
      console.log('🔧 Proyección activa con votos de usuario, calculando modo:', projectionMode);
      const projected = getProjectedResults(projectionMode);
      console.log('✅ Retornando proyección:', projected.length, 'categorías');
      return projected;
    }
    
    if (resultsLength === 0) {
      console.log('⚠️ Results vacío y sin proyección, retornando array vacío');
      return [];
    }
    
    if (multiplier === 1) {
      console.log('✅ Retornando resultados reales:', results.length, 'categorías');
      return results;
    }
    
    console.log('🔧 Llamando getProjectedResults modo:', projectionMode);
    const projected = getProjectedResults(projectionMode);
    console.log('✅ Retornando proyección:', projected.length, 'categorías');
    console.log('📊 Primer candidato:', projected[0]?.results?.[0]?.partyName, '-', projected[0]?.results?.[0]?.votes, 'votos');
    return projected;
  });
  
  // Prepare data for sharing (include projection info)
  let shareData = $derived<SharedResult[]>(
    displayResults.map(r => ({
      category: r.category,
      partyName: r.results[0]?.partyName || 'Sin datos',
      partyColor: r.results[0]?.partyColor || '#ccc',
      percentage: r.results[0]?.percentage || 0
    }))
  );
  
  // Start new simulation
  async function startNewSimulation() {
    if (restarting) return;
    restarting = true;
    
    sessionStorage.setItem('entry_mode', 'new_simulation');
    
    vote.resetForNewSimulation();
    resetAllSelections();
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    goto('/simular');
  }
  
  // Check voting status - now continuous until April 12, 2026 07:00 AM
  function checkVotingStatus() {
    votingStatus = getVotingStatus();
  }
  
  // Update countdown every second
  function startCountdown() {
    electionCountdown = getCountdownToElection(new Date());
    
    countdownInterval = setInterval(() => {
      electionCountdown = getCountdownToElection(new Date());
    }, 1000);
  }
  
  // Load real results from Firestore (HISTÓRICO ACUMULADO)
  async function loadRealResults(): Promise<CategoryResults[]> {
    // Initialize Firebase if not ready
    if (!isFirebaseReady) {
      initializeFirebase();
    }
    
    // Get ACCUMULATED stats from Firestore (all days, not just today)
    const accumulatedSimulations = await getAccumulatedSimulations();
    const accumulatedResults = await getAccumulatedResults();
    const resultsWithPercentages = await getAccumulatedResultsWithPercentages(); // Todas las fechas acumuladas
    
    // Get user's votes from store
    const userVotes = Array.from(vote.votes.entries());
    
    const categories = [
      { id: 'president', name: 'Presidente', subtitle: 'y Vicepresidentes', totalSeats: 1, colId: 'col0' },
      { id: 'senatorsNational', name: 'Senadores', subtitle: 'Nacionales', totalSeats: 30, colId: 'col1' },
      { id: 'senatorsRegional', name: 'Senadores', subtitle: 'Regionales', totalSeats: 30, colId: 'col2' },
      { id: 'deputies', name: 'Diputados', subtitle: '130 escaños', totalSeats: 130, colId: 'col3' },
      { id: 'andeanParliament', name: 'Parlamento', subtitle: 'Andino', totalSeats: 5, colId: 'col4' }
    ];
    
    // Set total simulations from ACCUMULATED global stats (all days)
    totalVoters = accumulatedSimulations || 0;
    const totalVoteCount = totalVoters; // Total de simulaciones acumuladas
    
    return categories.map(cat => {
      // Find user's vote for this category
      const userVoteForCategory = userVotes.find(([colId]) => colId === cat.colId);
      const userPartyName = userVoteForCategory ? userVoteForCategory[1].partyName : null;
      
      // Get ACCUMULATED results for this category from Firestore (all days)
      const realResults = accumulatedResults?.[cat.id] || resultsWithPercentages?.[cat.id] || [];
      
      // Map real results to ElectionResult format
      let parties: ElectionResult[];
      
      if (realResults.length === 0) {
        // No votes at all in this category - check if user voted with projection
        if (userPartyName && projectionMultiplier > 1) {
          // User voted and projection is active - create result for their party
          const partyRow = cat.id === 'president' 
            ? presidentialRows.find(r => r.partyName === userPartyName)
            : legislativeRows.find(r => r.partyName === userPartyName);
          
          if (partyRow) {
            parties = [{
              partyId: partyRow.partyAbbr || userPartyName,
              partyName: partyRow.partyName,
              partyColor: partyRow.partyColor,
              partySymbolUrl: partyRow.partySymbolUrl || '',
              photoUrl: cat.id === 'president' ? partyRow.presidentialPhoto : null,
              votes: 1, // User's real vote (will be updated by projection)
              percentage: 100,
              seats: 0
            }];
          } else {
            parties = [];
          }
        } else {
          // No votes and no user vote with projection - return empty array
          parties = [];
        }
      } else if (totalVoteCount < 5) {
        // Few votes total - ONLY show candidates/parties that received actual votes
        const totalCatVotes = realResults.reduce((sum, r) => sum + r.count, 0);
        
        if (cat.id === 'president') {
          // For president with few votes, show only voted candidates
          parties = realResults.map(result => {
            const partyRow = presidentialRows.find(r => r.partyName === result.partyId || r.partyAbbr === result.partyId);
            const percentage = totalCatVotes > 0 ? (result.count / totalCatVotes) * 100 : 0;
            return {
              partyId: result.partyId,
              partyName: partyRow?.partyName || result.partyId,
              partyColor: partyRow?.partyColor || '#666',
              partySymbolUrl: partyRow?.partySymbolUrl || '',
              photoUrl: partyRow?.presidentialPhoto || null,
              votes: result.count,
              percentage: percentage,
              seats: 0
            };
          });
          // Sort by votes and show ALL that have votes (not just top 3)
          parties.sort((a, b) => b.votes - a.votes);
        } else {
          // For legislative categories with few votes
          parties = realResults.map(result => {
            const partyRow = legislativeRows.find(r => r.partyName === result.partyId || r.partyAbbr === result.partyId);
            const percentage = totalCatVotes > 0 ? (result.count / totalCatVotes) * 100 : 0;
            return {
              partyId: result.partyId,
              partyName: partyRow?.partyName || result.partyId,
              partyColor: partyRow?.partyColor || '#666',
              partySymbolUrl: partyRow?.partySymbolUrl || '',
              photoUrl: null,
              votes: result.count,
              percentage: percentage,
              seats: 0
            };
          });
          parties.sort((a, b) => b.votes - a.votes);
        }
      } else {
        // 5+ votes - show normal view with percentages
        const totalCatVotes = realResults.reduce((sum, r) => sum + r.count, 0);
        
        if (cat.id === 'president') {
          // Show top 3 candidates
          parties = realResults.slice(0, 3).map(result => {
            const partyRow = presidentialRows.find(r => r.partyName === result.partyId || r.partyAbbr === result.partyId);
            return {
              partyId: result.partyId,
              partyName: partyRow?.partyName || result.partyId,
              partyColor: partyRow?.partyColor || '#666',
              partySymbolUrl: partyRow?.partySymbolUrl || '',
              photoUrl: partyRow?.presidentialPhoto || null,
              votes: result.count,
              percentage: result.percentage,
              seats: 0
            };
          });
        } else {
          // For legislative - show voted parties first, then empty ones
          const resultsMap = new Map(realResults.map(r => [r.partyId, r]));
          
          // Start with all legislative rows
          parties = legislativeRows.map(row => {
            const result = resultsMap.get(row.partyName) || resultsMap.get(row.partyAbbr);
            const voteCount = result?.count || 0;
            const percentage = totalCatVotes > 0 ? (voteCount / totalCatVotes) * 100 : 0;
            return {
              partyId: row.partyAbbr,
              partyName: row.partyName || '',
              partyColor: row.partyColor,
              partySymbolUrl: row.partySymbolUrl || '',
              photoUrl: null,
              votes: voteCount,
              percentage: percentage,
              seats: 0
            };
          });
          
          // Sort by votes
          parties.sort((a, b) => b.votes - a.votes);
          
          // Only assign seats if there are enough votes
          const minVotesForSeats = cat.totalSeats * 10;
          if (cat.totalSeats > 1 && totalCatVotes >= minVotesForSeats) {
            let remainingSeats = cat.totalSeats;
            parties = parties.map((p, i) => {
              let seatCount = 0;
              if (p.votes > 0 && i < parties.length && remainingSeats > 0) {
                seatCount = Math.max(1, Math.round((p.percentage / 100) * cat.totalSeats));
                seatCount = Math.min(seatCount, remainingSeats);
                remainingSeats -= seatCount;
              }
              return { ...p, seats: seatCount };
            });
          }
          
          // Show top 10
          parties = parties.slice(0, 10);
        }
      }
      
      // Generate seat distribution
      let seatDistribution: Seat[] = [];
      const totalVotes = parties.reduce((sum, r) => sum + r.votes, 0);
      const minVotesForSeats = cat.totalSeats * 10;
      
      // Generate seats if: legislative category AND enough total votes
      // (works for both real results and projections)
      if (cat.totalSeats > 1 && totalVotes >= minVotesForSeats) {
        // Calculate seats based on percentages
        let remainingSeats = cat.totalSeats;
        parties.forEach((party, i) => {
          if (party.votes > 0 && remainingSeats > 0) {
            const percentage = totalVotes > 0 ? (party.votes / totalVotes) * 100 : 0;
            let seatCount = Math.max(1, Math.round((percentage / 100) * cat.totalSeats));
            seatCount = Math.min(seatCount, remainingSeats);
            party.seats = seatCount;
            remainingSeats -= seatCount;
            
            // Add seats to distribution array
            for (let j = 0; j < seatCount; j++) {
              seatDistribution.push({
                partyColor: party.partyColor,
                partyName: party.partyName,
                partySymbolUrl: party.partySymbolUrl
              });
            }
          }
        });
      }
      
      return {
        category: cat.name,
        categoryId: cat.id,
        totalVotes: parties.reduce((sum, r) => sum + r.votes, 0),
        totalSeats: cat.totalSeats,
        results: parties,
        seatDistribution,
        userVote: userPartyName || undefined
      };
    });
  }
  
  // Initialize
  onMount(async () => {
    checkVotingStatus();
    
    // Initialize Firebase if not ready
    if (!isFirebaseReady) {
      initializeFirebase();
    }
    
    // Load real results from Firestore
    try {
      console.log('📥 Cargando resultados de Firestore...');
      const loadedResults = await loadRealResults();
      console.log('✅ Resultados cargados:', loadedResults.length, 'categorías');
      console.log('📊 Primera categoría:', loadedResults[0]?.category, '-', loadedResults[0]?.results?.length, 'resultados');
      allResults = loadedResults;
    } catch (err) {
      console.error('❌ Error loading results:', err);
    } finally {
      isLoading = false;
    }
    
    // Subscribe to live voter count updates (TODAY - para actualizaciones en tiempo real)
    // Pero recargamos TODO el histórico acumulado cuando hay cambios
    if (isFirebaseReady) {
      const today = new Date().toISOString().split('T')[0];
      unsubscribe = subscribeToGlobalStats(today, async (stats: GlobalStats | null) => {
        if (stats) {
          // Detectamos si hay votos nuevos hoy
          const todaySimulations = stats.totalSimulations || Math.floor((stats.totalVotes || 0) / 5) || 0;
          liveVoterCount = todaySimulations;
          lastUpdateTime = new Date();
          
          // Si hay cambios, recargamos TODO el acumulado histórico
          if (todaySimulations > 0) {
            // Recargar resultados acumulados completos
            const accumulatedSimulations = await getAccumulatedSimulations();
            if (accumulatedSimulations > 0) {
              totalVoters = accumulatedSimulations;
              
              // Refresh results to show updated data
              const newResults = await loadRealResults();
              allResults = newResults;
            }
          }
        }
      });
    }
    
    // Trigger confetti after a delay
    setTimeout(() => {
      showConfetti = true;
    }, 500);
    
    // Start election countdown
    startCountdown();
    
    // Update countdown every second
    const interval = setInterval(() => {
      currentTime = new Date();
      checkVotingStatus();
    }, 1000);
    
    return () => {
      clearInterval(interval);
      // Unsubscribe from Firestore updates
      if (unsubscribe) {
        unsubscribe();
      }
      // Clear countdown interval
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  });
  
  // Cleanup on component destroy
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  });
  
  // Check absolute majority
  function hasAbsoluteMajority(results: ElectionResult[]): boolean {
    return results.length > 0 && results[0].percentage > 50;
  }
  
  // ─── SIMPLIFIED GOVERNANCE ANALYSIS (3-TIER) ─────────────────────────────────
  
  interface SimpleGovernance {
    level: 'high' | 'balanced' | 'fragmented';
    label: string;
    color: string;
    description: string;
    microCopy: string;
  }
  
  function analyzeSeatConcentration(seatDistribution: any[], totalSeats: number): SimpleGovernance {
    if (seatDistribution.length === 0) {
      return {
        level: 'fragmented',
        label: '🔴 Fragmentado',
        color: '#DC3545',
        description: 'Aún no hay suficientes datos para evaluar la concentración de escaños.',
        microCopy: 'El hemiciclo está muy fragmentado.\n\nCuando hay muchas fuerzas pequeñas, lograr consensos puede ser más complejo.'
      };
    }
    
    // Count seats by party
    const partyCounts = new Map<string, number>();
    for (const seat of seatDistribution) {
      const count = partyCounts.get(seat.partyName) || 0;
      partyCounts.set(seat.partyName, count + 1);
    }
    
    // Sort by seat count
    const sorted = Array.from(partyCounts.entries()).sort((a, b) => b[1] - a[1]);
    const [dominantParty, dominantSeats] = sorted[0] || ['', 0];
    
    // Calculate concentration percentage
    const concentration = (dominantSeats / totalSeats) * 100;
    const uniqueParties = sorted.length;
    
    // Determine classification
    if (concentration >= 40 && uniqueParties <= 3) {
      // High coordination: dominant party has significant majority, few parties total
      return {
        level: 'high',
        label: '🟢 Alta coordinación',
        color: '#28A745',
        description: `La distribución muestra una mayor concentración de escaños.`,
        microCopy: 'La distribución muestra una mayor concentración de escaños.\n\nEsto puede facilitar la coordinación entre el Ejecutivo y el Congreso.'
      };
    } else if (concentration >= 25 && uniqueParties <= 5) {
      // Balanced: moderate concentration
      return {
        level: 'balanced',
        label: '🟡 Equilibrado',
        color: '#FFC107',
        description: 'Los escaños están distribuidos entre varias fuerzas.',
        microCopy: 'Los escaños están distribuidos entre varias fuerzas.\n\nEsto puede generar mayor debate y necesidad de acuerdos.'
      };
    } else {
      // Fragmented: low concentration or many parties
      return {
        level: 'fragmented',
        label: '🔴 Fragmentado',
        color: '#DC3545',
        description: 'El hemiciclo está muy fragmentado.',
        microCopy: 'El hemiciclo está muy fragmentado.\n\nCuando hay muchas fuerzas pequeñas, lograr consensos puede ser más complejo.'
      };
    }
  }
  
  // ─── GLOBAL SCENARIO ANALYSIS ────────────────────────────────────────────────
  
  interface GlobalScenario {
    type: 'high' | 'balanced' | 'fragmented';
    label: string;
    color: string;
    title: string;
    description: string;
    alignmentPoints: number;
    fragmentation: number;
  }
  
  function analyzeGlobalScenario(): GlobalScenario | null {
    if (displayResults.length === 0) return null;
    
    // Get top party for each category
    const presidentResults = displayResults.find(r => r.categoryId === 'president');
    const senateNatResults = displayResults.find(r => r.categoryId === 'senatorsNational');
    const senateRegResults = displayResults.find(r => r.categoryId === 'senatorsRegional');
    const deputiesResults = displayResults.find(r => r.categoryId === 'deputies');
    
    const topPresident = presidentResults?.results[0]?.partyName;
    const topSenateNat = senateNatResults?.results[0]?.partyName;
    const topSenateReg = senateRegResults?.results[0]?.partyName;
    const topDeputies = deputiesResults?.results[0]?.partyName;
    
    if (!topPresident || !topSenateNat || !topSenateReg || !topDeputies) {
      return null;
    }
    
    // Calculate alignment points
    let alignmentPoints = 0;
    if (topPresident === topSenateNat) alignmentPoints++;
    if (topPresident === topSenateReg) alignmentPoints++;
    if (topPresident === topDeputies) alignmentPoints++;
    if (topSenateNat === topSenateReg) alignmentPoints++;
    if (topSenateNat === topDeputies) alignmentPoints++;
    if (topSenateReg === topDeputies) alignmentPoints++;
    
    // Calculate fragmentation index
    const allGroups = [presidentResults, senateNatResults, senateRegResults, deputiesResults]
      .filter(Boolean) as CategoryResults[];
    
    const partyVotes = new Map<string, number>();
    let totalVotes = 0;
    
    allGroups.forEach(cat => {
      cat.results.forEach(r => {
        const current = partyVotes.get(r.partyName) || 0;
        partyVotes.set(r.partyName, current + r.votes);
        totalVotes += r.votes;
      });
    });
    
    let concentration = 0;
    if (totalVotes > 0) {
      partyVotes.forEach(votes => {
        const share = votes / totalVotes;
        concentration += share * share;
      });
    }
    
    const fragmentation = 1 - concentration;
    
    // Classify scenario
    let type: 'high' | 'balanced' | 'fragmented';
    let label: string;
    let color: string;
    let title: string;
    let description: string;
    
    if (alignmentPoints >= 4 && fragmentation < 0.68) {
      type = 'high';
      label = '🟢 Alta coordinación';
      color = '#28A745';
      title = 'Escenario más coordinado';
      description = 'Las preferencias en presidente y Congreso siguen una línea similar. Esto puede facilitar la coordinación política y hacer más ágil la implementación de propuestas.';
    } else if (alignmentPoints <= 1 || fragmentation >= 0.78) {
      type = 'fragmented';
      label = '🔴 Fragmentado';
      color = '#DC3545';
      title = 'Escenario fragmentado';
      description = 'Las preferencias están muy dispersas entre varias fuerzas. Cuando el poder se reparte demasiado, alcanzar acuerdos puede ser más complejo y los cambios pueden avanzar más lentamente.';
    } else {
      type = 'balanced';
      label = '🟡 Equilibrado';
      color = '#FFC107';
      title = 'Escenario equilibrado';
      description = 'Las decisiones están distribuidas entre distintas opciones. Esto puede generar mayor debate y control, aunque también puede requerir más acuerdos para avanzar.';
    }
    
    return { type, label, color, title, description, alignmentPoints, fragmentation };
  }
  
  // Analyze global scenario based on display results
  let globalScenario = $derived(analyzeGlobalScenario());
  
  // Go back to voting
  function goBack() {
    goto('/simular');
  }
  
  $effect(() => {
    if (votingStatus === 'closed') {
      // Winners are already saved in real-time as votes come in
      // No need for additional localStorage saving
    }
  });
</script>

<svelte:head>
  <!-- Primary Meta Tags -->
  <title>Resultados Electorales 2026 | Simulación de Votación | La Fecha Más Importante</title>
  <meta name="description" content="Explora los resultados de la simulación electoral Perú 2026. Visualiza escaños, porcentajes y distribución del poder. Análisis de gobernabilidad y escenarios políticos." />
  <meta name="keywords" content="resultados elecciones Perú 2026, escaños congreso, distribución poder, simulación electoral, análisis político" />
  <meta name="robots" content="index, follow" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://lafechamasimportante.com/resultados" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://lafechamasimportante.com/resultados" />
  <meta property="og:title" content="Resultados Electorales 2026 | Simulación de Votación" />
  <meta property="og:description" content="Explora los resultados de la simulación electoral Perú 2026. Visualiza escaños y distribución del poder." />
  <meta property="og:image" content="https://lafechamasimportante.com/favicon.svg" />
  <meta property="og:locale" content="es_PE" />
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary" />
  <meta property="twitter:url" content="https://lafechamasimportante.com/resultados" />
  <meta property="twitter:title" content="Resultados Electorales 2026 | Simulación de Votación" />
  <meta property="twitter:description" content="Explora los resultados de la simulación electoral Perú 2026." />
  <meta property="twitter:image" content="https://lafechamasimportante.com/favicon.svg" />
  
  <!-- Schema.org -->
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ElectionEvent",
    "name": "Elecciones Generales Perú 2026",
    "startDate": "2026-04-12",
    "location": {
      "@type": "Country",
      "name": "Perú"
    },
    "description": "Simulación de resultados electorales"
  })}</script>`}
</svelte:head>

<!-- Confetti Effect -->
{#if showConfetti}
  <div class="confetti-container" out:fade={{ duration: 1000 }}>
    {#each Array(50) as _, i}
      <div class="confetti" style="--delay: {i * 0.1}s; --x: {Math.random() * 100}vw; --color: {['#C8102E', '#FFD700', '#00CED1', '#FF69B4', '#32CD32'][i % 5]}"></div>
    {/each}
  </div>
{/if}

<div class="results-page">
  <!-- Modern Dashboard Header -->
  <header class="hero-header" in:fly={{ y: -30, duration: 800 }}>
    <!-- Noise overlay -->
    <div class="noise-overlay"></div>
    
    <div class="header-content">
      <!-- Left Block -->
      <div class="title-wrapper">
        <div class="title-row">
          <span class="title-icon">🗳️</span>
          <h1 class="main-title">RESULTADOS ELECTORALES</h1>
        </div>
        <p class="subtitle">Elecciones Generales Perú 2026</p>
        
        <!-- Help Button -->
        <button 
          class="help-button-results"
          onclick={() => showHelpPanel = true}
          aria-label="Ayuda y contacto"
        >
          <svg class="help-icon-results" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span class="help-text-results">Ayuda y contacto</span>
        </button>
      </div>
      
      <!-- Right Card (Activity) -->
      <div class="live-stats-widget" in:fly={{ x: 30, duration: 600, delay: 300 }}>
        <!-- Header -->
        <div class="widget-header">
          <span class="live-pulse"></span>
          <span class="live-label">ACTIVIDAD EN VIVO</span>
        </div>
        
        <!-- Countdown -->
        <div class="countdown-section">
          <span class="countdown-label">Tiempo restante</span>
          <div class="countdown-blocks">
            {#if electionCountdown.isExpired}
              <span class="countdown-expired">La jornada de votación ya comenzó</span>
            {:else}
              <div class="time-block">
                <span class="time-number">{electionCountdown.days}</span>
                <span class="time-unit">días</span>
              </div>
              <div class="time-block">
                <span class="time-number">{electionCountdown.hours.toString().padStart(2, '0')}</span>
                <span class="time-unit">horas</span>
              </div>
              <div class="time-block">
                <span class="time-number">{electionCountdown.minutes.toString().padStart(2, '0')}</span>
                <span class="time-unit">min</span>
              </div>
              <div class="time-block">
                <span class="time-number">{electionCountdown.seconds.toString().padStart(2, '0')}</span>
                <span class="time-unit">seg</span>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Simulations Count -->
        <div class="widget-body">
          <div class="widget-icon">🗳️</div>
          <div class="widget-data">
            <span class="widget-number">{totalVoters.toLocaleString()}</span>
            <span class="widget-unit">Simulaciones</span>
          </div>
        </div>
        
        <!-- Footer -->
        <p class="countdown-subtitle">Cuenta regresiva para votar el domingo 12 de abril desde las 7:00 a. m.</p>
      </div>
    </div>
    
    <!-- Final Results Banner (when simulations are closed permanently) -->
    {#if !canStillSimulate()}
      <div class="final-results-banner" in:fade={{ duration: 300, delay: 400 }}>
        <h2 class="final-title">Simulaciones cerradas</h2>
        <p class="final-subtitle">Las simulaciones ya cerraron el 12 de abril a las 07:00. Ahora solo puedes revisar los resultados acumulados.</p>
      </div>
    {/if}
  </header>

  <!-- Help Panel -->
  <HelpPanel isOpen={showHelpPanel} onClose={() => showHelpPanel = false} />

  <!-- Projection Banner (when viewing projection) -->
  {#if projectionMultiplier > 1}
    <div class="projection-banner" in:fade={{ duration: 300 }}>
      Viendo proyección: {projectionMultiplier} personas votarían igual que tú
    </div>
    <p class="projection-explanation" in:fade={{ duration: 300, delay: 100 }}>
      Este escenario muestra cómo cambiarían los resultados si más personas tomaran decisiones similares en toda la cédula.
    </p>
  {/if}

  <!-- Presidential Results - Featured -->
  <section class="featured-section presidential" in:fly={{ y: 30, duration: 600, delay: 200 }}>
    <div class="section-header">
      <h2>Presidente y Vicepresidentes</h2>
      {#if projectionMultiplier > 1}
        <p class="projection-subtitle">Resultados proyectados</p>
      {/if}
    </div>
    
    {#if displayResults[0]?.results?.length > 0}
      <div class="candidates-showcase">
        {#each displayResults[0].results.slice(0, 3) as candidate, i}
          <div 
            class="candidate-card"
            class:winner={i === 0}
            class:user-vote={candidate.partyName === displayResults[0].userVote}
            in:fly={{ y: 30, duration: 500, delay: i * 150 }}
          >
            <div class="rank-badge">{i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉'}</div>
            
            <div class="photo-frame">
              {#if candidate.photoUrl}
                <img src={candidate.photoUrl} alt={candidate.partyName} class="candidate-photo" loading="lazy" />
              {:else}
                <div class="photo-placeholder" style="background: {candidate.partyColor}">
                  <img src={candidate.partySymbolUrl} alt="" class="fallback-symbol" />
                </div>
              {/if}
              
              <div class="party-mini-symbol">
                <img src={candidate.partySymbolUrl} alt="" />
              </div>
            </div>
            
             <div class="candidate-info">
               <h3 class="party-name">{candidate.partyName}</h3>
               <div class="percentage-display">
                 <span class="percentage-number">{candidate.percentage.toFixed(1)}%</span>
                 <div class="percentage-bar">
                   <div class="bar-fill" style="width: {candidate.percentage}%; background: {candidate.partyColor}"></div>
                 </div>
               </div>
               <span class="vote-count" data-votes={candidate.votes}>{candidate.votes.toLocaleString()} votos</span>
               {#if projectionMultiplier > 1}
                 <span style="font-size: 10px; color: #666;">(multiplier: {projectionMultiplier})</span>
               {/if}
             </div>
            
            {#if candidate.partyName === displayResults[0].userVote}
              <div class="user-vote-ribbon">TU VOTO</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Runoff Warning -->
      {#if !hasAbsoluteMajority(displayResults[0].results)}
        <div class="runoff-banner" in:fly={{ y: 20, duration: 400, delay: 600 }}>
          <div class="runoff-icon">⚠️</div>
          <div class="runoff-content">
            <h4>Segunda Vuelta Requerida</h4>
            <p>Ningún candidato alcanzó el 50% de los votos. Los 2 más votados pasan a segunda vuelta el <strong>7 de junio 2026</strong>.</p>
          </div>
        </div>
      {/if}
    {:else}
      <!-- No results yet -->
      <div class="empty-category" in:fly={{ y: 20, duration: 400 }}>
        <div class="empty-icon">🗳️</div>
        <p>Aún no hay resultados para esta categoría</p>
        <span class="empty-hint">Los resultados aparecerán cuando lleguen los primeros votos</span>
      </div>
    {/if}
  </section>

  <!-- Congressional Categories with Hemicycle -->
  {#each displayResults.slice(1) as category, index}
    <section 
      class="category-section"
      in:fly={{ y: 30, duration: 600, delay: 300 + index * 100 }}
    >
      <div class="section-header">
        <div>
          <h2>{category.category}</h2>
          {#if projectionMultiplier > 1}
            <p class="projection-subtitle">Resultados proyectados</p>
          {/if}
          {#if category.categoryId === 'senatorsNational'}
            <p class="district-label">Distrito Nacional</p>
          {:else if category.categoryId === 'senatorsRegional'}
            <p class="district-label">Distrito Regional (Lima)</p>
          {:else if category.categoryId === 'deputies'}
            <p class="district-label">Distrito Electoral Lima</p>
          {:else if category.categoryId === 'andeanParliament'}
            <p class="district-label">Comunidad Andina</p>
          {/if}
        </div>
        <div class="header-stats">
          <span class="seat-count">{category.totalSeats} escaños</span>
          <span class="vote-count">{category.totalVotes.toLocaleString()} votos</span>
        </div>
      </div>

      <!-- Hemicycle Visualization - Solo mostrar si hay contenido -->
      {#if category.seatDistribution.length > 0 || category.totalVotes > 0}
        <div class="hemicycle-wrapper">
          {#if category.seatDistribution.length > 0}
            {@const dominantParty = category.results[0]?.partyName || ''}
            {#key `${category.categoryId}-${category.seatDistribution.length}`}
              <ParliamentHemicycle 
                seats={category.seatDistribution}
                totalSeats={category.totalSeats}
                highlightParty={dominantParty}
              />
            {/key}
          {:else}
            <!-- Hay votos pero no suficientes para escaños -->
            <div class="no-seats-message">
              <div class="no-seats-icon">📊</div>
              <p>Se necesitan más votos para calcular escaños</p>
              <span class="no-seats-hint">Mínimo: {category.totalSeats * 10} votos</span>
            </div>
          {/if}
        </div>
        
        <!-- Governance Interpretation - Below Hemicycle -->
        {@const governance = analyzeSeatConcentration(category.seatDistribution, category.totalSeats)}
        <div class="interpretation-section" style="border-left-color: {governance.color};">
          <h3 class="interpretation-title">🧠 ¿Qué significa este resultado?</h3>
          
          <p class="interpretation-intro">
            Esta distribución no solo muestra quién tiene más votos, sino cómo se vería el equilibrio de poder entre el Ejecutivo y el Congreso.
          </p>
          
          <div class="hemicycle-reading">
            <h4>👁️ Lectura del hemiciclo</h4>
            <p>Observa cómo se distribuyen los escaños en el hemiciclo.</p>
            <ul>
              <li>Cuando un grupo concentra más escaños, puede tener mayor capacidad de impulsar decisiones.</li>
              <li>Cuando están muy repartidos, se necesitan más acuerdos entre distintas fuerzas.</li>
            </ul>
          </div>
          
          <div class="classification-block" style="background: {governance.color}10;">
            <div class="classification-badge" style="background: {governance.color}; color: white;">
              {governance.label}
            </div>
            <p class="classification-description">{governance.description}</p>
            <div class="micro-copy">{@html governance.microCopy.replace(/\n/g, '<br>')}</div>
          </div>
          
          <div class="educational-final">
            <div class="edu-icon">📌</div>
            <p>No solo importa quién gana, sino <strong>cómo se distribuye el poder</strong>.</p>
            <p>El resultado del Congreso influye en cómo se gobierna y en qué tan fácil es implementar cambios.</p>
          </div>
        </div>
      {/if}

      <!-- Top Results List -->
      <div class="results-list">
        {#each category.results.slice(0, 5) as result, i}
          <div 
            class="result-item"
            class:user-vote={result.partyName === category.userVote}
            in:fly={{ x: -20, duration: 300, delay: 400 + i * 50 }}
          >
            <div class="rank">{i + 1}</div>
            
            <img src={result.partySymbolUrl} alt="" class="party-symbol" />
            
            <div class="party-info">
              <span class="name">{result.partyName}</span>
              <div class="mini-bar">
                <div class="fill" style="width: {result.percentage}%; background: {result.partyColor}"></div>
              </div>
            </div>
            
            <div class="stats">
              {#if category.totalSeats > 1}
                <span class="seats-badge" style="background: {result.partyColor}">
                  {result.seats} escaños
                </span>
              {/if}
              <span class="percentage">{result.percentage.toFixed(1)}%</span>
            </div>
            
            {#if result.partyName === category.userVote}
              <div class="user-mark">✓</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Empty state for categories with no votes -->
      {#if category.results.length === 0}
        <div class="empty-category" in:fly={{ y: 20, duration: 400 }}>
          <div class="empty-icon">📊</div>
          <p>Aún no hay resultados para esta categoría</p>
          <span class="empty-hint">Los resultados aparecerán cuando lleguen los primeros votos</span>
        </div>
      {/if}
    </section>
  {/each}

  <!-- Global Scenario Interpretation -->
  {#if globalScenario}
    <section class="global-interpretation" in:fly={{ y: 30, duration: 600, delay: 700 }}>
      <h2 class="interpretation-main-title">🧠 ¿Qué significa este resultado?</h2>
      
      <p class="interpretation-main-text">
        Esta simulación no solo muestra quién tiene más votos, sino cómo se distribuye el poder entre presidente, Congreso y representación parlamentaria. La combinación entre estas decisiones puede dar lugar a un escenario más coordinado o más fragmentado.
      </p>
      
      <!-- Scenario Classification -->
      <div class="scenario-classification" style="border-color: {globalScenario.color};">
        <div class="scenario-badge" style="background: {globalScenario.color};">
          {globalScenario.label}
        </div>
        <h3 class="scenario-title">{globalScenario.title}</h3>
        <p class="scenario-description">{globalScenario.description}</p>
      </div>
      
      <!-- Congress Note -->
      <div class="congress-note">
        <div class="note-icon">📌</div>
        <div class="note-content">
          <strong>El Congreso también se define en esta etapa</strong>
          <p>A diferencia de la elección presidencial, que puede tener una segunda vuelta, la composición del Congreso se decide ahora. Por eso, las decisiones en senadores y diputados tienen un impacto directo en el resultado final.</p>
        </div>
      </div>
    </section>
  {/if}

  <!-- Share Modal -->
  {#if showShareModal}
    <ShareResults results={shareData} onClose={() => showShareModal = false} />
  {/if}

  <!-- New Simulation Card -->
  <div class="simulation-card" in:fly={{ y: 30, duration: 600, delay: 800 }}>
    <div class="card-icon">🔄</div>
    <h2 class="card-title">Probar otra combinación</h2>
    <p class="card-text">Mira cómo cambian los resultados según tus decisiones en toda la cédula.</p>
    
    <button 
      class="new-simulation-btn" 
      class:loading={restarting}
      disabled={restarting}
      onclick={startNewSimulation}
    >
      {#if restarting}
        Preparando nueva simulación...
      {:else}
        🔄 Probar otra combinación
      {/if}
    </button>
    
    <div class="secondary-actions">
      <button class="btn-outline" onclick={() => showShareModal = true}>
        Compartir resultados
      </button>
      <button class="btn-outline" onclick={() => goto('/historial')}>
        Ver histórico
      </button>
    </div>
  </div>

  <!-- Projection Card -->
  {#if userVotes.length > 0}
    <div class="projection-card" in:fly={{ y: 30, duration: 600, delay: 900 }}>
      <h2 class="projection-title">Proyección de tu simulación</h2>
      <p class="projection-description">Simula cómo cambiarían los resultados si más personas votaran de diferentes maneras.</p>
      
      <!-- Mode Selector -->
      <div class="projection-section">
        <div class="projection-label">Modo de distribución</div>
        <div class="mode-selector">
          {#each projectionModes as mode}
            <button 
              class="mode-option"
              class:active={projectionMode === mode.id}
              onclick={() => {
                console.log('🎮 Cambiando modo a:', mode.id);
                projectionMode = mode.id;
              }}
              title={mode.description}
            >
              <span class="mode-icon">{mode.icon}</span>
              <span class="mode-name">{mode.label}</span>
            </button>
          {/each}
        </div>
        <p class="mode-description">
          {projectionModes.find(m => m.id === projectionMode)?.description}
        </p>
      </div>
      
      <!-- Scale Selector -->
      <div class="projection-section">
        <div class="projection-label">Cantidad de personas</div>
        <div class="projection-selector">
          {#each projectionOptions as option}
            <button 
              class="projection-option"
              class:active={projectionMultiplier === option.value}
              onclick={() => {
                console.log('🎯 Cambiando proyección a:', option.value);
                projectionMultiplier = option.value;
              }}
            >
              {option.label}
            </button>
          {/each}
        </div>
        <p class="projection-explainer">
          Prueba distintas combinaciones para entender cómo cambian los resultados cuando más personas votan de forma similar.
        </p>
      </div>
      
      <p class="projection-note">Esto es una proyección y no modifica los resultados reales del día.</p>
    </div>
  {/if}
  
  <!-- Educational Footer Blocks -->
  <div class="educational-footer" in:fly={{ y: 30, duration: 600, delay: 1000 }}>
    <div class="footer-block">
      <div class="footer-icon">📌</div>
      <div class="footer-content">
        <h3 class="footer-title">Todas las columnas importan</h3>
        <p class="footer-text">El voto no termina en la elección presidencial. Las decisiones en senadores y diputados también influyen en cómo se gobierna y en qué tan fácil es implementar cambios.</p>
      </div>
    </div>
    
    <div class="footer-block">
      <div class="footer-icon">📌</div>
      <div class="footer-content">
        <h3 class="footer-title">Este resultado se construye con todas tus decisiones</h3>
        <p class="footer-text">En esta simulación no solo elegiste presidente. También tomaste decisiones en las demás columnas de la cédula. Esa combinación es la que define cómo se distribuye el poder en este escenario.</p>
      </div>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background: #f8f9fa;
  }

  /* Confetti */
  .confetti-container {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  }

  .confetti {
    position: absolute;
    width: 10px;
    height: 10px;
    background: var(--color);
    top: -10px;
    left: var(--x);
    animation: confetti-fall 3s ease-out forwards;
    animation-delay: var(--delay);
  }

  @keyframes confetti-fall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(720deg);
      opacity: 0;
    }
  }

  /* Page Layout */
  .results-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 100px;
  }

  /* Hero Header - Modern Dashboard Design */
  .hero-header {
    background: linear-gradient(135deg, #0B1220 0%, #111A2E 40%, #0A0F1C 100%);
    color: white;
    padding: 32px 48px;
    border-radius: 24px;
    margin-bottom: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    height: 280px;
    position: relative;
    overflow: hidden;
  }

  /* Noise overlay */
  .noise-overlay {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: 0.03;
    mix-blend-mode: overlay;
    pointer-events: none;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    position: relative;
    z-index: 1;
  }

  /* Left Block */
  .title-wrapper {
    max-width: 60%;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .title-icon {
    font-size: 40px;
    filter: grayscale(100%) brightness(1.2);
  }

  .main-title {
    font-size: 36px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: #F9FAFB;
    margin: 0;
    line-height: 1.2;
  }

  .subtitle {
    font-size: 16px;
    font-weight: 400;
    color: #9CA3AF;
    margin: 8px 0 0 0;
  }

  /* Help Button in Results Header */
  .help-button-results {
    height: 40px;
    padding: 0 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 16px;
  }

  .help-button-results:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.22);
    transform: translateY(-1px);
  }

  .help-icon-results {
    flex-shrink: 0;
  }

  /* Live Stats Widget - Glassmorphism Card */
  .live-stats-widget {
    background: rgba(255, 255, 255, 0.04);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    width: 360px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    transition: all 0.25s ease;
  }

  .live-stats-widget:hover {
    transform: translateY(-2px);
  }

  .widget-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .live-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22C55E;
    box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.6; }
    100% { transform: scale(1); opacity: 1; }
  }

  .live-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    color: #9CA3AF;
    text-transform: uppercase;
  }

  /* Countdown Section */
  .countdown-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .countdown-label {
    font-size: 12px;
    color: #6B7280;
  }

  .countdown-blocks {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .time-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 40px;
  }

  .time-number {
    font-size: 28px;
    font-weight: 700;
    font-family: monospace;
    color: #F9FAFB;
    line-height: 1;
  }

  .time-unit {
    font-size: 10px;
    color: #6B7280;
    text-transform: lowercase;
    margin-top: 2px;
  }

  .countdown-expired {
    font-size: 14px;
    font-weight: 600;
    color: #ff6b6b;
    text-align: center;
  }

  /* Widget Body - Simulations Count */
  .widget-body {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .widget-icon {
    font-size: 28px;
    filter: grayscale(100%) brightness(1.2);
  }

  .widget-data {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
  }

  .widget-number {
    font-size: 28px;
    font-weight: 700;
    color: #F9FAFB;
    letter-spacing: -0.5px;
  }

  .widget-unit {
    font-size: 12px;
    color: #9CA3AF;
  }

  /* Footer */
  .countdown-subtitle {
    font-size: 11px;
    color: #6B7280;
    line-height: 1.4;
    margin: 0;
  }

  /* Final Results Banner */
  .final-results-banner {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
    border: 1px solid #ffc107;
    border-radius: 12px;
    padding: 20px 30px;
    margin: 20px 0 0 0;
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .final-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #856404;
    margin: 0 0 8px 0;
  }

  .final-subtitle {
    font-size: 0.95rem;
    color: #856404;
    margin: 0;
    opacity: 0.9;
  }

  .widget-body {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .widget-icon {
    font-size: 2.2rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .widget-data {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
  }

  .widget-number {
    font-size: 2.5rem;
    font-weight: 800;
    color: #fff;
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
    letter-spacing: -1px;
  }

  .widget-unit {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    text-transform: lowercase;
    margin-top: 2px;
  }

  /* Empty Category Message */
  .empty-category {
    text-align: center;
    padding: 60px 20px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 16px;
    border: 2px dashed #ddd;
  }

  .empty-icon {
    font-size: 3.5rem;
    margin-bottom: 15px;
    opacity: 0.7;
  }

  .empty-category p {
    font-size: 1.2rem;
    color: #666;
    margin: 0 0 10px 0;
    font-weight: 500;
  }

  .empty-hint {
    font-size: 0.95rem;
    color: #999;
    font-style: italic;
  }

  /* Sections */
  .featured-section,
  .category-section {
    background: white;
    border-radius: 20px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .presidential {
    border-top: 5px solid #C8102E;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid #f0f0f0;
  }

  .section-header h2 {
    font-size: 1.5rem;
    margin: 0;
    color: #1a1a2e;
  }

  .district-label {
    color: #666;
    font-size: 0.9rem;
    margin: 5px 0 0 0;
  }

  .header-stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }

  .seat-count {
    background: #f0f0f0;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    color: #666;
    font-size: 0.9rem;
  }

  .vote-count {
    background: #C8102E;
    color: #FFFFFF;
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.2px;
    line-height: 1;
    box-shadow: 0 4px 10px rgba(200, 16, 46, 0.25);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* Presidential Cards */
  .candidates-showcase {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 25px;
    margin-bottom: 30px;
  }

  .candidate-card {
    background: #f8f9fa;
    border-radius: 16px;
    padding: 25px;
    text-align: center;
    position: relative;
    transition: all 0.3s ease;
    border: 3px solid transparent;
  }

  .candidate-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  }

  .candidate-card.winner {
    background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
    border-color: #ffc107;
    transform: scale(1.05);
  }

  .candidate-card.user-vote {
    border-color: #28a745;
    background: #d4edda;
  }

  .rank-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 2rem;
    z-index: 10;
  }

  .photo-frame {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto 15px;
  }

  .candidate-photo,
  .photo-placeholder {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid white;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .photo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fallback-symbol {
    width: 70%;
    height: 70%;
    object-fit: contain;
    border-radius: 50%;
  }

  .party-mini-symbol {
    position: absolute;
    bottom: -5px;
    right: -5px;
    width: 35px;
    height: 35px;
    background: white;
    border-radius: 50%;
    padding: 3px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .party-mini-symbol img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: contain;
  }

  .party-name {
    font-size: 1.1rem;
    margin: 0 0 10px 0;
    color: #1a1a2e;
  }

  .percentage-display {
    margin-bottom: 8px;
  }

  .percentage-number {
    font-size: 1.8rem;
    font-weight: 800;
    color: #C8102E;
  }

  .percentage-bar {
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
    margin-top: 5px;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 1s ease;
  }

  .vote-count-secondary {
    font-size: 0.85rem;
    color: #666;
  }

  .user-vote-ribbon {
    position: absolute;
    top: 15px;
    right: -10px;
    background: #28a745;
    color: white;
    padding: 5px 15px;
    font-size: 0.75rem;
    font-weight: bold;
    border-radius: 20px;
    transform: rotate(5deg);
  }

  /* Runoff Banner */
  .runoff-banner {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
    border: 2px solid #ffc107;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .runoff-icon {
    font-size: 3rem;
  }

  .runoff-content h4 {
    margin: 0 0 5px 0;
    color: #856404;
    font-size: 1.2rem;
  }

  .runoff-content p {
    margin: 0;
    color: #856404;
    font-size: 0.95rem;
  }

  /* Hemicycle Wrapper */
  .hemicycle-wrapper {
    margin: 30px 0;
    padding: 20px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 16px;
  }

  .no-seats-message {
    text-align: center;
    padding: 40px 20px;
    color: #666;
  }

  .no-seats-icon {
    font-size: 3rem;
    margin-bottom: 15px;
  }

  .no-seats-message p {
    font-size: 1.1rem;
    margin: 0 0 10px 0;
    font-weight: 500;
  }

  .no-seats-hint {
    font-size: 0.9rem;
    color: #999;
    background: #f0f0f0;
    padding: 5px 12px;
    border-radius: 15px;
  }

  /* Results List */
  .results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .result-item {
    display: grid;
    grid-template-columns: 35px 45px 1fr auto auto;
    align-items: center;
    gap: 15px;
    padding: 12px 15px;
    background: #f8f9fa;
    border-radius: 10px;
    transition: all 0.2s ease;
    border-left: 3px solid transparent;
  }

  .result-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
  }

  .result-item.user-vote {
    border-left-color: #28a745;
    background: #d4edda;
  }

  .rank {
    font-weight: 700;
    color: #999;
    text-align: center;
    font-size: 1.1rem;
  }

  .party-symbol {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 8px;
  }

  .party-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .party-info .name {
    font-weight: 600;
    color: #1a1a2e;
  }

  .mini-bar {
    height: 6px;
    background: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }

  .mini-bar .fill {
    height: 100%;
    border-radius: 3px;
    transition: width 1s ease;
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .seats-badge {
    color: white;
    padding: 4px 10px;
    border-radius: 15px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .percentage {
    font-weight: 700;
    color: #666;
    font-size: 1rem;
  }

  .user-mark {
    color: #28a745;
    font-size: 1.5rem;
    font-weight: bold;
  }

  /* Footer */
  .results-footer {
    text-align: center;
    padding: 40px 20px;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .btn-large {
    padding: 16px 32px;
    font-size: 1.1rem;
  }

  .btn-icon {
    font-size: 1.3rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, #C8102E, #a00d25);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 15px rgba(200, 16, 46, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(200, 16, 46, 0.4);
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-3px);
  }

  .btn-ghost {
    background: transparent;
    color: #666;
    border: 2px solid #ddd;
    border-radius: 12px;
    font-weight: 600;
    padding: 14px 28px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-ghost:hover {
    border-color: #999;
    background: #f8f9fa;
  }

  .btn-share {
    background: linear-gradient(135deg, #1da1f2, #0d8ecf);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    padding: 14px 28px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-share:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(29, 161, 242, 0.3);
  }

  .footer-stats {
    margin: 15px 0;
  }

  .footer-note {
    color: #666;
    font-size: 0.95rem;
    margin: 0;
    font-weight: 500;
  }

  .footer-separator {
    margin: 0 10px;
    color: #ccc;
  }

  .footer-real {
    color: #28a745;
    font-weight: 600;
  }

  .footer-disclaimer {
    color: #999;
    font-size: 0.8rem;
    margin: 10px 0 0 0;
  }

  /* New Simulation Card */
  .simulation-card {
    max-width: 720px;
    margin: 40px auto 56px;
    background: white;
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .card-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: #1a1a2e;
  }

  .card-text {
    font-size: 1rem;
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.5;
  }

  .new-simulation-btn {
    height: 56px;
    padding: 0 28px;
    min-width: 280px;
    width: 100%;
    max-width: 320px;
    border-radius: 14px;
    font-weight: 700;
    font-size: 18px;
    color: white;
    background: linear-gradient(135deg, #2196F3, #1976D2);
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
    transition: all 0.3s ease;
    margin-bottom: 20px;
  }

  .new-simulation-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
  }

  .new-simulation-btn:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .secondary-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn-outline {
    height: 44px;
    padding: 0 20px;
    border-radius: 12px;
    font-weight: 600;
    background: transparent;
    color: #666;
    border: 2px solid #ddd;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-outline:hover {
    border-color: #2196F3;
    color: #2196F3;
    background: rgba(33, 150, 243, 0.05);
  }

  /* Projection Card */
  .projection-card {
    max-width: 720px;
    margin: 0 auto 24px;
    background: white;
    border-radius: 18px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .projection-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 8px 0;
    color: #1a1a2e;
  }

  .projection-description {
    font-size: 1rem;
    color: #666;
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .projection-label {
    font-size: 14px;
    font-weight: 600;
    color: #1F2A44;
    margin-bottom: 10px;
  }

  .projection-selector {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .projection-option {
    height: 44px;
    padding: 0 16px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    transition: all 0.2s ease;
    background: #F5F7FB;
    color: #1F2A44;
    border: 1px solid #D9E2F2;
    cursor: pointer;
  }

  .projection-option.active {
    background: #2196F3;
    color: #FFFFFF;
    border: none;
  }

  .projection-option:hover:not(.active) {
    background: #E8EDF5;
  }

  .projection-note {
    font-size: 12px;
    color: #888;
    margin: 0;
    font-style: italic;
  }

  /* Mode Selector */
  .projection-section {
    margin-bottom: 20px;
  }

  .mode-selector {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .mode-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.2s ease;
    background: #F5F7FB;
    color: #1F2A44;
    border: 2px solid transparent;
    cursor: pointer;
    text-align: left;
  }

  .mode-option.active {
    background: #E3F2FD;
    border-color: #2196F3;
    color: #1565C0;
  }

  .mode-option:hover:not(.active) {
    background: #E8EDF5;
    border-color: #D9E2F2;
  }

  .mode-icon {
    font-size: 1.4rem;
    flex-shrink: 0;
  }

  .mode-name {
    flex: 1;
  }

  .mode-description {
    font-size: 13px;
    color: #666;
    margin: 8px 0 0 0;
    font-style: italic;
    padding-left: 4px;
  }

  /* Projection Banner */
  .projection-banner {
    background: #EAF3FF;
    color: #174A8B;
    border: 1px solid #CFE2FF;
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  }

  /* Projection Subtitle */
  .projection-subtitle {
    font-size: 12px;
    color: #2196F3;
    font-weight: 600;
    margin: 0 0 4px 0;
  }

  @media (max-width: 768px) {
    .projection-card {
      padding: 20px;
      margin: 0 10px 20px;
    }
    
    .projection-title {
      font-size: 1.3rem;
    }
    
    .projection-description {
      font-size: 0.9rem;
    }
    
    .projection-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .projection-option {
      width: 100%;
      height: 40px;
      padding: 0 12px;
      font-size: 13px;
    }
    
    .mode-option {
      padding: 12px 14px;
      font-size: 14px;
    }
    
    .mode-icon {
      font-size: 1.2rem;
    }
    
    .mode-description {
      font-size: 12px;
    }
    
    .projection-section {
      margin-bottom: 16px;
    }
  }

  /* Final Results Banner (when voting is closed) */
  .final-results-banner {
    background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
    border: 2px solid #ffc107;
    border-radius: 12px;
    padding: 20px 30px;
    margin-top: 20px;
    text-align: center;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .final-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #856404;
    margin: 0 0 8px 0;
  }

  .final-subtitle {
    font-size: 0.95rem;
    color: #856404;
    margin: 0;
    opacity: 0.9;
  }

  @media (max-width: 768px) {
    .final-results-banner {
      padding: 15px 20px;
      margin: 15px 15px 0 15px;
    }

    .final-title {
      font-size: 1.2rem;
    }

    .final-subtitle {
      font-size: 0.85rem;
    }
  }

  /* Governance Interpretation Section */
  .interpretation-section {
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    border-radius: 16px;
    padding: 25px;
    margin: 25px 0;
    border-left: 5px solid;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }

  .interpretation-title {
    font-size: 1.35rem;
    margin: 0 0 15px 0;
    color: #1a1a2e;
    font-weight: 700;
  }

  .interpretation-intro {
    font-size: 1.05rem;
    color: #444;
    line-height: 1.6;
    margin: 0 0 20px 0;
  }

  .hemicycle-reading {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .hemicycle-reading h4 {
    font-size: 1.1rem;
    margin: 0 0 12px 0;
    color: #1a1a2e;
  }

  .hemicycle-reading p {
    font-size: 0.95rem;
    color: #555;
    margin: 0 0 12px 0;
    line-height: 1.5;
  }

  .hemicycle-reading ul {
    margin: 0;
    padding-left: 20px;
  }

  .hemicycle-reading li {
    font-size: 0.9rem;
    color: #555;
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .hemicycle-reading li:last-child {
    margin-bottom: 0;
  }

  .classification-block {
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
  }

  .classification-badge {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 12px;
  }

  .classification-description {
    font-size: 1.05rem;
    color: #333;
    margin: 0 0 15px 0;
    font-weight: 500;
  }

  .micro-copy {
    font-size: 0.95rem;
    color: #555;
    line-height: 1.7;
    white-space: pre-line;
  }

  .educational-final {
    background: linear-gradient(135deg, #e8f4fd 0%, #d4ebfa 100%);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .edu-icon {
    font-size: 1.5rem;
  }

  .educational-final p {
    margin: 0;
    font-size: 0.95rem;
    color: #444;
    line-height: 1.6;
  }

  .educational-final p strong {
    color: #1a1a2e;
  }

  @media (max-width: 768px) {
    .interpretation-section {
      padding: 20px;
      margin: 20px 0;
    }

    .interpretation-title {
      font-size: 1.2rem;
    }

    .interpretation-intro {
      font-size: 0.95rem;
    }

    .hemicycle-reading {
      padding: 15px;
    }

    .classification-block {
      padding: 15px;
    }

    .classification-description {
      font-size: 0.95rem;
    }

    .micro-copy {
      font-size: 0.9rem;
    }

    .educational-final {
      padding: 15px;
    }

    .educational-final p {
      font-size: 0.9rem;
    }
  }

  /* Responsive */
  @media (max-width: 900px) {
    .hero-header {
      height: auto;
      min-height: 280px;
      padding: 24px 32px;
    }
    
    .header-content {
      flex-direction: column;
      gap: 24px;
      align-items: stretch;
    }
    
    .title-wrapper {
      max-width: 100%;
      text-align: center;
    }
    
    .title-row {
      justify-content: center;
    }

    .help-button-results {
      margin-top: 12px;
    }
    
    .main-title {
      font-size: 28px;
    }
    
    .live-stats-widget {
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }
  }

  @media (max-width: 768px) {
    .results-page {
      padding: 15px;
    }

    .hero-header {
      padding: 24px 20px;
      border-radius: 16px;
    }

    .main-title {
      font-size: 24px;
    }
    
    .title-icon {
      font-size: 32px;
    }

    .subtitle {
      font-size: 14px;
    }

    .header-content {
      flex-direction: column;
      text-align: center;
      gap: 20px;
    }
    
    .live-stats-widget {
      width: 100%;
      padding: 20px;
      gap: 12px;
    }
    
    .countdown-blocks {
      gap: 8px;
    }
    
    .time-number {
      font-size: 24px;
    }

    .candidates-showcase {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .candidate-card.winner {
      transform: none;
    }

    .result-item {
      grid-template-columns: 30px 35px 1fr;
    }

    .stats .percentage {
      grid-column: 3;
      justify-self: end;
    }

    .seats-badge {
      display: none;
    }

    .runoff-banner {
      flex-direction: column;
      text-align: center;
    }
    
    .simulation-card {
      padding: 24px 20px;
      margin: 30px auto 40px;
    }
    
    .card-title {
      font-size: 1.3rem;
    }
    
    .card-text {
      font-size: 0.95rem;
    }
    
    .secondary-actions {
      flex-direction: column;
      align-items: center;
    }
    
    .btn-outline {
      width: 100%;
      max-width: 280px;
    }
  }

  @media (max-width: 480px) {
    .hero-header {
      padding: 20px 16px;
      height: auto;
      min-height: auto;
    }
    
    .main-title {
      font-size: 20px;
    }
    
    .title-icon {
      font-size: 28px;
    }
    
    .title-wrapper {
      max-width: 100%;
    }

    .help-button-results {
      height: 36px;
      padding: 0 12px;
      font-size: 13px;
    }

    .help-text-results {
      display: none;
    }
    
    .live-stats-widget {
      width: 100%;
      max-width: 100%;
      padding: 16px;
      gap: 10px;
    }
    
    .countdown-blocks {
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .time-block {
      min-width: 35px;
    }
    
    .time-number {
      font-size: 20px;
    }
    
    .time-unit {
      font-size: 8px;
    }
    
    .countdown-subtitle {
      font-size: 10px;
    }
    
    .candidates-showcase {
      grid-template-columns: 1fr;
    }

    .photo-frame {
      width: 100px;
      height: 100px;
    }
    
    .new-simulation-btn {
      min-width: unset;
    }
  }

  @media (max-width: 380px) {
    .time-number {
      font-size: 18px;
    }
    
    .time-unit {
      display: none;
    }
  }

  /* Governance Analysis Section */
  .governance-section {
    background: white;
    border-radius: 20px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .governance-header {
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 20px;
    margin-bottom: 25px;
  }

  .governance-subtitle {
    color: #666;
    font-size: 0.95rem;
    margin: 5px 0 0 0;
  }

  .difficulty-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 20px;
    border-radius: 12px;
    font-weight: 600;
  }

  .difficulty-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .difficulty-value {
    font-size: 1.1rem;
  }

  .scenario-card {
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    border-radius: 16px;
    padding: 25px;
    border-left: 5px solid;
    margin-bottom: 25px;
  }

  .scenario-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
  }

  .scenario-icon {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    flex-shrink: 0;
  }

  .scenario-titles {
    flex: 1;
  }

  .scenario-title {
    font-size: 1.4rem;
    margin: 0 0 5px 0;
    color: #1a1a2e;
  }

  .scenario-subtitle {
    font-size: 0.95rem;
    color: #666;
    margin: 0;
  }

  .scenario-description {
    font-size: 1.05rem;
    color: #444;
    line-height: 1.6;
    margin: 0 0 20px 0;
    padding: 15px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .implications-section {
    margin-bottom: 20px;
  }

  .implications-section h4 {
    font-size: 1.1rem;
    margin: 0 0 15px 0;
    color: #1a1a2e;
  }

  .implications-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .implications-list li {
    padding: 12px 15px;
    background: white;
    border-radius: 10px;
    font-size: 0.95rem;
    color: #444;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    position: relative;
    padding-left: 35px;
  }

  .implications-list li::before {
    content: '•';
    position: absolute;
    left: 15px;
    color: #C8102E;
    font-weight: bold;
    font-size: 1.2rem;
  }

  .educational-tip {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    gap: 15px;
    align-items: flex-start;
  }

  .tip-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .tip-content {
    flex: 1;
  }

  .tip-content strong {
    display: block;
    margin-bottom: 8px;
    color: #1565c0;
    font-size: 0.95rem;
  }

  .tip-content p {
    margin: 0;
    font-size: 0.9rem;
    color: #444;
    line-height: 1.5;
  }

  .scenarios-grid {
    background: #f8f9fa;
    border-radius: 16px;
    padding: 25px;
  }

  .scenarios-title {
    margin: 0 0 20px 0;
    font-size: 1.1rem;
    color: #1a1a2e;
  }

  .scenario-comparison {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  .scenario-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 2px solid transparent;
    transition: all 0.2s ease;
  }

  .scenario-item.active {
    border-color: #C8102E;
    box-shadow: 0 4px 12px rgba(200, 16, 46, 0.15);
  }

  .item-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .item-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .item-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: #1a1a2e;
  }

  .item-difficulty {
    font-size: 0.75rem;
    padding: 3px 8px;
    border-radius: 10px;
    font-weight: 600;
  }

  .item-difficulty.easy {
    background: #d4edda;
    color: #155724;
  }

  .item-difficulty.moderate {
    background: #fff3cd;
    color: #856404;
  }

  .item-difficulty.difficult {
    background: #f8d7da;
    color: #721c24;
  }

  @media (max-width: 768px) {
    .governance-section {
      padding: 20px;
    }

    .scenario-header {
      flex-direction: column;
      text-align: center;
    }

    .scenario-icon {
      width: 50px;
      height: 50px;
      font-size: 1.5rem;
    }

    .scenario-title {
      font-size: 1.2rem;
    }

    .scenario-comparison {
      grid-template-columns: 1fr;
    }

    .educational-tip {
      flex-direction: column;
      text-align: center;
    }
  }

  /* Global Interpretation Section */
  .global-interpretation {
    max-width: 760px;
    margin: 32px auto;
    padding: 24px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .interpretation-main-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0 0 16px 0;
    text-align: center;
  }

  .interpretation-main-text {
    font-size: 1.05rem;
    line-height: 1.6;
    color: #444;
    text-align: center;
    margin: 0 0 24px 0;
  }

  .scenario-classification {
    border: 2px solid;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    text-align: center;
  }

  .scenario-badge {
    display: inline-block;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.95rem;
    font-weight: 700;
    color: white;
    margin-bottom: 12px;
  }

  .scenario-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0 0 12px 0;
  }

  .scenario-description {
    font-size: 1rem;
    line-height: 1.6;
    color: #555;
    margin: 0;
  }

  .congress-note {
    background: linear-gradient(135deg, #e8f4fd 0%, #d4ebfa 100%);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .note-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .note-content strong {
    display: block;
    font-size: 1.05rem;
    color: #1565c0;
    margin-bottom: 8px;
  }

  .note-content p {
    font-size: 0.95rem;
    color: #444;
    line-height: 1.5;
    margin: 0;
  }

  /* Educational Footer */
  .educational-footer {
    max-width: 760px;
    margin: 40px auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .footer-block {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .footer-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .footer-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0 0 8px 0;
  }

  .footer-text {
    font-size: 0.95rem;
    line-height: 1.6;
    color: #555;
    margin: 0;
  }

  /* Projection Explainer */
  .projection-explainer {
    font-size: 13px;
    color: #666;
    margin: 12px 0 0 0;
    font-style: italic;
    line-height: 1.5;
  }

  .projection-explanation {
    max-width: 760px;
    margin: 12px auto 24px;
    padding: 0 20px;
    font-size: 0.95rem;
    color: #555;
    text-align: center;
    font-style: italic;
  }

  @media (max-width: 768px) {
    .global-interpretation {
      padding: 20px;
      margin: 24px 16px;
    }

    .interpretation-main-title {
      font-size: 1.3rem;
    }

    .interpretation-main-text {
      font-size: 0.95rem;
    }

    .scenario-title {
      font-size: 1.1rem;
    }

    .congress-note {
      flex-direction: column;
      text-align: center;
    }

    .educational-footer {
      margin: 32px 16px;
    }

    .footer-block {
      flex-direction: column;
      text-align: center;
      padding: 20px;
    }

    .footer-title {
      font-size: 1.05rem;
    }

    .footer-text {
      font-size: 0.9rem;
    }

    .projection-explanation {
      padding: 0 16px;
      font-size: 0.9rem;
    }
  }
</style>
