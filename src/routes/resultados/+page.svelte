<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { vote } from '$lib/stores/vote.svelte';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import ParliamentHemicycle from '$lib/components/ParliamentHemicycle.svelte';
  
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
  
  // State
  let allResults = $state<CategoryResults[]>([]);
  let isVotingClosed = $state(false);
  let currentTime = $state(new Date());
  let nextResetTime = $state<Date | null>(null);
  let activeCategory = $state<string | null>(null);
  let showConfetti = $state(false);
  
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
      { id: 'presidente', name: 'Presidente', subtitle: 'y Vicepresidentes', totalSeats: 1 },
      { id: 'senadores-nacional', name: 'Senadores', subtitle: 'Nacionales', totalSeats: 30 },
      { id: 'senadores-regional', name: 'Senadores', subtitle: 'Regionales', totalSeats: 30 },
      { id: 'diputados', name: 'Diputados', subtitle: '130 escaños', totalSeats: 130 },
      { id: 'parlamento-andino', name: 'Parlamento', subtitle: 'Andino', totalSeats: 5 }
    ];
    
    // Get user's votes from store
    const userVotes = Array.from(vote.votes.entries());
    
    return categories.map(cat => {
      // Find user's vote for this category
      const userVoteForCategory = userVotes.find(([colId]) => colId === cat.id);
      const userPartyName = userVoteForCategory ? userVoteForCategory[1].partyName : null;
      
      // Get parties for this category
      let parties: ElectionResult[];
      if (cat.id === 'presidente') {
        parties = presidentialRows.slice(0, 8).map(row => ({
          partyId: row.partyAbbr,
          partyName: row.partyName,
          partyColor: row.partyColor,
          partySymbolUrl: row.partySymbolUrl || '',
          photoUrl: row.presidentialPhoto || null,
          votes: 0,
          percentage: 0
        }));
      } else {
        parties = legislativeRows.map(row => ({
          partyId: row.partyAbbr,
          partyName: row.partyName,
          partyColor: row.partyColor,
          partySymbolUrl: row.partySymbolUrl || '',
          photoUrl: null,
          votes: 0,
          percentage: 0
        }));
      }
      
      // Generate random percentages
      let remaining = 100;
      parties = parties.map((party, index) => {
        let percentage;
        if (index === parties.length - 1) {
          percentage = remaining;
        } else {
          // Give user's party a boost
          if (party.partyName === userPartyName) {
            percentage = Math.random() * 10 + 22; // 22-32%
          } else {
            percentage = Math.random() * 10 + 5; // 5-15%
          }
          remaining -= percentage;
        }
        return { ...party, percentage: Math.max(0, percentage) };
      });
      
      // Normalize to 100%
      const total = parties.reduce((sum, r) => sum + r.percentage, 0);
      parties = parties.map(r => {
        const normalizedPercentage = (r.percentage / total) * 100;
        return {
          ...r,
          percentage: normalizedPercentage,
          votes: Math.floor(normalizedPercentage * 184.5),
          seats: 0 // Will be calculated below
        };
      });
      
      // Sort by percentage
      parties.sort((a, b) => b.percentage - a.percentage);
      
      // Assign seats - for small totals, use simple allocation
      let remainingSeats = cat.totalSeats;
      if (cat.totalSeats > 1) {
        // Distribute seats starting from top party
        parties = parties.map((p, i) => {
          let seatCount = 0;
          if (i < cat.totalSeats && remainingSeats > 0) {
            // Simple allocation: at least 1 seat to top parties
            seatCount = Math.max(1, Math.round((p.percentage / 100) * cat.totalSeats));
            seatCount = Math.min(seatCount, remainingSeats); // Don't exceed remaining
            remainingSeats -= seatCount;
          }
          return { ...p, seats: seatCount };
        });
      }
      
      // For small seat counts, only keep parties that actually got seats
      if (cat.totalSeats <= 10) {
        parties = parties.filter(p => (p.seats || 0) > 0);
      }
      
      // Generate seat distribution - create individual seat objects
      let seatDistribution: Seat[] = [];
      if (cat.totalSeats > 1) {
        // Create individual seats based on party results
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
  onMount(() => {
    checkVotingStatus();
    allResults = generateSimulatedResults();
    
    // Trigger confetti after a delay
    setTimeout(() => {
      showConfetti = true;
    }, 500);
    
    // Update countdown every second
    const interval = setInterval(() => {
      currentTime = new Date();
      checkVotingStatus();
    }, 1000);
    
    return () => clearInterval(interval);
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
  
  // Save daily winner
  function saveDailyWinner() {
    const today = new Date().toISOString().split('T')[0];
    const winners = allResults.map(r => ({ category: r.category, winner: r.results[0] }));
    const history = JSON.parse(localStorage.getItem('dailyvote_history') || '[]');
    history.push({ date: today, winners });
    if (history.length > 30) history.shift();
    localStorage.setItem('dailyvote_history', JSON.stringify(history));
  }
  
  $effect(() => {
    if (isVotingClosed) saveDailyWinner();
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
      
      <div class="status-indicator" class:closed={isVotingClosed}>
        <span class="status-dot"></span>
        <span class="status-text">
          {isVotingClosed ? 'Votación Cerrada' : 'Conteo en Vivo'}
        </span>
        {#if !isVotingClosed && nextResetTime}
          <span class="countdown">Cierra en: {formatCountdown(nextResetTime)}</span>
        {/if}
      </div>
    </div>
  </header>

  <!-- Presidential Results - Featured -->
  {#if allResults[0]}
    <section class="featured-section presidential" in:fly={{ y: 30, duration: 600, delay: 200 }}>
      <div class="section-header">
        <h2>Presidente y Vicepresidentes</h2>
        <span class="seat-count">1 cargo</span>
      </div>
      
      <div class="candidates-showcase">
        {#each allResults[0].results.slice(0, 3) as candidate, i}
          <div 
            class="candidate-card"
            class:winner={i === 0}
            class:user-vote={candidate.partyName === allResults[0].userVote}
            in:scale={{ duration: 400, delay: i * 150, start: 0.8 }}
          >
            <div class="rank-badge">{i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉'}</div>
            
            <div class="photo-frame">
              {#if candidate.photoUrl}
                <img src={candidate.photoUrl} alt={candidate.partyName} class="candidate-photo" />
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
            
            {#if candidate.partyName === allResults[0].userVote}
              <div class="user-vote-ribbon">TU VOTO</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Runoff Warning -->
      {#if !hasAbsoluteMajority(allResults[0].results)}
        <div class="runoff-banner" in:fly={{ y: 20, duration: 400, delay: 600 }}>
          <div class="runoff-icon">⚠️</div>
          <div class="runoff-content">
            <h4>Segunda Vuelta Requerida</h4>
            <p>Ningún candidato alcanzó el 50% de los votos. Los 2 más votados pasan a segunda vuelta el <strong>7 de junio 2026</strong>.</p>
          </div>
        </div>
      {/if}
    </section>
  {/if}

  <!-- Congressional Categories with Hemicycle -->
  {#each allResults.slice(1) as category, index}
    <section 
      class="category-section"
      in:fly={{ y: 30, duration: 600, delay: 300 + index * 100 }}
    >
      <div class="section-header">
        <div>
          <h2>{category.category}</h2>
          {#if category.categoryId === 'senadores-nacional'}
            <p class="district-label">Distrito Nacional</p>
          {:else if category.categoryId === 'senadores-regional'}
            <p class="district-label">Lima Metropolitana</p>
          {:else if category.categoryId === 'diputados'}
            <p class="district-label">Distrito Electoral Lima</p>
          {:else}
            <p class="district-label">Comunidad Andina</p>
          {/if}
        </div>
        <span class="seat-count">{category.totalSeats} escaños</span>
      </div>

      <!-- Hemicycle Visualization -->
      <div class="hemicycle-wrapper">
        <ParliamentHemicycle 
          seats={category.seatDistribution}
          totalSeats={category.totalSeats}
        />
      </div>

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
    </section>
  {/each}

  <!-- Footer Actions -->
  <footer class="results-footer" in:fly={{ y: 30, duration: 600, delay: 800 }}>
    <div class="actions">
      {#if isVotingClosed}
        <button class="btn-primary btn-large" onclick={() => goto('/')}>
          <span class="btn-icon">🌅</span>
          Volver Mañana
        </button>
      {:else}
        <button class="btn-secondary btn-large" onclick={goBack}>
          <span class="btn-icon">←</span>
          Seguir Votando
        </button>
      {/if}
      
      <button class="btn-ghost" onclick={() => goto('/historial')}>
        Ver Histórico
      </button>
    </div>
    
    <p class="footer-note">
      Simulación educativa • Datos generados automáticamente • No representan resultados reales
    </p>
  </footer>
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

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 12px 20px;
    border-radius: 50px;
    backdrop-filter: blur(10px);
  }

  .status-dot {
    width: 12px;
    height: 12px;
    background: #00ff88;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .status-indicator.closed .status-dot {
    background: #ff4757;
    animation: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }

  .status-text {
    font-weight: 600;
  }

  .countdown {
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    opacity: 0.9;
    margin-left: 10px;
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

  .seat-count {
    background: #f0f0f0;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    color: #666;
    font-size: 0.9rem;
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

  .vote-count {
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

  .footer-note {
    color: #999;
    font-size: 0.85rem;
    margin: 0;
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
  }

  @media (max-width: 480px) {
    .candidates-showcase {
      grid-template-columns: 1fr;
    }

    .photo-frame {
      width: 100px;
      height: 100px;
    }
  }
</style>
