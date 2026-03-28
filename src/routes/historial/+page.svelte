<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  
  interface Winner {
    category: string;
    winner: {
      partyName: string;
      partyColor: string;
      partySymbolUrl: string;
      percentage: number;
    };
  }
  
  interface DayResult {
    date: string;
    winners: Winner[];
  }
  
  let history = $state<DayResult[]>([]);
  let selectedDay = $state<DayResult | null>(null);
  
  onMount(() => {
    // Load history from localStorage
    const saved = localStorage.getItem('dailyvote_history');
    if (saved) {
      try {
        history = JSON.parse(saved).reverse(); // Most recent first
      } catch (e) {
        console.error('Error loading history:', e);
        history = [];
      }
    }
  });
  
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  function getDaysSince(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  }
</script>

<svelte:head>
  <title>Historial de Resultados | DailyVote Perú 2026</title>
</svelte:head>

<div class="history-page">
  <!-- Header -->
  <header class="page-header" in:fly={{ y: -20, duration: 400 }}>
    <button class="btn-back" onclick={() => goto('/resultados')}>
      ← Volver a Resultados
    </button>
    <h1>📊 Historial de Simulaciones</h1>
    <p class="subtitle">Registro de votaciones diarias</p>
  </header>

  {#if history.length === 0}
    <!-- Empty state -->
    <div class="empty-state" in:fade={{ duration: 300 }}>
      <div class="empty-icon">🗳️</div>
      <h2>No hay historial aún</h2>
      <p>Los resultados de cada día se guardarán automáticamente después de las 8:00 PM.</p>
      <button class="btn-primary" onclick={() => goto('/simular')}>
        Ir a Votar
      </button>
    </div>
  {:else}
    <!-- Stats summary -->
    <div class="stats-bar" in:fly={{ y: 20, duration: 400, delay: 100 }}>
      <div class="stat-item">
        <span class="stat-number">{history.length}</span>
        <span class="stat-label">Días registrados</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{history.length * 5}</span>
        <span class="stat-label">Votaciones totales</span>
      </div>
    </div>

    <!-- History list -->
    <div class="history-list">
      {#each history as day, index}
        <div 
          class="day-card"
          class:expanded={selectedDay?.date === day.date}
          in:fly={{ y: 30, duration: 400, delay: index * 50 }}
        >
          <div 
            class="day-header"
            onclick={() => selectedDay = selectedDay?.date === day.date ? null : day}
            onkeydown={(e) => e.key === 'Enter' && (selectedDay = selectedDay?.date === day.date ? null : day)}
            role="button"
            aria-label="Ver detalles de {formatDate(day.date)}"
            tabindex="0"
          >
            <div class="day-info">
              <span class="day-date">{formatDate(day.date)}</span>
              <span class="day-ago">{getDaysSince(day.date)}</span>
            </div>
            <div class="day-winners-preview">
              {#each day.winners.slice(0, 3) as winner}
                <img 
                  src={winner.winner.partySymbolUrl} 
                  alt=""
                  class="winner-thumb"
                  style="border-color: {winner.winner.partyColor}"
                />
              {/each}
            </div>
            <span class="expand-icon">
              {selectedDay?.date === day.date ? '▼' : '▶'}
            </span>
          </div>
          
          {#if selectedDay?.date === day.date}
            <div class="day-details" transition:fade={{ duration: 200 }}>
              <h3>Ganadores del día</h3>
              <div class="winners-grid">
                {#each day.winners as winner}
                  <div class="winner-detail-card">
                    <div class="winner-category">{winner.category}</div>
                    <div class="winner-main">
                      <img 
                        src={winner.winner.partySymbolUrl} 
                        alt=""
                        class="winner-symbol"
                      />
                      <div class="winner-info">
                        <span 
                          class="winner-name"
                          style="color: {winner.winner.partyColor}"
                        >
                          {winner.winner.partyName}
                        </span>
                        <span class="winner-percentage">
                          {winner.winner.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .history-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 60px;
    min-height: 100vh;
    background: #f8f9fa;
  }

  .page-header {
    margin-bottom: 30px;
  }

  .btn-back {
    background: transparent;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 8px 0;
    margin-bottom: 10px;
    transition: color 0.2s;
  }

  .btn-back:hover {
    color: #333;
  }

  .page-header h1 {
    font-size: 2rem;
    margin: 0;
    color: #1a1a2e;
  }

  .subtitle {
    color: #666;
    margin: 5px 0 0 0;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .empty-state h2 {
    color: #1a1a2e;
    margin: 0 0 10px 0;
  }

  .empty-state p {
    color: #666;
    max-width: 400px;
    margin: 0 auto 30px;
  }

  /* Stats bar */
  .stats-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 20px 30px;
    border-radius: 12px;
    margin-bottom: 30px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    flex-wrap: wrap;
    gap: 20px;
  }

  .stat-item {
    text-align: center;
  }

  .stat-number {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: #C8102E;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #666;
  }

  /* Buttons */
  .btn-primary {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    background: linear-gradient(135deg, #C8102E, #a00d25);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(200, 16, 46, 0.3);
  }

  /* History list */
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .day-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: all 0.2s;
  }

  .day-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  }

  .day-card.expanded {
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  }

  .day-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px 25px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .day-header:hover {
    background: #f8f9fa;
  }

  .day-info {
    flex: 1;
  }

  .day-date {
    display: block;
    font-weight: 600;
    color: #1a1a2e;
    font-size: 1.1rem;
  }

  .day-ago {
    font-size: 0.85rem;
    color: #666;
  }

  .day-winners-preview {
    display: flex;
    gap: -5px;
  }

  .winner-thumb {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    border: 2px solid;
    object-fit: cover;
    margin-left: -10px;
    background: white;
  }

  .winner-thumb:first-child {
    margin-left: 0;
  }

  .expand-icon {
    color: #666;
    font-size: 0.8rem;
  }

  /* Day details */
  .day-details {
    padding: 0 25px 25px;
    border-top: 1px solid #eee;
  }

  .day-details h3 {
    margin: 20px 0 15px;
    color: #1a1a2e;
  }

  .winners-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
  }

  .winner-detail-card {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 10px;
  }

  .winner-category {
    font-size: 0.8rem;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .winner-main {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .winner-symbol {
    width: 45px;
    height: 45px;
    border-radius: 8px;
    object-fit: contain;
  }

  .winner-info {
    display: flex;
    flex-direction: column;
  }

  .winner-name {
    font-weight: 600;
    font-size: 1rem;
  }

  .winner-percentage {
    font-size: 0.9rem;
    color: #666;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .stats-bar {
      flex-direction: column;
      text-align: center;
    }

    .day-header {
      flex-wrap: wrap;
    }

    .winners-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
