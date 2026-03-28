<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import { vote } from '$lib/stores/vote.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import BallotStage from '$lib/components/BallotStage.svelte';
  import VoteOverlay from '$lib/components/VoteOverlay.svelte';
  import ProgressPanel from '$lib/components/ProgressPanel.svelte';

  // ─── Check voting hours ─────────────────────────────────────────────────────
  let isVotingClosed = $state(false);
  let nextOpenTime = $state<Date | null>(null);
  
  function checkVotingHours() {
    const now = new Date();
    const hour = now.getHours();
    isVotingClosed = hour >= 20; // Close at 8:00 PM
    
    if (isVotingClosed) {
      // Calculate next opening (midnight)
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      nextOpenTime = midnight;
    }
  }

  // ─── Session persistence ──────────────────────────────────────────────────────

  onMount(() => {
    checkVotingHours();
    
    // If voting is closed, redirect to results
    if (isVotingClosed) {
      goto('/resultados');
      return;
    }
    
    // Restore any votes from a previous session in the same browser tab
    const saved = sessionStorage.getItem('dailyvote');
    if (saved) vote.hydrate(saved);
  });

  // Persist votes on every change
  $effect(() => {
    const _ = vote.votes; // reactive dependency
    sessionStorage.setItem('dailyvote', vote.serialize());
  });
  
  // Check if all 5 columns have been voted
  let allVotesComplete = $derived(vote.count === 5);
  
  // Navigate to results
  function viewResults() {
    goto('/resultados');
  }
</script>

<svelte:head>
  <title>Simular voto — Cédula Electoral Perú 2026</title>
</svelte:head>

<!--
  Layout: Ordinals + gap + Stage (with current column + right preview)
  Left side: completely hidden, no peeking
  Right side: blurred preview of next column visible
  
  Structure:
    ┌───────────────────────────────────────────────┐
    │ BallotHeader                                  │
    ├───────────────────────────────────────────────┤
    │ ┌────┬──┬───────────────────────────┬─────┐│
    │ │ Ord│  │    STAGE (current +       │PREV ││
    │ │48px│4px│     right preview)        │200px││
    │ │    │  │                           │     ││
    │ └────┴──┴───────────────────────────┴─────┘│
    └───────────────────────────────────────────────┘
  
  Left side of current column is completely masked/hidden.
-->
<div class="app-shell">

  <!-- Voting closed overlay -->
  {#if isVotingClosed}
    <div class="closed-overlay" transition:fade={{ duration: 300 }}>
      <div class="closed-message">
        <span class="closed-icon">🌙</span>
        <h2>Votación Cerrada</h2>
        <p>La votación diaria cierra a las 8:00 PM.</p>
        <p class="next-open">
          Próxima votación: <strong>Mañana a medianoche</strong>
        </p>
        <div class="closed-actions">
          <button class="btn-primary" onclick={() => goto('/resultados')}>
            Ver Resultados de Hoy
          </button>
          <button class="btn-secondary" onclick={() => goto('/historial')}>
            Ver Historial
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Solo la hoja de cédula navegable -->
  <div class="ballot-sheet">
    <BallotStage columns={BALLOT_COLUMNS} />
  </div>
  
  <!-- Results button - appears when all 5 votes are complete -->
  {#if allVotesComplete}
    <div class="results-button-container" transition:fade={{ duration: 300 }}>
      <button class="results-button" onclick={viewResults}>
        <span class="button-icon">📊</span>
        <span class="button-text">Ver Resultados</span>
        <span class="button-subtitle">Has completado tus 5 votos</span>
      </button>
    </div>
  {/if}

  <!-- Bottom-sheet vote selection overlay -->
  <VoteOverlay />

  <!-- Slide-in summary panel (triggered from progress button in ContextBar) -->
  {#if ui.showSummary}
    <ProgressPanel />
  {/if}
</div>

<style>
  .app-shell {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: var(--paper-offwhite);
  }

  /* Solo la hoja de cédula - ocupa todo el espacio */
  .ballot-sheet {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  
  /* Results button container */
  .results-button-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 100;
    animation: slideIn 0.5s ease;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .results-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 24px;
    background: linear-gradient(135deg, var(--accent), #a00d25);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(200, 16, 46, 0.4);
    transition: all 0.3s ease;
    min-width: 180px;
  }
  
  .results-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(200, 16, 46, 0.5);
  }
  
  .button-icon {
    font-size: 2rem;
    margin-bottom: 4px;
  }
  
  .button-text {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 2px;
  }
  
  .button-subtitle {
    font-size: 0.75rem;
    opacity: 0.9;
  }
  
  /* Mobile adjustment */
  @media (max-width: 768px) {
    .results-button-container {
      bottom: 16px;
      right: 16px;
      left: 16px;
    }
    
    .results-button {
      flex-direction: row;
      gap: 12px;
      width: 100%;
      justify-content: center;
      padding: 14px 20px;
    }
    
    .button-icon {
      font-size: 1.5rem;
      margin-bottom: 0;
    }
    
    .button-text {
      font-size: 1rem;
      margin-bottom: 0;
    }
    
    .button-subtitle {
      display: none;
    }
  }
  
  /* Voting closed overlay */
  .closed-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(5px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  
  .closed-message {
    background: white;
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    max-width: 400px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }
  
  .closed-icon {
    font-size: 4rem;
    display: block;
    margin-bottom: 20px;
  }
  
  .closed-message h2 {
    margin: 0 0 15px 0;
    color: #1a1a2e;
    font-size: 1.8rem;
  }
  
  .closed-message p {
    color: #666;
    margin: 0 0 10px 0;
  }
  
  .next-open {
    background: #fff3cd;
    padding: 15px;
    border-radius: 10px;
    margin: 20px 0;
    border-left: 4px solid #ffc107;
  }
  
  .closed-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 25px;
  }
  
  .btn-primary, .btn-secondary {
    padding: 14px 28px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 1rem;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #C8102E, #a00d25);
    color: white;
  }
  
  .btn-secondary {
    background: #f0f0f0;
    color: #333;
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(200, 16, 46, 0.3);
  }
</style>
