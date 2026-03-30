<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { ELECTION_DAY_TARGET } from '$lib/firebase';
  
  // Animation state
  let isLoaded = $state(false);
  let countdownText = $state('');
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  
  function updateCountdown() {
    const now = new Date();
    const diff = ELECTION_DAY_TARGET.getTime() - now.getTime();
    
    if (diff <= 0) {
      countdownText = 'La jornada de votación ya comenzó';
      return;
    }
    
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    countdownText = `Faltan: ${days}d ${hours}h ${minutes}m ${seconds}s para votar`;
  }
  
  onMount(() => {
    isLoaded = true;
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
    
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  });
  
  function goToSimulation() {
    goto('/simular');
  }
</script>

<svelte:head>
  <title>Simulador Electoral Perú 2026 — Aprende a votar</title>
  <meta name="description" content="Practica tu voto para las Elecciones Generales Perú 2026. Simulador interactivo de la cédula electoral con los 36 partidos políticos." />
</svelte:head>

{#if isLoaded}
  <main class="landing">
    <!-- Background pattern -->
    <div class="bg-pattern" aria-hidden="true">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
    
    <div class="landing-inner" in:fly={{ y: 30, duration: 600 }}>
      <!-- Pill superior -->
      <div class="pill-wrapper" in:fade={{ duration: 400, delay: 200 }}>
        <span class="top-pill">PE · ELECCIONES GENERALES 2026</span>
      </div>

      <!-- Headline principal -->
      <h1 class="headline" in:fly={{ y: 20, duration: 500, delay: 300 }}>
        <span class="headline-line1">SIMULA TU VOTO</span>
        <span class="headline-line2">ANTES DEL 12 DE ABRIL</span>
      </h1>

      <!-- Cuenta regresiva -->
      <div class="countdown-wrapper" in:fade={{ duration: 400, delay: 400 }}>
        <span class="countdown-text">{countdownText}</span>
      </div>

      <!-- Descripción principal -->
      <p class="subline" in:fade={{ duration: 400, delay: 500 }}>
        Explora la cédula electoral real, prueba distintas elecciones y descubre cómo cambiarían los resultados.
      </p>

      <!-- Primary CTA -->
      <div class="cta-wrapper" in:fly={{ y: 20, duration: 400, delay: 600 }}>
        <button class="cta-btn" onclick={goToSimulation}>
          <span class="cta-icon">🗳️</span>
          <span class="cta-text">Simular mi voto</span>
        </button>
        <span class="cta-note">Cédula interactiva · Sin registro · 2 minutos</span>
        <span class="interaction-hint">Desliza la cédula y marca tus opciones como en la elección real.</span>
      </div>

      <!-- Feature cards -->
      <div class="features-grid" in:fly={{ y: 20, duration: 400, delay: 800 }}>
        <div class="feature-card">
          <div class="feature-icon">📋</div>
          <h3>CÉDULA REAL</h3>
          <p>Explora la cédula amplia e interactiva tal como se presenta en la elección.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>RESULTADOS EN VIVO</h3>
          <p>Mira cómo se mueven los resultados acumulados y prueba escenarios de proyección.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎯</div>
          <h3>VOTO GUIADO</h3>
          <p>Aprende a marcar correctamente y entiende cómo navegar cada sección de la cédula.</p>
        </div>
      </div>

      <!-- Trust indicators -->
      <div class="trust-section" in:fade={{ duration: 400, delay: 1000 }}>
        <div class="trust-item">
          <span class="trust-check">✓</span>
          <span>36 partidos políticos reales</span>
        </div>
        <div class="trust-item">
          <span class="trust-check">✓</span>
          <span>Resultados acumulados en tiempo real</span>
        </div>
        <div class="trust-item">
          <span class="trust-check">✓</span>
          <span>100% educativo e interactivo</span>
        </div>
      </div>

      <!-- Impact hint -->
      <div class="impact-hint" in:fade={{ duration: 400, delay: 1100 }}>
        Explora qué pasaría si más personas votaran igual que tú.
      </div>

      <!-- Disclaimer -->
      <p class="disclaimer" in:fade={{ duration: 400, delay: 1200 }}>
        <strong>Nota:</strong> Este es un simulador educativo. Los resultados son generados por simulaciones acumuladas y no representan resultados oficiales.
      </p>
    </div>
  </main>
{/if}

<style>
  .landing {
    min-height: 100dvh;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 24px 40px;
    overflow: hidden;
    position: relative;
  }

  /* Background animated circles */
  .bg-pattern {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.1;
  }

  .circle-1 {
    width: 600px;
    height: 600px;
    background: #C8102E;
    top: -200px;
    right: -200px;
    animation: float 20s infinite ease-in-out;
  }

  .circle-2 {
    width: 400px;
    height: 400px;
    background: #ffffff;
    bottom: -100px;
    left: -100px;
    animation: float 25s infinite ease-in-out reverse;
  }

  .circle-3 {
    width: 300px;
    height: 300px;
    background: #C8102E;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: pulse 15s infinite ease-in-out;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(30px, -30px); }
  }

  @keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.05; }
    50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.1; }
  }

  .landing-inner {
    max-width: 800px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    z-index: 1;
  }

  /* Top Pill */
  .pill-wrapper {
    margin-bottom: 24px;
  }

  .top-pill {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #C8102E;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: white;
  }

  /* Headline - NEW */
  .headline {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .headline-line1 {
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 800;
    color: white;
    line-height: 1.1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }

  .headline-line2 {
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 800;
    color: #ff6b6b;
    line-height: 1.1;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }

  /* Countdown - NEW */
  .countdown-wrapper {
    margin-bottom: 24px;
  }

  .countdown-text {
    display: inline-block;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    font-family: monospace;
    letter-spacing: 0.5px;
  }

  /* Subline - IMPROVED */
  .subline {
    font-size: clamp(16px, 2.5vw, 20px);
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
    margin-bottom: 32px;
    max-width: 600px;
  }

  /* CTA - IMPROVED */
  .cta-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 50px;
  }

  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 20px 40px;
    background: linear-gradient(135deg, #C8102E 0%, #a00d25 100%);
    color: white;
    text-decoration: none;
    border: none;
    border-radius: 16px;
    font-size: 20px;
    font-weight: 800;
    transition: all 0.3s ease;
    cursor: pointer;
    box-shadow: 0 8px 25px rgba(200, 16, 46, 0.25);
  }

  .cta-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(200, 16, 46, 0.35);
  }

  .cta-btn:active {
    transform: translateY(-1px);
  }

  .cta-icon {
    font-size: 28px;
  }

  .cta-note {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }

  .interaction-hint {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
    max-width: 400px;
    text-align: center;
    line-height: 1.4;
  }

  /* Features Grid - NEW */
  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    width: 100%;
    max-width: 700px;
    margin-bottom: 40px;
  }

  .feature-card {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    transition: all 0.3s ease;
  }

  .feature-card:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-5px);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .feature-icon {
    font-size: 40px;
    margin-bottom: 12px;
  }

  .feature-card h3 {
    color: white;
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .feature-card p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }

  /* Trust section - NEW */
  .trust-section {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px 40px;
    margin-bottom: 20px;
  }

  .trust-item {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 15px;
  }

  .trust-check {
    width: 22px;
    height: 22px;
    background: #28a745;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: white;
    font-weight: bold;
  }

  /* Impact hint - NEW */
  .impact-hint {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    margin-bottom: 30px;
    font-style: italic;
  }

  /* Disclaimer - IMPROVED */
  .disclaimer {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    max-width: 500px;
    background: rgba(0, 0, 0, 0.2);
    padding: 12px 20px;
    border-radius: 8px;
  }

  .disclaimer strong {
    color: rgba(255, 255, 255, 0.8);
  }

  /* Mobile responsive */
  @media (max-width: 640px) {
    .landing {
      padding: 40px 20px;
    }

    .headline {
      font-size: 36px;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .trust-section {
      flex-direction: column;
      gap: 12px;
    }

    .cta-btn {
      padding: 18px 32px;
      font-size: 18px;
    }
  }
</style>
