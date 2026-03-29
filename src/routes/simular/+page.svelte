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
  import ShareResults from '$lib/components/ShareResults.svelte';

  // ─── Check voting hours ─────────────────────────────────────────────────────
  let isVotingClosed = $state(false);
  let nextOpenTime = $state<Date | null>(null);
  
  // ─── Inline Help Banner ──────────────────────────────────────────────────────
  let showInlineHint = $state(true);
  let autoHideHintTimeout: ReturnType<typeof window.setTimeout> | null = null;
  let initialHintTimeout: ReturnType<typeof window.setTimeout> | null = null;
  
  // ─── Horizontal Scroll Hint ───────────────────────────────────────────────────
  let ballotScroller: HTMLDivElement | null = $state(null);
  let userHasInteracted = $state(false);
  
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
  
  function hintHorizontalScroll() {
    if (!ballotScroller) return;
    if (userHasInteracted) return;
    
    ballotScroller.scrollTo({
      left: 96,
      behavior: 'smooth'
    });
    
    window.setTimeout(() => {
      if (!ballotScroller) return;
      if (userHasInteracted) return;
      
      ballotScroller.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    }, 500);
  }
  
  function closeInlineHint() {
    showInlineHint = false;
    
    // Clear auto-hide timeout if exists
    if (autoHideHintTimeout) {
      window.clearTimeout(autoHideHintTimeout);
      autoHideHintTimeout = null;
    }
    
    // Trigger horizontal scroll animation immediately
    hintHorizontalScroll();
  }
  
  function markUserInteraction() {
    userHasInteracted = true;
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
    }
    
    // Restore any votes from a previous session in the same browser tab
    // Only if not coming from a new simulation
    const saved = sessionStorage.getItem('dailyvote');
    if (!entryMode && saved) {
      vote.hydrate(saved);
    }
    
    // Show inline hint
    showInlineHint = true;
    
    // Auto-hide hint after 6 seconds
    autoHideHintTimeout = window.setTimeout(() => {
      showInlineHint = false;
    }, 6000);
    
    // Trigger horizontal scroll hint after 700ms
    initialHintTimeout = window.setTimeout(() => {
      hintHorizontalScroll();
    }, 700);
    
    return () => {
      // Cleanup timeouts on unmount
      if (autoHideHintTimeout) window.clearTimeout(autoHideHintTimeout);
      if (initialHintTimeout) window.clearTimeout(initialHintTimeout);
    };
  });

  // Persist votes on every change
  $effect(() => {
    const _ = vote.votes; // reactive dependency
    sessionStorage.setItem('dailyvote', vote.serialize());
  });
</script>

<svelte:head>
  <title>Simular voto — Cédula Electoral Perú 2026</title>
</svelte:head>

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

  <!-- Inline Help Banner -->
  {#if showInlineHint}
    <div 
      class="inline-hint-banner" 
      in:fade={{ duration: 180, delay: 100 }}
      out:fade={{ duration: 150 }}
    >
      <div class="hint-content">
        <span class="hint-icon">👆</span>
        <p class="hint-text">Haz clic para marcar. Vuelve a hacer clic para desmarcar. Desliza para recorrer la cédula.</p>
        <button 
          class="hint-close-btn" 
          onclick={closeInlineHint}
          aria-label="Cerrar ayuda"
        >
          ×
        </button>
      </div>
    </div>
  {/if}

  <!-- Solo la hoja de cédula navegable -->
  <div 
    class="ballot-sheet" 
    bind:this={ballotScroller}
    onpointerdown={markUserInteraction}
    onwheel={markUserInteraction}
    ontouchstart={markUserInteraction}
  >
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

  /* Inline Help Banner */
  .inline-hint-banner {
    position: fixed;
    top: 70px;
    left: 0;
    right: 0;
    z-index: 999;
    padding: 0 16px;
    pointer-events: none;
  }
  
  .hint-content {
    max-width: 1100px;
    margin: 12px auto 16px;
    padding: 12px 16px;
    background: #F5F7FB;
    border: 1px solid #D9E2F2;
    border-radius: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: auto;
  }
  
  .hint-icon {
    font-size: 20px;
    flex-shrink: 0;
  }
  
  .hint-text {
    flex: 1;
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: #1F2A44;
    text-align: center;
  }
  
  .hint-close-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: #5B657A;
    font-size: 20px;
    font-weight: 400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s ease;
  }
  
  .hint-close-btn:hover {
    background: rgba(91, 101, 122, 0.1);
  }

  /* Solo la hoja de cédula - ocupa todo el espacio, con margen para el header */
  .ballot-sheet {
    position: absolute;
    inset: 70px 0 0 0;
    overflow: auto;
  }
  
  /* Adjust for inline hint when visible */
  :global(.inline-hint-banner + .ballot-sheet) {
    top: 124px;
  }
  
  /* Mobile adjustment */
  @media (max-width: 768px) {
    .inline-hint-banner {
      top: 90px;
      padding: 0 12px;
    }
    
    .hint-content {
      margin: 10px auto 12px;
      padding: 10px 12px;
      flex-wrap: wrap;
    }
    
    .hint-icon {
      font-size: 18px;
    }
    
    .hint-text {
      font-size: 13px;
      text-align: left;
      flex: 1 1 auto;
    }
    
    .hint-close-btn {
      position: absolute;
      top: 6px;
      right: 6px;
    }
    
    .ballot-sheet {
      inset: 90px 0 0 0;
    }
    
    :global(.inline-hint-banner + .ballot-sheet) {
      top: 146px;
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
