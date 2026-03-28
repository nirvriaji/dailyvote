<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  
  interface Step {
    title: string;
    description: string;
    target?: string;
    position?: 'center' | 'top' | 'bottom';
  }
  
  const steps: Step[] = [
    {
      title: "👋 Bienvenido al simulador",
      description: "Vas a practicar con la cédula electoral real de Perú 2026. Te guiaré en los pasos clave.",
      position: 'center'
    },
    {
      title: "📋 5 columnas, 5 votos",
      description: "Debes votar en Presidente, Senadores (2), Diputados y Parlamento Andino. Uno por columna.",
      position: 'center'
    },
    {
      title: "🎯 3 formas de votar",
      description: "En cada fila verás: símbolo del partido, número de candidato, o foto del presidente. Haz clic en tu preferencia.",
      position: 'center'
    },
    {
      title: "✅ Marca tu X",
      description: "Aparecerá una X roja en tu selección. Puedes cambiar tu voto antes de pasar a la siguiente columna.",
      position: 'center'
    },
    {
      title: "🏁 ¡Listo para empezar!",
      description: "Navega libremente, explora todos los partidos, y vota con confianza. Sin presión, es solo práctica.",
      position: 'center'
    }
  ];
  
  let { onComplete, onSkip }: { onComplete: () => void; onSkip: () => void } = $props();
  
  let currentStep = $state(0);
  let totalSteps = steps.length;
  
  function nextStep() {
    if (currentStep < totalSteps - 1) {
      currentStep++;
    } else {
      onComplete();
    }
  }
  
  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
    }
  }
  
  function skipTour() {
    onSkip();
  }
  
  let progress = $derived(((currentStep + 1) / totalSteps) * 100);
</script>

<div class="tour-overlay" transition:fade={{ duration: 300 }}>
  <div class="tour-backdrop" onclick={skipTour}></div>
  
  <div class="tour-card" transition:fly={{ y: 20, duration: 400 }}>
    <!-- Progress bar -->
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress}%"></div>
    </div>
    
    <!-- Content -->
    <div class="tour-content">
      <span class="step-badge">Paso {currentStep + 1} de {totalSteps}</span>
      
      <h2 class="tour-title">{steps[currentStep].title}</h2>
      <p class="tour-description">{steps[currentStep].description}</p>
    </div>
    
    <!-- Navigation -->
    <div class="tour-footer">
      <div class="nav-buttons">
        {#if currentStep > 0}
          <button class="btn-prev" onclick={prevStep}>
            ← Anterior
          </button>
        {:else}
          <span></span> <!-- Spacer -->
        {/if}
        
        <button class="btn-next" onclick={nextStep}>
          {currentStep === totalSteps - 1 ? '¡Comenzar!' : 'Siguiente →'}
        </button>
      </div>
      
      <button class="btn-skip" onclick={skipTour}>
        Saltar tour
      </button>
    </div>
    
    <!-- Dots indicator -->
    <div class="dots-container">
      {#each steps as _, i}
        <div class="dot" class:active={i === currentStep}></div>
      {/each}
    </div>
  </div>
</div>

<style>
  .tour-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .tour-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(4px);
  }

  .tour-card {
    position: relative;
    background: white;
    border-radius: 24px;
    padding: 40px;
    max-width: 480px;
    width: 100%;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
    overflow: hidden;
  }

  /* Progress bar */
  .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: #f0f0f0;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #C8102E, #ff4757);
    transition: width 0.3s ease;
  }

  /* Content */
  .tour-content {
    text-align: center;
    margin-bottom: 32px;
  }

  .step-badge {
    display: inline-block;
    background: #f8f9fa;
    color: #666;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 20px;
  }

  .tour-title {
    font-size: 28px;
    font-weight: 800;
    color: #1a1a2e;
    margin: 0 0 16px 0;
    line-height: 1.2;
  }

  .tour-description {
    font-size: 17px;
    color: #555;
    line-height: 1.6;
    margin: 0;
  }

  /* Footer */
  .tour-footer {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .nav-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .btn-prev,
  .btn-next {
    padding: 14px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-prev {
    background: #f0f0f0;
    color: #555;
  }

  .btn-prev:hover {
    background: #e0e0e0;
  }

  .btn-next {
    background: linear-gradient(135deg, #C8102E, #a00d25);
    color: white;
    flex: 1;
    max-width: 200px;
  }

  .btn-next:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(200, 16, 46, 0.3);
  }

  .btn-skip {
    background: transparent;
    border: none;
    color: #999;
    font-size: 14px;
    cursor: pointer;
    padding: 8px;
    transition: color 0.2s;
  }

  .btn-skip:hover {
    color: #666;
  }

  /* Dots */
  .dots-container {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e0e0e0;
    transition: all 0.3s ease;
  }

  .dot.active {
    background: #C8102E;
    width: 24px;
    border-radius: 4px;
  }

  /* Mobile */
  @media (max-width: 480px) {
    .tour-card {
      padding: 30px 24px;
    }

    .tour-title {
      font-size: 24px;
    }

    .tour-description {
      font-size: 15px;
    }

    .btn-next {
      max-width: none;
    }
  }
</style>
