<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { vote } from '$lib/stores/vote.svelte';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  
  // Get party data from BALLOT_COLUMNS
  const presidentialRows = BALLOT_COLUMNS[0].rows.filter(r => r.partyName);
  const legislativeRows = BALLOT_COLUMNS[1].rows.filter(r => r.partyName);
  
  // Create party lookup maps
  const partyData = new Map();
  
  // Presidential parties (with photos)
  presidentialRows.forEach(row => {
    partyData.set(row.partyName, {
      id: row.partyAbbr,
      name: row.partyName,
      color: row.partyColor,
      symbolUrl: row.partySymbolUrl,
      photoUrl: row.presidentialPhoto,
      isPresidential: true
    });
  });
  
  // Legislative parties (with symbols only)
  legislativeRows.forEach(row => {
    if (!partyData.has(row.partyName)) {
      partyData.set(row.partyName, {
        id: row.partyAbbr,
        name: row.partyName,
        color: row.partyColor,
        symbolUrl: row.partySymbolUrl,
        photoUrl: null,
        isPresidential: false
      });
    }
  });
  
  // Types
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
    userVote?: string;
  }
  
  // State
  let allResults = $state<CategoryResults[]>([]);
  let isVotingClosed = $state(false);
  let currentTime = $state(new Date());
  let nextResetTime = $state<Date | null>(null);
  
  // Check if voting is closed (after 20:00)
  function checkVotingStatus() {
    const now = new Date();
    const hour = now.getHours();
    isVotingClosed = hour >= 20;
    
    // Calculate next reset time (midnight)
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    nextResetTime = midnight;
  }
  
  // Generate simulated results using real party data
  function generateSimulatedResults(): CategoryResults[] {
    const categories = [
      { id: 'presidente', name: 'Presidente y Vicepresidentes', totalSeats: 1 },
      { id: 'senadores-nacional', name: 'Senadores Nacionales', totalSeats: 30 },
      { id: 'senadores-regional', name: 'Senadores Regionales', totalSeats: 30 },
      { id: 'diputados', name: 'Diputados', totalSeats: 130 },
      { id: 'parlamento-andino', name: 'Parlamento Andino', totalSeats: 5 }
    ];
    
    // Get array of parties for this category
    function getPartiesForCategory(catId: string): ElectionResult[] {
      if (catId === 'presidente') {
        // Use presidential parties (with photos)
        return presidentialRows.map(row => ({
          partyId: row.partyAbbr,
          partyName: row.partyName,
          partyColor: row.partyColor,
          partySymbolUrl: row.partySymbolUrl || '',
          photoUrl: row.presidentialPhoto || null,
          votes: 0,
          percentage: 0
        }));
      } else {
        // Use legislative parties (symbols only)
        return legislativeRows.map(row => ({
          partyId: row.partyAbbr,
          partyName: row.partyName,
          partyColor: row.partyColor,
          partySymbolUrl: row.partySymbolUrl || '',
          photoUrl: null,
          votes: 0,
          percentage: 0
        }));
      }
    }
    
    // Get user's votes from store
    const userVotes = Array.from(vote.votes.entries());
    
    return categories.map(cat => {
      // Find user's vote for this category
      const userVoteForCategory = userVotes.find(([colId]) => {
        return colId === cat.id;
      });
      
      const userPartyName = userVoteForCategory ? userVoteForCategory[1].partyName : null;
      
      // Get parties for this category
      let parties = getPartiesForCategory(cat.id);
      
      // Generate random percentages
      let remaining = 100;
      const partyCount = parties.length;
      
      parties = parties.map((party, index) => {
        let percentage;
        if (index === partyCount - 1) {
          percentage = remaining;
        } else {
          // Give user's party a boost
          if (party.partyName === userPartyName) {
            percentage = Math.random() * 12 + 18; // 18-30%
          } else {
            percentage = Math.random() * 8 + 2; // 2-10%
          }
          remaining -= percentage;
        }
        
        return {
          ...party,
          percentage: Math.max(0, percentage)
        };
      });
      
      // Normalize to 100%
      const total = parties.reduce((sum, r) => sum + r.percentage, 0);
      parties = parties.map(r => {
        const normalizedPercentage = (r.percentage / total) * 100;
        return {
          ...r,
          percentage: normalizedPercentage,
          votes: Math.floor(normalizedPercentage * 184.5) // ~18,450 total votes
        };
      });
      
      // Sort by percentage (descending)
      parties.sort((a, b) => b.percentage - a.percentage);
      
      return {
        category: cat.name,
        categoryId: cat.id,
        totalVotes: parties.reduce((sum, r) => sum + r.votes, 0),
        totalSeats: cat.totalSeats,
        results: parties,
        userVote: userPartyName || undefined
      };
    });
  }
  
  // Calculate seats for congressional categories
  function calculateSeats(results: ElectionResult[], totalSeats: number): ElectionResult[] {
    const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
    
    // First pass: calculate proportional seats
    let calculated = results.map(r => ({
      ...r,
      seats: Math.floor((r.percentage / totalPercentage) * totalSeats)
    }));
    
    // Check if we need to distribute remaining seats
    const assignedSeats = calculated.reduce((sum, r) => sum + (r.seats || 0), 0);
    const remainingSeats = totalSeats - assignedSeats;
    
    // Assign remaining seats to top parties
    if (remainingSeats > 0) {
      for (let i = 0; i < remainingSeats && i < calculated.length; i++) {
        calculated[i].seats = (calculated[i].seats || 0) + 1;
      }
    }
    
    return calculated;
  }
  
  // Check if any presidential candidate has >50%
  function hasAbsoluteMajority(results: ElectionResult[]): boolean {
    if (results.length === 0) return false;
    return results[0].percentage > 50;
  }
  
  // Get top 2 for runoff
  function getRunoffCandidates(results: ElectionResult[]): ElectionResult[] {
    return results.slice(0, 2);
  }
  
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
  
  // Initialize
  onMount(() => {
    checkVotingStatus();
    allResults = generateSimulatedResults();
    
    // Update countdown every second
    const interval = setInterval(() => {
      currentTime = new Date();
      checkVotingStatus();
    }, 1000);
    
    return () => clearInterval(interval);
  });
  
  // Go back to voting
  function goBack() {
    goto('/simular');
  }
  
  // Reset for new day
  function resetForNewDay() {
    vote.reset();
    goto('/simular');
  }
  
  // Save daily winner to localStorage
  function saveDailyWinner() {
    const today = new Date().toISOString().split('T')[0];
    const winners = allResults.map(r => ({
      category: r.category,
      winner: r.results[0]
    }));
    
    const history = JSON.parse(localStorage.getItem('dailyvote_history') || '[]');
    history.push({ date: today, winners });
    
    // Keep only last 30 days
    if (history.length > 30) history.shift();
    
    localStorage.setItem('dailyvote_history', JSON.stringify(history));
    localStorage.setItem(`dailyvote_winner_${today}`, JSON.stringify(winners));
  }
  
  $effect(() => {
    if (isVotingClosed) {
      saveDailyWinner();
    }
  });
  
  // Generate grid layout for seats visualization
  function generateSeatsGrid(results: ElectionResult[], totalSeats: number): ElectionResult[] {
    const withSeats = calculateSeats(results, totalSeats);
    const grid: ElectionResult[] = [];
    
    withSeats.forEach(party => {
      const count = party.seats || 0;
      for (let i = 0; i < count; i++) {
        grid.push(party);
      }
    });
    
    return grid;
  }
</script>

<svelte:head>
  <title>Resultados Electorales - Simulación 2026</title>
</svelte:head>

<div class="results-page">
  <!-- Header -->
  <header class="results-header">
    <h1>🗳️ Resultados Electorales</h1>
    <div class="subtitle">
      <span>Simulación Elecciones Perú 2026</span>
      {#if isVotingClosed}
        <span class="closed-badge">VOTACIÓN CERRADA</span>
      {:else}
        <span class="live-badge">CONTEO EN VIVO</span>
      {/if}
    </div>
    
    {#if !isVotingClosed && nextResetTime}
      <div class="countdown">
        Cierra en: {formatCountdown(nextResetTime)}
      </div>
    {:else if isVotingClosed && nextResetTime}
      <div class="countdown reset">
        Nueva votación en: {formatCountdown(nextResetTime)}
      </div>
    {/if}
  </header>

  <!-- Presidential Results -->
  {#if allResults[0]}
    <section class="category-section presidential" in:fly={{ y: 20, duration: 500 }}>
      <h2>Presidente y Vicepresidentes</h2>
      
      <div class="presidential-grid">
        {#each allResults[0].results.slice(0, 6) as result, i}
          <div class="presidential-card" 
               class:winner={i === 0} 
               class:user-vote={result.partyName === allResults[0].userVote}>
            <div class="photo-container">
              {#if result.photoUrl}
                <img src={result.photoUrl} alt={result.partyName} class="candidate-photo" />
              {:else}
                <div class="photo-placeholder" style="background-color: {result.partyColor}">
                  {result.partyId}
                </div>
              {/if}
              <div class="rank-badge">{i + 1}</div>
            </div>
            
            <div class="party-info">
              <div class="party-symbol-small">
                <img src={result.partySymbolUrl} alt="" />
              </div>
              <div class="party-name">{result.partyName}</div>
              <div class="percentage">{result.percentage.toFixed(1)}%</div>
              <div class="votes">{result.votes.toLocaleString()} votos</div>
            </div>
            
            {#if result.partyName === allResults[0].userVote}
              <div class="user-vote-badge">TU VOTO</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Analysis -->
      <div class="analysis">
        {#if hasAbsoluteMajority(allResults[0].results)}
          <div class="majority-win">
            🏆 <strong>{allResults[0].results[0].partyName}</strong> gana con mayoría absoluta
          </div>
        {:else}
          <div class="runoff-section">
            <div class="runoff-title">📢 Segunda Vuelta Requerida</div>
            <p>Al no alcanzar ningún candidato más del 50% de los votos válidos, los 2 candidatos más votados pasan a segunda vuelta el <strong>7 de junio de 2026</strong>.</p>
            
            <div class="runoff-candidates">
              {#each getRunoffCandidates(allResults[0].results) as candidate, i}
                <div class="runoff-card" class:first={i === 0}>
                  <div class="runoff-rank">{i === 0 ? '🥇' : '🥈'}</div>
                  <img src={candidate.photoUrl || candidate.partySymbolUrl} alt="" class="runoff-photo" />
                  <div class="runoff-name">{candidate.partyName}</div>
                  <div class="runoff-percentage">{candidate.percentage.toFixed(1)}%</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Congressional Categories -->
  {#each allResults.slice(1) as category, index}
    <section class="category-section" in:fly={{ y: 20, duration: 500, delay: index * 100 }}>
      <h2>{category.category}</h2>
      <div class="seats-info">
        <span class="total-seats">{category.totalSeats} escaños</span>
        <span class="district-info">
          {index === 0 ? 'Distrito: Nacional único' : index === 1 ? 'Distrito: Lima Metropolitana' : index === 2 ? 'Distrito: Lima' : 'Distrito: Nacional único'}
        </span>
      </div>
      
      <!-- Results List with Symbols -->
      <div class="congress-list">
        {#each calculateSeats(category.results, category.totalSeats).slice(0, 8) as result, i}
          <div class="congress-item" class:user-vote={result.partyName === category.userVote}>
            <div class="rank">{i + 1}</div>
            <img src={result.partySymbolUrl} alt="" class="party-symbol" />
            <div class="party-details">
              <div class="name">{result.partyName}</div>
              <div class="bar-container">
                <div class="bar" style="width: {result.percentage}%; background-color: {result.partyColor}"></div>
              </div>
            </div>
            <div class="stats">
              <div class="seats">{result.seats || 0} escaños</div>
              <div class="percentage">{result.percentage.toFixed(1)}%</div>
            </div>
            {#if result.partyName === category.userVote}
              <div class="user-badge">TU VOTO</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Visual Seat Distribution -->
      <div class="seats-visualization">
        <h3>Distribución de Escaños</h3>
        <div class="seats-grid" style="--cols: {Math.ceil(Math.sqrt(category.totalSeats))}">
          {#each generateSeatsGrid(category.results, category.totalSeats) as seat, i}
            <div class="seat" 
                 style="background-color: {seat.partyColor}"
                 title="{seat.partyName}">
            </div>
          {/each}
        </div>
        
        <!-- Legend -->
        <div class="legend">
          {#each calculateSeats(category.results, category.totalSeats).slice(0, 6) as result}
            <div class="legend-item">
              <div class="legend-color" style="background-color: {result.partyColor}"></div>
              <img src={result.partySymbolUrl} alt="" class="legend-symbol" />
              <span class="legend-name">{result.partyName}</span>
              <span class="legend-seats">{result.seats} esc.</span>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/each}

  <!-- Footer -->
  <footer class="results-footer">
    {#if isVotingClosed}
      <div class="winners-section">
        <h3>🏆 Ganadores del Día {new Date().toLocaleDateString()}</h3>
        <div class="winners-grid">
          {#each allResults as result}
            <div class="winner-mini-card">
              <div class="winner-category">{result.category}</div>
              <img src={result.results[0].photoUrl || result.results[0].partySymbolUrl} alt="" class="winner-image" />
              <div class="winner-party" style="color: {result.results[0].partyColor}">
                {result.results[0].partyName}
              </div>
              <div class="winner-stats">{result.results[0].percentage.toFixed(1)}% - {result.totalSeats === 1 ? '1 cargo' : result.results[0].seats + ' escaños'}</div>
            </div>
          {/each}
        </div>
      </div>
      
      <div class="actions">
        <button class="btn-primary" onclick={resetForNewDay}>
          Volver Mañana
        </button>
        <button class="btn-secondary" onclick={goBack}>
          ← Volver a Simular
        </button>
      </div>
    {:else}
      <div class="actions">
        <button class="btn-secondary" onclick={goBack}>
          ← Volver a la Cédula
        </button>
      </div>
    {/if}
  </footer>
</div>

<style>
  .results-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 20px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .results-header {
    text-align: center;
    margin-bottom: 30px;
    padding: 30px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .results-header h1 {
    font-size: 2.5rem;
    margin: 0 0 10px 0;
    color: #1a1a2e;
    font-weight: 800;
  }

  .subtitle {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    font-size: 1.2rem;
    color: #4a4a6a;
    flex-wrap: wrap;
  }

  .live-badge, .closed-badge {
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: bold;
    text-transform: uppercase;
  }

  .live-badge {
    background: #28a745;
    color: white;
    animation: pulse 2s infinite;
  }

  .closed-badge {
    background: #dc3545;
    color: white;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); }
    50% { opacity: 0.9; box-shadow: 0 0 0 10px rgba(40, 167, 69, 0); }
  }

  .countdown {
    margin-top: 20px;
    font-size: 2rem;
    font-weight: bold;
    color: #C8102E;
    font-family: 'Courier New', monospace;
    letter-spacing: 2px;
  }

  .countdown.reset {
    color: #6c757d;
  }

  .category-section {
    background: white;
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .category-section h2 {
    margin: 0 0 20px 0;
    color: #1a1a2e;
    font-size: 1.5rem;
    font-weight: 700;
    border-left: 4px solid #C8102E;
    padding-left: 15px;
  }

  .presidential {
    border-top: 4px solid #C8102E;
  }

  /* Presidential Grid */
  .presidential-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .presidential-card {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 15px;
    text-align: center;
    position: relative;
    transition: all 0.3s ease;
    border: 2px solid transparent;
  }

  .presidential-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .presidential-card.winner {
    background: #fff3cd;
    border-color: #ffc107;
    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3);
  }

  .presidential-card.user-vote {
    border-color: #28a745;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
  }

  .photo-container {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 10px;
  }

  .candidate-photo, .photo-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }

  .photo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 0.8rem;
  }

  .rank-badge {
    position: absolute;
    top: -5px;
    left: -5px;
    width: 28px;
    height: 28px;
    background: #C8102E;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.9rem;
    border: 2px solid white;
  }

  .party-symbol-small {
    width: 30px;
    height: 30px;
    margin: 0 auto 5px;
  }

  .party-symbol-small img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .party-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: #1a1a2e;
    margin-bottom: 5px;
    line-height: 1.2;
  }

  .percentage {
    font-size: 1.2rem;
    font-weight: bold;
    color: #C8102E;
  }

  .votes {
    font-size: 0.75rem;
    color: #6c757d;
  }

  .user-vote-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #28a745;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.65rem;
    font-weight: bold;
  }

  /* Analysis Section */
  .analysis {
    background: #e3f2fd;
    border-radius: 12px;
    padding: 25px;
    border-left: 4px solid #2196f3;
  }

  .majority-win {
    font-size: 1.2rem;
    color: #155724;
    background: #d4edda;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  .runoff-section {
    text-align: center;
  }

  .runoff-title {
    font-size: 1.3rem;
    font-weight: bold;
    color: #856404;
    margin-bottom: 10px;
  }

  .runoff-section p {
    color: #4a4a6a;
    margin-bottom: 20px;
    font-size: 0.95rem;
  }

  .runoff-candidates {
    display: flex;
    justify-content: center;
    gap: 30px;
    flex-wrap: wrap;
  }

  .runoff-card {
    background: white;
    border-radius: 16px;
    padding: 25px;
    text-align: center;
    border: 3px solid #dee2e6;
    min-width: 150px;
    transition: all 0.3s ease;
  }

  .runoff-card.first {
    border-color: #ffc107;
    background: #fff8e1;
    transform: scale(1.05);
    box-shadow: 0 8px 30px rgba(255, 193, 7, 0.3);
  }

  .runoff-rank {
    font-size: 2.5rem;
    margin-bottom: 10px;
  }

  .runoff-photo {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 15px;
    border: 4px solid white;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  .runoff-name {
    font-weight: bold;
    font-size: 1.1rem;
    color: #1a1a2e;
    margin-bottom: 5px;
  }

  .runoff-percentage {
    font-size: 1.5rem;
    color: #C8102E;
    font-weight: bold;
  }

  /* Congress List */
  .seats-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 10px 15px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .total-seats {
    font-weight: bold;
    color: #1a1a2e;
    font-size: 1.1rem;
  }

  .district-info {
    color: #6c757d;
    font-size: 0.9rem;
  }

  .congress-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 30px;
  }

  .congress-item {
    display: grid;
    grid-template-columns: 40px 50px 1fr auto auto;
    align-items: center;
    gap: 15px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 10px;
    transition: all 0.2s ease;
    border-left: 4px solid transparent;
  }

  .congress-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
  }

  .congress-item.user-vote {
    border-left-color: #28a745;
    background: #d4edda;
  }

  .rank {
    font-weight: bold;
    color: #6c757d;
    text-align: center;
    font-size: 1.1rem;
  }

  .party-symbol {
    width: 40px;
    height: 40px;
    object-fit: contain;
    border-radius: 4px;
  }

  .party-details {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .party-details .name {
    font-weight: 600;
    color: #1a1a2e;
  }

  .bar-container {
    height: 8px;
    background: #dee2e6;
    border-radius: 4px;
    overflow: hidden;
  }

  .bar {
    height: 100%;
    border-radius: 4px;
    transition: width 1s ease;
  }

  .stats {
    text-align: right;
  }

  .seats {
    font-weight: bold;
    color: #1a1a2e;
    font-size: 1rem;
  }

  .percentage {
    color: #6c757d;
    font-size: 0.85rem;
  }

  .user-badge {
    background: #28a745;
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  /* Seats Visualization */
  .seats-visualization {
    margin-top: 30px;
    padding-top: 30px;
    border-top: 2px solid #e9ecef;
  }

  .seats-visualization h3 {
    margin: 0 0 20px 0;
    color: #1a1a2e;
    font-size: 1.2rem;
  }

  .seats-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 12), 1fr);
    gap: 4px;
    margin-bottom: 30px;
    max-width: 100%;
    overflow-x: auto;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 12px;
  }

  .seat {
    aspect-ratio: 1;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease;
    cursor: pointer;
  }

  .seat:hover {
    transform: scale(1.2);
    z-index: 10;
  }

  /* Legend */
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 20px;
    font-size: 0.85rem;
  }

  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
  }

  .legend-symbol {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .legend-name {
    font-weight: 500;
    color: #1a1a2e;
  }

  .legend-seats {
    color: #6c757d;
    font-size: 0.8rem;
  }

  /* Footer */
  .results-footer {
    margin-top: 40px;
    padding: 30px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .winners-section h3 {
    text-align: center;
    margin: 0 0 25px 0;
    color: #1a1a2e;
    font-size: 1.4rem;
  }

  .winners-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
  }

  .winner-mini-card {
    text-align: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 12px;
    border: 2px solid #e9ecef;
    transition: all 0.3s ease;
  }

  .winner-mini-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }

  .winner-category {
    font-size: 0.8rem;
    color: #6c757d;
    margin-bottom: 10px;
    text-transform: uppercase;
  }

  .winner-image {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    margin-bottom: 10px;
    border: 3px solid white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }

  .winner-party {
    font-weight: bold;
    font-size: 0.9rem;
    margin-bottom: 5px;
  }

  .winner-stats {
    font-size: 0.8rem;
    color: #6c757d;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
  }

  .btn-primary, .btn-secondary {
    padding: 14px 28px;
    border: none;
    border-radius: 10px;
    font-weight: bold;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-primary {
    background: linear-gradient(135deg, #C8102E, #a00d25);
    color: white;
    box-shadow: 0 4px 15px rgba(200, 16, 46, 0.3);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(200, 16, 46, 0.4);
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #5a6268;
    transform: translateY(-2px);
  }

  /* Mobile Responsive */
  @media (max-width: 768px) {
    .results-page {
      padding: 15px;
    }

    .results-header h1 {
      font-size: 1.8rem;
    }

    .presidential-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }

    .runoff-candidates {
      flex-direction: column;
      align-items: center;
    }

    .runoff-card {
      width: 100%;
      max-width: 250px;
    }

    .congress-item {
      grid-template-columns: 30px 40px 1fr;
      grid-template-rows: auto auto auto;
    }

    .stats, .user-badge {
      grid-column: 3;
    }

    .seats-grid {
      --cols: 8;
    }

    .winners-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .presidential-grid {
      grid-template-columns: 1fr;
    }

    .runoff-card {
      transform: none !important;
    }

    .seats-grid {
      --cols: 6;
    }

    .legend {
      flex-direction: column;
      align-items: stretch;
    }

    .legend-item {
      justify-content: flex-start;
    }
  }
</style>
