<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';

  // Onboarding steps: explain the 3 key interactions
  interface Step {
    icon: string;
    title: string;
    body: string;
  }

  const STEPS: Step[] = [
    {
      icon: '🗳️',
      title: 'Tu cédula electoral',
      body: 'La cédula tiene 5 columnas: Presidente, Senadores Nacionales, Senadores Regionales, Diputados y Parlamento Andino.',
    },
    {
      icon: '↔️',
      title: 'Navega entre columnas',
      body: 'Desliza horizontalmente (o usa las flechas) para cambiar de columna. Cada columna es un cargo diferente.',
    },
    {
      icon: '☝️',
      title: 'Vota tocando una fila',
      body: 'Toca cualquier partido para ver tus opciones de voto. Puedes marcar el símbolo, la foto o el número del partido.',
    },
    {
      icon: '✅',
      title: '¡Listo para simular!',
      body: 'Esta es una simulación con datos de ejemplo. Nada que hagas aquí es oficial ni vinculante.',
    },
  ];

  let step = $state(0);
  let leaving = $state(false);

  function next() {
    if (step < STEPS.length - 1) {
      step++;
    } else {
      finish();
    }
  }

  function finish() {
    leaving = true;
    setTimeout(() => ui.skipOnboarding(), 280);
  }

  const current = $derived(STEPS[step]);
  const isLast  = $derived(step === STEPS.length - 1);
</script>

<div class="onboarding" class:leaving aria-modal="true" role="dialog" aria-label="Introducción al simulador">
  <div class="card">
    <!-- Step indicator -->
    <div class="dots" aria-hidden="true">
      {#each STEPS as _, i}
        <span class="sdot" class:active={i === step}></span>
      {/each}
    </div>

    <!-- Content -->
    <div class="step-icon" aria-hidden="true">{current.icon}</div>
    <h2 class="step-title">{current.title}</h2>
    <p class="step-body">{current.body}</p>

    <!-- Navigation -->
    <div class="btn-row">
      {#if !isLast}
        <button class="btn-skip" onclick={finish}>Saltar</button>
      {/if}
      <button class="btn-next" onclick={next}>
        {isLast ? 'Comenzar simulación' : 'Siguiente'}
      </button>
    </div>
  </div>
</div>

<style>
  .onboarding {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(15, 14, 13, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: appear 0.25s ease;
  }

  .onboarding.leaving {
    animation: disappear 0.28s ease forwards;
  }

  @keyframes appear    { from { opacity: 0 } to { opacity: 1 } }
  @keyframes disappear { from { opacity: 1 } to { opacity: 0 } }

  .card {
    background: var(--surface);
    border-radius: 20px;
    padding: 32px 28px 24px;
    max-width: 380px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 48px rgba(0,0,0,0.35);
    animation: card-up 0.28s cubic-bezier(0.34,1.56,0.64,1);
  }

  @keyframes card-up {
    from { transform: translateY(20px); opacity: 0 }
    to   { transform: translateY(0);    opacity: 1 }
  }

  .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 24px;
  }

  .sdot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-strong);
    transition: background 0.2s, transform 0.2s;
  }

  .sdot.active {
    background: var(--accent);
    transform: scale(1.25);
  }

  .step-icon {
    font-size: 48px;
    margin-bottom: 16px;
    line-height: 1;
  }

  .step-title {
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 10px;
    line-height: 1.2;
  }

  .step-body {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.55;
    margin: 0 0 28px;
  }

  .btn-row {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  .btn-skip {
    padding: 10px 18px;
    background: none;
    border: 1.5px solid var(--border-strong);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .btn-skip:hover {
    border-color: var(--text-muted);
    color: var(--text-primary);
  }

  .btn-next {
    flex: 1;
    padding: 10px 18px;
    background: var(--surface-dark);
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    transition: opacity 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .btn-next:hover { opacity: 0.85; }
</style>
