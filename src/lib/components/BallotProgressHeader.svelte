<script lang="ts">
  import { 
    getValidColumnCount,
    getRemainingColumnCount,
    isBallotReady
  } from '$lib/stores/preferencePicker.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { goto } from '$app/navigation';

  let isSubmitting = $state(false);

  // Función para entregar cédula - ULTRA RÁPIDA (fire-and-forget)
  async function deliverBallot() {
    if (!isBallotReady() || isSubmitting) {
      console.log('Botón bloqueado:', { isReady, isSubmitting });
      return;
    }
    
    isSubmitting = true;
    console.log('🚀 Navegando inmediatamente...');
    
    // Navegar INMEDIATAMENTE sin esperar a Firebase
    goto('/resultados');
    
    // Enviar a Firebase en background (fire-and-forget)
    // No usamos await, el guardado continúa por detrás
    vote.submitVotes().catch(err => {
      console.warn('⚠️ Error al guardar votos (no crítico):', err);
      // En modo demo o si falla, ya estamos en la página de resultados
    });
  }

  // Estados derivados
  let validCount = $derived(getValidColumnCount());
  let remainingCount = $derived(getRemainingColumnCount());
  let isReady = $derived(isBallotReady());
</script>

<div class="progress-header" class:ready={isReady}>
  <div class="progress-content">
    <div class="progress-text">
      <h2 class="progress-title">
        {#if isReady}
          Tu cédula ya está lista para entregar
        {:else}
          Completa tus 5 votos para entregar la cédula
        {/if}
      </h2>
      <p class="progress-subtitle">
        {#if isReady}
          Revisa tus marcas y continúa
        {:else}
          Te faltan {remainingCount} columnas por marcar
        {/if}
      </p>
      <span class="progress-counter">{validCount}/5 columnas completas</span>
    </div>
    
    <button 
      class="deliver-button" 
      class:disabled={!isReady}
      class:submitting={isSubmitting}
      disabled={!isReady || isSubmitting}
      onclick={deliverBallot}
    >
      {#if isSubmitting}
        Enviando...
      {:else}
        Entregar cédula
      {/if}
    </button>
  </div>
</div>

<style>
  .progress-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    padding: 12px 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .progress-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
    gap: 16px;
  }

  .progress-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .progress-title {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0;
    line-height: 1.3;
    text-transform: uppercase;
    letter-spacing: 0.01em;
  }

  .progress-subtitle {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    color: #94a3b8;
    margin: 0;
    line-height: 1.3;
  }

  .progress-counter {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: #cbd5e1;
    margin-top: 2px;
  }

  .deliver-button {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    padding: 10px 20px;
    background: linear-gradient(135deg, var(--accent), #a00d25);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    min-width: 140px;
    text-align: center;
  }

  .deliver-button:hover:not(.disabled):not(.submitting) {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(200, 16, 46, 0.3);
  }

  .deliver-button.disabled {
    background: var(--grid-border-light);
    color: var(--text-muted);
    cursor: not-allowed;
    opacity: 0.6;
  }

  .deliver-button.submitting {
    background: linear-gradient(135deg, #666, #444);
    cursor: wait;
    opacity: 0.8;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .progress-header {
      padding: 10px 12px;
    }

    .progress-content {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .progress-title {
      font-size: 13px;
    }

    .progress-subtitle {
      font-size: 11px;
    }

    .progress-counter {
      font-size: 11px;
    }

    .deliver-button {
      width: 100%;
      padding: 12px 16px;
      font-size: 12px;
    }
  }
</style>
