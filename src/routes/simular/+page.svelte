<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { BALLOT_COLUMNS } from '$lib/data/mock';
  import { vote } from '$lib/stores/vote.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import BallotStage from '$lib/components/BallotStage.svelte';
  import BallotProgressHeader from '$lib/components/BallotProgressHeader.svelte';
  import VoteOverlay from '$lib/components/VoteOverlay.svelte';
  import ProgressPanel from '$lib/components/ProgressPanel.svelte';
  import OnboardingTour from '$lib/components/OnboardingTour.svelte';
  import ShareResults from '$lib/components/ShareResults.svelte';

  // ─── Check voting hours ─────────────────────────────────────────────────────
  let isVotingClosed = $state(false);
  let nextOpenTime = $state<Date | null>(null);
  
  // ─── Onboarding Tour ─────────────────────────────────────────────────────────
  let showTour = $state(false);
  
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
    
    // Check if this is a new simulation (don't restore previous votes)
    const entryMode = sessionStorage.getItem('entry_mode');
    if (entryMode === 'new_simulation') {
      sessionStorage.removeItem('entry_mode');
      return; // Start fresh, don't hydrate
    }
    
    // Check if user has seen the tour
    const hasSeenTour = localStorage.getItem('dailyvote_seen_tour');
    if (!hasSeenTour) {
      showTour = true;
    }
    
    // Restore any votes from a previous session in the same browser tab
    const saved = sessionStorage.getItem('dailyvote');
    if (saved) {
      vote.hydrate(saved);
    }
  });

  function completeTour() {
    showTour = false;
    localStorage.setItem('dailyvote_seen_tour', 'true');
  }

  function skipTour() {
    showTour = false;
    localStorage.setItem('dailyvote_seen_tour', 'true');
  }

  // Persist votes on every change
  $effect(() => {
    const _ = vote.votes; // reactive dependency
    sessionStorage.setItem('dailyvote', vote.serialize());
  });
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

<!-- Onboarding Tour for first-time users -->
{#if showTour}
  <OnboardingTour onComplete={completeTour} onSkip={skipTour} />
{/if}

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

  <!-- Sticky progress header - always visible -->
  <BallotProgressHeader />

  <!-- Solo la hoja de cédula navegable -->
  <div class="ballot-sheet">
    <BallotStage columns={BALLOT_COLUMNS} />
  </div>

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

  /* Solo la hoja de cédula - ocupa todo el espacio, con margen para el header */
  .ballot-sheet {
    position: absolute;
    inset: 70px 0 0 0;
    overflow: hidden;
  }
  
  /* Mobile adjustment - menos espacio para el header en móvil */
  @media (max-width: 768px) {
    .ballot-sheet {
      inset: 90px 0 0 0;
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
