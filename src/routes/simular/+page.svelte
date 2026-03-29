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
  let showInlineHint = $state(false);
  let autoHideHintTimeout: ReturnType<typeof window.setTimeout> | null = null;
  let initialHintTimeout: ReturnType<typeof window.setTimeout> | null = null;
  let hintDismissedThisVisit = $state(false);
  
  // ─── Ballot Scroller ────────────────────────────────────────────────────────
  let ballotScroller: HTMLDivElement | null = $state(null);
  let userHasInteracted = $state(false);
  
  function checkVotingHours() {
    const now = new Date();
    const hour = now.getHours();
    isVotingClosed = hour >= 20;
    
    if (isVotingClosed) {
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      nextOpenTime = midnight;
    }
  }
  
  function centerBallot() {
    if (!ballotScroller) return;

    const x = (ballotScroller.scrollWidth - ballotScroller.clientWidth) / 2;
    const y = (ballotScroller.scrollHeight - ballotScroller.clientHeight) / 2 + 200;

    ballotScroller.scrollTo({
      left: x,
      top: y,
      behavior: 'auto'
    });
  }
  
  function hintPan2D() {
    if (!ballotScroller) return;
    if (userHasInteracted) return;

    const startX = ballotScroller.scrollLeft;
    const startY = ballotScroller.scrollTop;

    // derecha
    ballotScroller.scrollTo({
      left: startX + 80,
      behavior: 'smooth'
    });

    setTimeout(() => {
      ballotScroller.scrollTo({
        left: startX,
        behavior: 'smooth'
      });
    }, 400);

    // abajo
    setTimeout(() => {
      ballotScroller.scrollTo({
        top: startY + 60,
        behavior: 'smooth'
      });
    }, 800);

    setTimeout(() => {
      ballotScroller.scrollTo({
        top: startY,
        behavior: 'smooth'
      });
    }, 1200);
  }
  
  function dismissInlineHint() {
    if (!showInlineHint) return;
    
    showInlineHint = false;
    hintDismissedThisVisit = true;
    
    if (autoHideHintTimeout) {
      window.clearTimeout(autoHideHintTimeout);
      autoHideHintTimeout = null;
    }
    
    hintPan2D();
  }
  
  function markUserInteraction() {
    userHasInteracted = true;
  }

  onMount(() => {
    checkVotingHours();
    
    if (isVotingClosed) {
      goto('/resultados');
      return;
    }
    
    const entryMode = sessionStorage.getItem('entry_mode');
    if (entryMode === 'new_simulation') {
      sessionStorage.removeItem('entry_mode');
    }
    
    const saved = sessionStorage.getItem('dailyvote');
    if (!entryMode && saved) {
      vote.hydrate(saved);
    }
    
    // Center ballot immediately
    centerBallot();
    
    showInlineHint = true;
    
    autoHideHintTimeout = window.setTimeout(() => {
      showInlineHint = false;
      hintDismissedThisVisit = true;
    }, 6000);
    
    initialHintTimeout = window.setTimeout(() => {
      hintPan2D();
    }, 700);
    
    return () => {
      if (autoHideHintTimeout) window.clearTimeout(autoHideHintTimeout);
      if (initialHintTimeout) window.clearTimeout(initialHintTimeout);
    };
  });

  // Persist votes and hide hint on first vote
  $effect(() => {
    const _ = vote.votes;
    sessionStorage.setItem('dailyvote', vote.serialize());
    
    if (vote.count > 0 && showInlineHint && !hintDismissedThisVisit) {
      showInlineHint = false;
      hintDismissedThisVisit = true;
      if (autoHideHintTimeout) {
        window.clearTimeout(autoHideHintTimeout);
        autoHideHintTimeout = null;
      }
    }
  });
</script>

<svelte:head>
  <title>Simular voto — Cédula Electoral Perú 2026</title>
</svelte:head>

<div class="app-shell">
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

  <BallotProgressHeader />

  {#if showInlineHint}
    <div 
      class="inline-hint-banner"
      transition:fade={{ duration: 150 }}
    >
      <div class="hint-content">
        <div class="hint-inner">
          <p class="hint-text">Explora la cédula deslizando en cualquier dirección. Haz clic para marcar o desmarcar.</p>
          <button 
            class="hint-close-btn" 
            onclick={dismissInlineHint}
            aria-label="Cerrar ayuda"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div 
    class="ballot-sheet" 
    onpointerdown={markUserInteraction}
    onwheel={markUserInteraction}
    ontouchstart={markUserInteraction}
    onscroll={markUserInteraction}
  >
    <BallotStage columns={BALLOT_COLUMNS} bind:scroller={ballotScroller} />
  </div>

  <VoteOverlay />

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

  .inline-hint-banner {
    position: fixed;
    top: 78px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    padding: 0 16px;
    pointer-events: none;
    max-width: 800px;
    width: calc(100% - 32px);
  }
  
  .hint-content {
    margin: 0;
    padding: 12px 20px;
    background: rgba(245, 247, 251, 0.95);
    border: 1px solid rgba(217, 226, 242, 0.8);
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(20, 35, 90, 0.15), 0 8px 32px rgba(20, 35, 90, 0.1);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    pointer-events: auto;
    position: relative;
  }
  
  .hint-inner {
    display: flex;
    align-items: center;
    position: relative;
  }
  
  .hint-text {
    flex: 1;
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: #1F2A44;
    text-align: center;
    padding-right: 36px;
  }
  
  .hint-close-btn {
    position: absolute;
    top: 50%;
    right: -4px;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border-radius: 999px;
    border: none;
    background: transparent;
    color: #5B657A;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s ease;
    padding: 0;
  }
  
  .hint-close-btn:hover {
    opacity: 0.75;
  }

  .ballot-sheet {
    position: absolute;
    inset: 70px 0 0 0;
    overflow: auto;
    z-index: 1;
  }
  
  @media (max-width: 768px) {
    .inline-hint-banner {
      top: 82px;
      padding: 0 12px;
      width: calc(100% - 24px);
    }
    
    .hint-content {
      padding: 10px 16px;
    }
    
    .hint-text {
      font-size: 13px;
      padding-right: 32px;
    }
    
    .hint-close-btn {
      right: 0;
      width: 24px;
      height: 24px;
      font-size: 18px;
    }
    
    .ballot-sheet {
      inset: 70px 0 0 0;
    }
  }
  
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
