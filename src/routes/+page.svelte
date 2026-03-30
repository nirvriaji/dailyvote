<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { ELECTION_DAY_TARGET } from '$lib/firebase';
  
  // Animation state
  let isLoaded = $state(false);
  let countdownData = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  
  function updateCountdown() {
    const now = new Date();
    const diff = ELECTION_DAY_TARGET.getTime() - now.getTime();
    
    if (diff <= 0) {
      countdownData = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }
    
    const totalSeconds = Math.floor(diff / 1000);
    countdownData = {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };
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
    <!-- Content -->
    <div class="landing-inner" in:fly={{ y: 30, duration: 600 }}>
      <!-- Top Pill -->
      <div class="pill-wrapper" in:fade={{ duration: 400, delay: 200 }}>
        <span class="top-pill">PE · ELECCIONES GENERALES 2026</span>
      </div>

      <!-- Headline -->
      <h1 class="headline" in:fly={{ y: 20, duration: 500, delay: 300 }}>
        <span class="headline-line1">SIMULA TU VOTO</span>
        <span class="headline-line2">ANTES DEL 12 DE ABRIL</span>
      </h1>

      <!-- Countdown -->
      <div class="countdown-wrapper" in:fade={{ duration: 400, delay: 400 }}>
        <div class="countdown-box">
          <div class="countdown-item">
            <span class="countdown-number">{countdownData.days}</span>
            <span class="countdown-label">días</span>
          </div>
          <span class="countdown-separator">:</span>
          <div class="countdown-item">
            <span class="countdown-number">{countdownData.hours.toString().padStart(2, '0')}</span>
            <span class="countdown-label">horas</span>
          </div>
          <span class="countdown-separator">:</span>
          <div class="countdown-item">
            <span class="countdown-number">{countdownData.minutes.toString().padStart(2, '0')}</span>
            <span class="countdown-label">min</span>
          </div>
          <span class="countdown-separator">:</span>
          <div class="countdown-item">
            <span class="countdown-number">{countdownData.seconds.toString().padStart(2, '0')}</span>
            <span class="countdown-label">seg</span>
          </div>
        </div>
        <span class="countdown-caption">Para votar</span>
      </div>

      <!-- Description -->
      <p class="subline" in:fade={{ duration: 400, delay: 500 }}>
        Explora la cédula electoral real, practica cómo votar correctamente por foto, símbolo o voto preferencial y evita errores que puedan convertir tu voto en nulo o viciado.
      </p>

      <!-- Primary CTA -->
      <div class="cta-wrapper" in:fly={{ y: 20, duration: 400, delay: 600 }}>
        <button class="cta-btn" onclick={goToSimulation}>
          <span class="cta-icon">🗳️</span>
          <span class="cta-text">Simular mi voto</span>
        </button>
        <span class="cta-note">Gratis · Sin registro · 100% educativo</span>
      </div>

      <!-- Video Demo Section -->
      <div class="video-section" in:fade={{ duration: 400, delay: 800 }}>
        <div class="video-title">Mira cómo votar en menos de 30 segundos</div>
        <div class="video-subtitle">Aprende a recorrer la cédula y marcar correctamente antes del día de la elección</div>
        <div class="video-frame">
          <video 
            class="video-player" 
            autoplay 
            muted 
            loop 
            playsinline
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <!-- Educational Block 1 -->
      <div class="educational-block" in:fade={{ duration: 400, delay: 1000 }}>
        <h2 class="block-title">Tu voto no es solo presidencial</h2>
        <p class="block-text">En la cédula también eliges senadores y diputados. Esas decisiones influyen en qué tan fácil o difícil será gobernar después.</p>
      </div>

      <!-- Educational Block 2 - Conciencia -->
      <div class="educational-block" in:fade={{ duration: 400, delay: 1200 }}>
        <h2 class="block-title">Muchos quieren cambios. Ese día es cuando realmente se deciden.</h2>
        <p class="block-text">No basta con elegir presidente. Las decisiones en el Congreso también determinan si esos cambios pueden avanzar o se quedan bloqueados.</p>
      </div>

      <!-- Educational Block 3 - Anti Error -->
      <div class="educational-block" in:fade={{ duration: 400, delay: 1400 }}>
        <h2 class="block-title">Votar bien también importa</h2>
        <p class="block-text">Un error al marcar la cédula puede hacer que tu voto sea nulo o viciado. Practicar antes te ayuda a evitarlo.</p>
      </div>

      <!-- Secondary CTA -->
      <div class="cta-wrapper secondary" in:fly={{ y: 20, duration: 400, delay: 1600 }}>
        <button class="cta-btn cta-secondary" onclick={goToSimulation}>
          Practicar ahora
        </button>
      </div>

      <!-- Trust Bar -->
      <div class="trust-bar" in:fade={{ duration: 400, delay: 1800 }}>
        <span class="trust-item">
          <span class="trust-icon">✓</span>
          36 partidos reales
        </span>
        <span class="trust-dot">·</span>
        <span class="trust-item">
          <span class="trust-icon">✓</span>
          Resultados en vivo
        </span>
        <span class="trust-dot">·</span>
        <span class="trust-item">
          <span class="trust-icon">✓</span>
          100% educativo
        </span>
      </div>

      <!-- Disclaimer -->
      <p class="disclaimer" in:fade={{ duration: 400, delay: 2000 }}>
        <strong>Nota:</strong> Este es un simulador educativo. Los resultados son generados por simulaciones acumuladas y no representan resultados oficiales.
      </p>
    </div>
  </main>
{/if}

<style>
  .landing {
    min-height: 100dvh;
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 20px 16px;
  }

  /* Content */
  .landing-inner {
    max-width: 600px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
  }

  /* Top Pill */
  .pill-wrapper {
    margin-bottom: 8px;
  }

  .top-pill {
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #C8102E;
    border-radius: 50px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: white;
    backdrop-filter: blur(8px);
  }

  /* Headline */
  .headline {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .headline-line1 {
    font-size: clamp(40px, 8vw, 64px);
    font-weight: 900;
    color: white;
    line-height: 1;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }

  .headline-line2 {
    font-size: clamp(40px, 8vw, 64px);
    font-weight: 900;
    color: #ff6b6b;
    line-height: 1;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }

  /* Countdown - Apple Style */
  .countdown-wrapper {
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .countdown-box {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.4);
    padding: 12px 20px;
    border-radius: 12px;
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .countdown-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 50px;
  }

  .countdown-number {
    font-size: clamp(28px, 5vw, 40px);
    font-weight: 700;
    color: white;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .countdown-label {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }

  .countdown-separator {
    font-size: clamp(24px, 4vw, 32px);
    font-weight: 300;
    color: rgba(255, 255, 255, 0.4);
    margin-top: -12px;
  }

  .countdown-caption {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 500;
  }

  /* Subline */
  .subline {
    font-size: clamp(16px, 2.5vw, 20px);
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
    max-width: 550px;
  }

  /* CTA */
  .cta-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .cta-wrapper.secondary {
    margin-top: 12px;
  }

  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 20px 44px;
    background: linear-gradient(135deg, #C8102E 0%, #a00d25 100%);
    color: white;
    text-decoration: none;
    border: none;
    border-radius: 50px;
    font-size: 18px;
    font-weight: 700;
    transition: all 0.3s ease;
    cursor: pointer;
    box-shadow: 0 8px 30px rgba(200, 16, 46, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .cta-btn:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 40px rgba(200, 16, 46, 0.5);
  }

  .cta-btn:active {
    transform: translateY(-1px) scale(0.98);
  }

  .cta-btn.cta-secondary {
    background: transparent;
    border: 2px solid #C8102E;
    box-shadow: none;
  }

  .cta-btn.cta-secondary:hover {
    background: #C8102E;
    box-shadow: 0 8px 30px rgba(200, 16, 46, 0.3);
  }

  .cta-icon {
    font-size: 26px;
  }

  .cta-note {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  /* Video Section - Phone Mockup */
  .video-section {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .video-title {
    font-size: 18px;
    font-weight: 700;
    color: white;
    line-height: 1.4;
  }

  .video-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
    max-width: 360px;
  }

  .video-frame {
    position: relative;
    background: #1a1a1a;
    border-radius: 24px;
    padding: 8px;
    box-shadow: 
      0 0 0 2px #333,
      0 20px 60px rgba(0, 0, 0, 0.6),
      inset 0 2px 4px rgba(255, 255, 255, 0.1);
    overflow: hidden;
    width: 100%;
    max-width: 320px;
  }

  .video-frame::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 20px;
    background: #1a1a1a;
    border-radius: 0 0 12px 12px;
    z-index: 10;
  }

  .video-player {
    width: 100%;
    height: auto;
    max-height: 500px;
    border-radius: 16px;
    display: block;
    background: #000;
  }

  /* Educational Blocks */
  .educational-block {
    max-width: 520px;
    text-align: center;
    padding: 24px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .block-title {
    font-size: 20px;
    font-weight: 700;
    color: white;
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .block-text {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.6;
    margin: 0;
  }

  /* Trust Bar - Minimal */
  .trust-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 12px 24px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .trust-item {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    font-weight: 500;
  }

  .trust-icon {
    width: 18px;
    height: 18px;
    background: #22c55e;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: white;
    font-weight: bold;
  }

  .trust-dot {
    color: rgba(255, 255, 255, 0.3);
    font-size: 14px;
  }

  /* Disclaimer */
  .disclaimer {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.5;
    max-width: 450px;
    text-align: center;
  }

  .disclaimer strong {
    color: rgba(255, 255, 255, 0.7);
  }

  /* Mobile Responsive */
  @media (max-width: 640px) {
    .landing {
      padding: 16px;
    }

    .landing-inner {
      gap: 24px;
    }

    .pill-wrapper {
      margin-bottom: 4px;
    }

    .top-pill {
      font-size: 10px;
      padding: 6px 12px;
    }

    .headline {
      margin-bottom: 4px;
    }

    .headline-line1,
    .headline-line2 {
      font-size: 32px;
    }

    .countdown-box {
      padding: 10px 16px;
    }

    .countdown-number {
      font-size: 24px;
    }

    .countdown-label {
      font-size: 9px;
    }

    .subline {
      font-size: 15px;
    }

    .cta-btn {
      padding: 16px 32px;
      font-size: 16px;
    }

    .video-title {
      font-size: 16px;
    }

    .video-subtitle {
      font-size: 13px;
    }

    .video-frame {
      max-width: 280px;
    }

    .educational-block {
      padding: 20px;
    }

    .block-title {
      font-size: 18px;
    }

    .block-text {
      font-size: 14px;
    }

    .trust-bar {
      flex-direction: column;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 12px;
    }

    .trust-dot {
      display: none;
    }

    .trust-item {
      font-size: 13px;
    }

    .disclaimer {
      font-size: 11px;
      max-width: 100%;
      padding: 0 16px;
    }
  }

  @media (max-width: 380px) {
    .headline-line1,
    .headline-line2 {
      font-size: 28px;
    }

    .countdown-number {
      font-size: 20px;
    }

    .countdown-item {
      min-width: 40px;
    }
  }
</style>
