<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { vote } from '$lib/stores/vote.svelte';
  import { resetAllSelections } from '$lib/stores/preferencePicker.svelte';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import ParliamentHemicycle from '$lib/components/ParliamentHemicycle.svelte';
  import ShareResults from '$lib/components/ShareResults.svelte';
  import { getGlobalResultsWithPercentages, getGlobalStats, subscribeToGlobalStats } from '$lib/firebase/stats';
  import { initializeFirebase, isFirebaseReady, getVotingStatus } from '$lib/firebase';
  import type { GlobalStats } from '$lib/firebase/config';
  import type { Unsubscribe } from 'firebase/firestore';
  
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
  let nextResetTime = $state<Date | null>(null);
  let activeCategory = $state<string | null>(null);
  let showConfetti = $state(false);
  let showShareModal = $state(false);
  let isLoading = $state(true);
  let totalVoters = $state(0);
  let liveVoterCount = $state(0); // Contador en vivo
  let lastUpdateTime = $state<Date | null>(null);
  let unsubscribe: Unsubscribe | null = null;
  let restarting = $state(false);
  
  // ─── Proyección de simulación ────────────────────────────────────────────────
  let projectionMultiplier = $state(1);
  
  // Options for projection
  const projectionOptions = [
    { label: 'Solo tú (x1)', value: 1 },
    { label: '10 personas', value: 10 },
    { label: '100 personas', value: 100 },
    { label: '1000 personas', value: 1000 }
  ];
  
  // Load saved projection from sessionStorage and hydrate vote store
  onMount(() => {
    const savedMultiplier = sessionStorage.getItem('projection_multiplier');
    if (savedMultiplier) {
      projectionMultiplier = parseInt(savedMultiplier, 10);
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
  
  // Calculate projected results - force update when multiplier changes
  let projectedResults = $state([...allResults]);
  
  // Watch for changes and recalculate
  $effect(() => {
    console.log('🔄 Efecto de proyección ejecutándose. Multiplier:', projectionMultiplier);
    
    if (projectionMultiplier === 1 || allResults.length === 0) {
      projectedResults = [...allResults];
      return;
    }
    
    const extra = getHypotheticalExtra(projectionMultiplier);
    const cloned = JSON.parse(JSON.stringify(allResults));
    
    // Apply extra votes to user's selections
    for (const userVote of userVotes) {
      const category = cloned.find(c => c.categoryId === userVote.colId || c.category === userVote.category);
      if (category) {
        const result = category.results.find(r => r.partyName === userVote.partyName);
        if (result) {
          result.votes += extra;
        }
        category.totalVotes += extra;
      }
    }
    
    // Recalculate percentages
    for (const category of cloned) {
      for (const result of category.results) {
        result.percentage = category.totalVotes > 0 
          ? (result.votes / category.totalVotes) * 100 
          : 0;
      }
      category.results.sort((a, b) => b.votes - a.votes);
    }
    
    console.log('✨ Asignando nuevos projectedResults:', cloned[0]?.results?.[0]?.votes);
    projectedResults = cloned;
  });
  
  // Display results (real or projected)
  let displayResults = $state([...allResults]);
  
  // Track previous values to force updates
  let previousMultiplier = $state(1);
  
  // Update display results when projection changes
  $effect(() => {
    const currentMultiplier = projectionMultiplier;
    console.log('🎭 Efecto displayResults. Previo:', previousMultiplier, 'Actual:', currentMultiplier);
    
    if (currentMultiplier !== previousMultiplier) {
      previousMultiplier = currentMultiplier;
      
      if (currentMultiplier === 1) {
        displayResults = JSON.parse(JSON.stringify(allResults));
        console.log('✅ displayResults actualizado con resultados reales');
      } else {
        displayResults = JSON.parse(JSON.stringify(projectedResults));
        console.log('✅ displayResults actualizado con proyección. Votos:', displayResults[0]?.results?.[0]?.votes);
      }
    }
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
  
  // Check voting status (00:00 - 20:00 open, 20:00 - 23:59 closed)
  function checkVotingStatus() {
    votingStatus = getVotingStatus();
    
    // Calculate next reset time (midnight)
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    nextResetTime = midnight;
  }
  
  // Load real results from Firestore
  async function loadRealResults(): Promise<CategoryResults[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize Firebase if not ready
    if (!isFirebaseReady) {
      initializeFirebase();
    }
    
    // Get global stats from Firestore
    const globalStats = await getGlobalStats(today);
    const resultsWithPercentages = await getGlobalResultsWithPercentages(today);
    
    // Get user's votes from store
    const userVotes = Array.from(vote.votes.entries());
    
    const categories = [
      { id: 'president', name: 'Presidente', subtitle: 'y Vicepresidentes', totalSeats: 1, colId: 'col0' },
      { id: 'senatorsNational', name: 'Senadores', subtitle: 'Nacionales', totalSeats: 30, colId: 'col1' },
      { id: 'senatorsRegional', name: 'Senadores', subtitle: 'Regionales', totalSeats: 30, colId: 'col2' },
      { id: 'deputies', name: 'Diputados', subtitle: '130 escaños', totalSeats: 130, colId: 'col3' },
      { id: 'andeanParliament', name: 'Parlamento', subtitle: 'Andino', totalSeats: 5, colId: 'col4' }
    ];
    
    // Set total simulations from global stats (cada simulación completa = 1, no 5 votos)
    totalVoters = globalStats?.totalSimulations || Math.floor((globalStats?.totalVotes || 0) / 5) || 0;
    const totalVoteCount = totalVoters; // Total de simulaciones para decidir qué mostrar
    
    return categories.map(cat => {
      // Find user's vote for this category
      const userVoteForCategory = userVotes.find(([colId]) => colId === cat.colId);
      const userPartyName = userVoteForCategory ? userVoteForCategory[1].partyName : null;
      
      // Get real results for this category from Firestore
      const realResults = resultsWithPercentages?.[cat.id] || [];
      
      // Map real results to ElectionResult format
      let parties: ElectionResult[];
      
      if (realResults.length === 0) {
        // No votes at all in this category - return empty array
        // The UI will show a message instead
        parties = [];
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
      if (cat.totalSeats > 1 && realResults.length > 0 && totalVoteCount >= 5) {
        // Only create seats when there are enough total votes
        parties.forEach(party => {
          const partySeats = party.seats || 0;
          for (let i = 0; i < partySeats; i++) {
            seatDistribution.push({
              partyColor: party.partyColor,
              partyName: party.partyName,
              partySymbolUrl: party.partySymbolUrl
            });
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
      allResults = await loadRealResults();
    } catch (err) {
      console.error('Error loading results:', err);
    } finally {
      isLoading = false;
    }
    
    // Subscribe to live voter count updates
    if (isFirebaseReady) {
      const today = new Date().toISOString().split('T')[0];
      unsubscribe = subscribeToGlobalStats(today, (stats: GlobalStats | null) => {
      if (stats) {
        // Usar totalSimulations si existe, sino calcular aproximado (totalVotes / 5)
        liveVoterCount = stats.totalSimulations || Math.floor((stats.totalVotes || 0) / 5) || 0;
        lastUpdateTime = new Date();
        
        // If results changed significantly, reload them
        if (Math.abs(liveVoterCount - totalVoters) > 0) {
          totalVoters = liveVoterCount;
            // Refresh results to show new data
            loadRealResults().then(newResults => {
              allResults = newResults;
            }).catch(err => {
              console.error('Error refreshing results:', err);
            });
          }
        }
      });
    }
    
    // Trigger confetti after a delay
    setTimeout(() => {
      showConfetti = true;
    }, 500);
    
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
    };
  });
  
  // Cleanup on component destroy
  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  
  // Format countdown
  function formatCountdown(target: Date): string {
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return '00:00:00';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Check absolute majority
  function hasAbsoluteMajority(results: ElectionResult[]): boolean {
    return results.length > 0 && results[0].percentage > 50;
  }
  
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
  <title>Resultados Electorales 2026 | Simulación</title>
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
  <!-- Animated Header -->
  <header class="hero-header" in:fly={{ y: -30, duration: 800 }}>
    <div class="header-content">
      <div class="title-wrapper">
        <h1 class="main-title">
          <span class="title-icon">🗳️</span>
          Resultados Electorales
        </h1>
        <p class="subtitle">Elecciones Generales Perú 2026</p>
      </div>
      
      <!-- Live Stats Widget (Right Side) -->
      <div class="live-stats-widget" in:fly={{ x: 30, duration: 600, delay: 300 }}>
        <div class="widget-header">
          <span class="live-pulse"></span>
          <span class="live-label">{votingStatus === 'closed' ? 'VOTACIÓN CERRADA' : 'ACTIVIDAD EN VIVO'}</span>
          {#if votingStatus === 'open' && nextResetTime}
            <span class="widget-timer">{formatCountdown(nextResetTime)}</span>
          {/if}
        </div>
        
        <div class="widget-body">
          <div class="widget-icon">🗳️</div>
          <div class="widget-data">
            <span class="widget-number">{liveVoterCount.toLocaleString()}</span>
            <span class="widget-unit">votos</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Final Results Banner (when voting is closed) -->
    {#if votingStatus === 'closed'}
      <div class="final-results-banner" in:fade={{ duration: 300, delay: 400 }}>
        <h2 class="final-title">Resultados finales del día</h2>
        <p class="final-subtitle">Las simulaciones se cerraron a las 20:00. Estos resultados ya no cambian.</p>
      </div>
    {/if}
  </header>

  <!-- Projection Banner (when viewing projection) -->
  {#if projectionMultiplier > 1}
    <div class="projection-banner" in:fade={{ duration: 300 }}>
      Viendo proyección: {projectionMultiplier} personas votarían igual que tú
    </div>
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
              <span class="vote-count">{candidate.votes.toLocaleString()} votos</span>
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
            <ParliamentHemicycle 
              seats={category.seatDistribution}
              totalSeats={category.totalSeats}
            />
          {:else}
            <!-- Hay votos pero no suficientes para escaños -->
            <div class="no-seats-message">
              <div class="no-seats-icon">📊</div>
              <p>Se necesitan más votos para calcular escaños</p>
              <span class="no-seats-hint">Mínimo: {category.totalSeats * 10} votos</span>
            </div>
          {/if}
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

  <!-- Share Modal -->
  {#if showShareModal}
    <ShareResults results={shareData} onClose={() => showShareModal = false} />
  {/if}

  <!-- New Simulation Card -->
  <div class="simulation-card" in:fly={{ y: 30, duration: 600, delay: 800 }}>
    <div class="card-icon">🔄</div>
    <h2 class="card-title">¿Quieres probar otra combinación?</h2>
    <p class="card-text">Empieza una nueva simulación desde cero y compara cómo cambian los resultados.</p>
    
    <button 
      class="new-simulation-btn" 
      class:loading={restarting}
      disabled={restarting}
      onclick={startNewSimulation}
    >
      {#if restarting}
        Preparando nueva simulación...
      {:else}
        🔄 Nueva simulación
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
      <p class="projection-description">Simula cómo cambiarían los resultados si más personas votaran igual que tú.</p>
      
      <div class="projection-label">Escenario de proyección</div>
      
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
      
      <p class="projection-note">Esto es una proyección y no modifica los resultados reales del día.</p>
    </div>
  {/if}
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

  /* Hero Header */
  .hero-header {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    padding: 40px 30px;
    border-radius: 20px;
    margin-bottom: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
  }

  .main-title {
    font-size: 2.5rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 15px;
    font-weight: 800;
  }

  .title-icon {
    font-size: 3rem;
  }

  .subtitle {
    font-size: 1.1rem;
    opacity: 0.8;
    margin: 5px 0 0 0;
  }

  /* Live Stats Widget */
  .live-stats-widget {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-radius: 20px;
    padding: 20px 25px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .widget-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  .live-pulse {
    width: 10px;
    height: 10px;
    background: #00ff88;
    border-radius: 50%;
    animation: widget-pulse 2s infinite;
    box-shadow: 0 0 10px #00ff88;
  }

  @keyframes widget-pulse {
    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px #00ff88; }
    50% { opacity: 0.7; transform: scale(1.2); box-shadow: 0 0 20px #00ff88; }
  }

  .live-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .live-stats-widget {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-radius: 20px;
    padding: 20px 25px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 
      0 10px 40px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .widget-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  }

  .live-pulse {
    width: 10px;
    height: 10px;
    background: #00ff88;
    border-radius: 50%;
    animation: widget-pulse 2s infinite;
    box-shadow: 0 0 10px #00ff88;
  }

  @keyframes widget-pulse {
    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 10px #00ff88; }
    50% { opacity: 0.7; transform: scale(1.2); box-shadow: 0 0 20px #00ff88; }
  }

  .widget-timer {
    margin-left: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(0, 0, 0, 0.2);
    padding: 4px 8px;
    border-radius: 6px;
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
    .projection-selector {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .projection-option {
      width: 100%;
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

  /* Responsive */
  @media (max-width: 768px) {
    .results-page {
      padding: 15px;
    }

    .hero-header {
      padding: 30px 20px;
    }

    .main-title {
      font-size: 1.8rem;
    }

    .header-content {
      flex-direction: column;
      text-align: center;
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
</style>
