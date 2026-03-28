<script lang="ts">
  import { onMount } from 'svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { goto } from '$app/navigation';
  
  // Types
  interface ElectionResult {
    partyId: string;
    partyName: string;
    partyColor: string;
    votes: number;
    percentage: number;
    seats?: number;
  }
  
  interface CategoryResults {
    category: string;
    totalVotes: number;
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
  
  // Generate simulated results with user's vote weighted
  function generateSimulatedResults(): CategoryResults[] {
    const categories = [
      { id: 'presidente', name: 'Presidente y Vicepresidentes', totalSeats: 1 },
      { id: 'senadores-nacional', name: 'Senadores Nacionales', totalSeats: 30 },
      { id: 'senadores-regional', name: 'Senadores Regionales', totalSeats: 30 },
      { id: 'diputados', name: 'Diputados', totalSeats: 130 },
      { id: 'parlamento-andino', name: 'Parlamento Andino', totalSeats: 5 }
    ];
    
    const parties = [
      { id: 'av', name: 'Alianza Venceremos', color: '#4A90A4' },
      { id: 'ppp', name: 'Partido Patriótico del Perú', color: '#2C3E50' },
      { id: 'pco', name: 'Partido Cívico Obras', color: '#27AE60' },
      { id: 'frepap', name: 'Frepap', color: '#8E44AD' },
      { id: 'pdv', name: 'Partido Demócrata Verde', color: '#16A085' },
      { id: 'pbg', name: 'Partido del Buen Gobierno', color: '#F39C12' },
      { id: 'pa', name: 'Perú Acción', color: '#C0392B' },
      { id: 'prin', name: 'PRIN', color: '#E74C3C' },
      { id: 'progre', name: 'Progresemos', color: '#D35400' },
      { id: 'sc', name: 'Sí Creo', color: '#7F8C8D' },
      { id: 'ppt', name: 'País Para Todos', color: '#F1C40F' },
      { id: 'fde', name: 'Frente de la Esperanza', color: '#1ABC9C' },
      { id: 'pl', name: 'Perú Libre', color: '#E74C3C' },
      { id: 'plg', name: 'Primero La Gente', color: '#3498DB' }
    ];
    
    // Get user's votes from store
    const userVotes = Array.from(vote.votes.entries());
    
    return categories.map(cat => {
      // Find user's vote for this category
      const userVoteForCategory = userVotes.find(([colId]) => {
        if (cat.id === 'presidente') return colId === 'presidente';
        if (cat.id === 'senadores-nacional') return colId === 'senadores-nacional';
        if (cat.id === 'senadores-regional') return colId === 'senadores-regional';
        if (cat.id === 'diputados') return colId === 'diputados';
        if (cat.id === 'parlamento-andino') return colId === 'parlamento-andino';
        return false;
      });
      
      const userPartyId = userVoteForCategory ? userVoteForCategory[1].partyName.substring(0, 3).toLowerCase() : null;
      
      // Generate random percentages that sum to 100
      let remaining = 100;
      const results: ElectionResult[] = parties.slice(0, 8).map((party, index) => {
        let percentage;
        if (index === parties.length - 1) {
          percentage = remaining;
        } else {
          // Give user's party a boost
          if (party.id === userPartyId) {
            percentage = Math.random() * 15 + 20; // 20-35%
          } else {
            percentage = Math.random() * 12 + 3; // 3-15%
          }
        }
        remaining -= percentage;
        
        return {
          partyId: party.id,
          partyName: party.name,
          partyColor: party.color,
          votes: Math.floor(percentage * 100),
          percentage: Math.max(0, percentage)
        };
      });
      
      // Normalize to 100%
      const total = results.reduce((sum, r) => sum + r.percentage, 0);
      results.forEach(r => {
        r.percentage = (r.percentage / total) * 100;
        r.votes = Math.floor(r.percentage * 1845); // ~18,450 total votes
      });
      
      // Sort by percentage
      results.sort((a, b) => b.percentage - a.percentage);
      
      return {
        category: cat.name,
        totalVotes: results.reduce((sum, r) => sum + r.votes, 0),
        results: results,
        userVote: userVoteForCategory ? userVoteForCategory[1].partyName : undefined
      };
    });
  }
  
  // Calculate seats for congressional categories
  function calculateSeats(results: ElectionResult[], totalSeats: number): ElectionResult[] {
    // Simple proportional allocation
    const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
    
    return results.map(r => ({
      ...r,
      seats: Math.round((r.percentage / totalPercentage) * totalSeats)
    }));
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
  
  // Reset for new day
  function resetForNewDay() {
    vote.reset();
    goto('/simular');
  }
  
  $effect(() => {
    if (isVotingClosed) {
      saveDailyWinner();
    }
  });
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
    <section class="category-section presidential">
      <h2>1️⃣ Presidente y Vicepresidentes</h2>
      
      <div class="results-list">
        {#each allResults[0].results as result, i}
          <div class="result-item" class:winner={i === 0} class:user-vote={result.partyName === allResults[0].userVote}>
            <div class="rank">{i + 1}</div>
            <div class="party-info">
              <div class="party-name">{result.partyName}</div>
              <div class="party-bar" style="width: {result.percentage}%">
                <div class="bar-fill" style="background-color: {result.partyColor}"></div>
              </div>
            </div>
            <div class="stats">
              <span class="percentage">{result.percentage.toFixed(1)}%</span>
              <span class="votes">{result.votes.toLocaleString()} votos</span>
            </div>
            {#if result.partyName === allResults[0].userVote}
              <div class="user-badge">TU VOTO</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Analysis -->
      <div class="analysis">
        {#if hasAbsoluteMajority(allResults[0].results)}
          <div class="majority-win">
            🏆 <strong>{allResults[0].results[0].partyName}</strong> gana con mayoría absoluta (>50%)
          </div>
        {:else}
          <div class="runoff-alert">
            📢 <strong>Sin mayoría absoluta</strong> - Segunda vuelta requerida
          </div>
          <div class="runoff-candidates">
            <p>Pasan a segunda vuelta (7 de junio 2026):</p>
            <div class="runoff-pair">
              {#each getRunoffCandidates(allResults[0].results) as candidate, i}
                <div class="candidate-card" class:first={i === 0}>
                  <div class="candidate-rank">{i === 0 ? '🥇' : '🥈'}</div>
                  <div class="candidate-name">{candidate.partyName}</div>
                  <div class="candidate-percentage">{candidate.percentage.toFixed(1)}%</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Congressional Results -->
  {#each allResults.slice(1) as category, index}
    <section class="category-section">
      <h2>
        {index === 0 ? '2️⃣' : index === 1 ? '3️⃣' : index === 2 ? '4️⃣' : '5️⃣'}
        {category.category}
      </h2>
      
      <div class="seats-summary">
        Total de escaños: <strong>{[30, 30, 130, 5][index]}</strong>
      </div>
      
      <div class="results-list compact">
        {#each calculateSeats(category.results, [30, 30, 130, 5][index]) as result, i}
          <div class="result-item" class:user-vote={result.partyName === category.userVote}>
            <div class="rank">{i + 1}</div>
            <div class="party-info">
              <div class="party-name">{result.partyName}</div>
              <div class="party-bar compact" style="width: {result.percentage}%">
                <div class="bar-fill" style="background-color: {result.partyColor}"></div>
              </div>
            </div>
            <div class="stats">
              <span class="seats">{result.seats || 0} escaños</span>
              <span class="percentage">{result.percentage.toFixed(1)}%</span>
            </div>
            {#if result.partyName === category.userVote}
              <div class="user-badge small">TU VOTO</div>
            {/if}
          </div>
        {/each}
      </div>
      
      <!-- Visual representation of seats -->
      <div class="seats-visual">
        <div class="seats-label">Distribución de escaños:</div>
        <div class="seats-container">
          {#each calculateSeats(category.results, [30, 30, 130, 5][index]).slice(0, 6) as result}
            {#each Array(Math.min(result.seats || 0, index === 3 ? 5 : 12)) as _, i}
              <div 
                class="seat" 
                style="background-color: {result.partyColor}"
                title="{result.partyName}"
              ></div>
            {/each}
          {/each}
        </div>
      </div>
    </section>
  {/each}

  <!-- Footer Actions -->
  <footer class="results-footer">
    {#if isVotingClosed}
      <div class="winner-announcement">
        <h3>🏆 Ganadores de Hoy ({new Date().toLocaleDateString()})</h3>
        <div class="winners-grid">
          {#each allResults as result}
            <div class="winner-card">
              <div class="winner-category">{result.category}</div>
              <div class="winner-party" style="color: {result.results[0].partyColor}">
                {result.results[0].partyName}
              </div>
              <div class="winner-stats">{result.results[0].percentage.toFixed(1)}%</div>
            </div>
          {/each}
        </div>
      </div>
      
      <div class="actions">
        <button class="btn-primary" onclick={resetForNewDay}>
          Volver Mañana
        </button>
        <button class="btn-secondary" onclick={() => goto('/historial')}>
          Ver Histórico
        </button>
      </div>
    {:else}
      <div class="actions">
        <button class="btn-secondary" onclick={goBack}>
          ← Volver a la Cédula
        </button>
        <button class="btn-primary" disabled>
          Esperando cierre (20:00 hrs)
        </button>
      </div>
    {/if}
  </footer>
</div>

<style>
  .results-page {
    min-height: 100vh;
    background: var(--paper-offwhite);
    padding: 24px;
  }

  .results-header {
    text-align: center;
    margin-bottom: 32px;
    padding: 24px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .results-header h1 {
    font-size: 2rem;
    margin: 0 0 8px 0;
    color: var(--text-primary);
  }

  .subtitle {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    font-size: 1.1rem;
    color: var(--text-secondary);
  }

  .live-badge {
    background: #28a745;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    animation: pulse 2s infinite;
  }

  .closed-badge {
    background: #dc3545;
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .countdown {
    margin-top: 16px;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--accent);
    font-family: 'Courier New', monospace;
  }

  .countdown.reset {
    color: #6c757d;
  }

  .category-section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .category-section h2 {
    margin: 0 0 16px 0;
    color: var(--text-primary);
    font-size: 1.3rem;
  }

  .presidential {
    border-left: 4px solid #C8102E;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .results-list.compact {
    gap: 8px;
  }

  .result-item {
    display: grid;
    grid-template-columns: 30px 1fr auto auto;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .result-item:hover {
    background: #e9ecef;
    transform: translateX(4px);
  }

  .result-item.winner {
    background: #fff3cd;
    border: 2px solid #ffc107;
  }

  .result-item.user-vote {
    border-left: 4px solid #28a745;
  }

  .rank {
    font-weight: bold;
    color: #6c757d;
    text-align: center;
  }

  .party-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .party-name {
    font-weight: 600;
    color: var(--text-primary);
  }

  .party-bar {
    height: 8px;
    background: #dee2e6;
    border-radius: 4px;
    overflow: hidden;
  }

  .party-bar.compact {
    height: 6px;
  }

  .bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 1s ease;
  }

  .stats {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .percentage {
    font-weight: bold;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  .votes {
    font-size: 0.8rem;
    color: #6c757d;
  }

  .seats {
    font-weight: bold;
    color: #495057;
  }

  .user-badge {
    background: #28a745;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: bold;
  }

  .user-badge.small {
    padding: 2px 6px;
    font-size: 0.6rem;
  }

  .analysis {
    margin-top: 20px;
    padding: 16px;
    background: #e7f3ff;
    border-radius: 8px;
    border-left: 4px solid #0066cc;
  }

  .majority-win {
    font-size: 1.1rem;
    color: #155724;
    background: #d4edda;
    padding: 12px;
    border-radius: 8px;
  }

  .runoff-alert {
    font-size: 1.1rem;
    color: #856404;
    background: #fff3cd;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .runoff-candidates {
    margin-top: 12px;
  }

  .runoff-pair {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 12px;
  }

  .candidate-card {
    flex: 1;
    max-width: 200px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    text-align: center;
    border: 2px solid #dee2e6;
  }

  .candidate-card.first {
    border-color: #ffc107;
    background: #fff3cd;
  }

  .candidate-rank {
    font-size: 2rem;
    margin-bottom: 8px;
  }

  .candidate-name {
    font-weight: bold;
    margin-bottom: 4px;
  }

  .candidate-percentage {
    font-size: 1.2rem;
    color: #6c757d;
  }

  .seats-summary {
    font-size: 0.9rem;
    color: #6c757d;
    margin-bottom: 12px;
  }

  .seats-visual {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #dee2e6;
  }

  .seats-label {
    font-size: 0.85rem;
    color: #6c757d;
    margin-bottom: 8px;
  }

  .seats-container {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .seat {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .results-footer {
    margin-top: 32px;
    padding: 24px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .winner-announcement {
    margin-bottom: 24px;
  }

  .winner-announcement h3 {
    text-align: center;
    margin: 0 0 16px 0;
    color: var(--text-primary);
  }

  .winners-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .winner-card {
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    text-align: center;
    border: 2px solid #dee2e6;
  }

  .winner-category {
    font-size: 0.8rem;
    color: #6c757d;
    margin-bottom: 4px;
  }

  .winner-party {
    font-weight: bold;
    font-size: 1.1rem;
    margin-bottom: 4px;
  }

  .winner-stats {
    font-size: 0.9rem;
    color: #495057;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .btn-primary, .btn-secondary {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--accent);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #a00d25;
  }

  .btn-primary:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  @media (max-width: 768px) {
    .results-page {
      padding: 16px;
    }

    .results-header h1 {
      font-size: 1.5rem;
    }

    .result-item {
      grid-template-columns: 25px 1fr;
      grid-template-rows: auto auto;
      gap: 8px;
    }

    .stats {
      grid-column: 2;
      flex-direction: row;
      justify-content: space-between;
    }

    .user-badge {
      grid-column: 2;
      justify-self: start;
    }

    .runoff-pair {
      flex-direction: column;
      align-items: center;
    }

    .candidate-card {
      max-width: 100%;
    }
  }
</style>
