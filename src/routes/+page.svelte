<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { ELECTION_DAY_TARGET } from '$lib/firebase';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  
  // Animation state
  let isLoaded = $state(false);
  let countdownData = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let showHelpPanel = $state(false);
  
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

      <!-- Help Panel (used by footer) -->
      <HelpPanel isOpen={showHelpPanel} onClose={() => showHelpPanel = false} />

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
        <div class="video-title">Mira cómo usar la cédula en menos de 30 segundos</div>
        <div class="video-subtitle">Aprende a recorrerla, marcar correctamente y practicar antes del día de la elección.</div>
        <div class="video-frame">
          <video 
            class="video-player"
            id="demo-video"
            autoplay 
            muted 
            loop 
            playsinline
            preload="auto"
            onended={() => {
              const video = document.getElementById('demo-video') as HTMLVideoElement;
              if (video) {
                video.currentTime = 0;
                video.play();
              }
            }}
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      <!-- Educational Block 1 - Primera Vuelta -->
      <div class="educational-block" in:fade={{ duration: 400, delay: 1000 }}>
        <h2 class="block-title">Esta es la única vuelta donde eliges todo</h2>
        <p class="block-text">En esta primera vuelta no solo votas por presidente. También eliges senadores, diputados y representantes al Parlamento Andino. Estas decisiones se toman ahora y definen cómo se verá el Congreso en los próximos años.</p>
      </div>

      <!-- Educational Block 2 - No es solo presidencial -->
      <div class="educational-block" in:fade={{ duration: 400, delay: 1200 }}>
        <h2 class="block-title">Tu voto no es solo presidencial</h2>
        <p class="block-text">En la cédula también eliges quiénes tendrán poder en el Congreso. Esas decisiones influyen en qué tan fácil o difícil será gobernar después.</p>
      </div>

      <!-- Educational Block 3 - Evitar errores -->
      <div class="educational-block" in:fade={{ duration: 400, delay: 1400 }}>
        <h2 class="block-title">Votar bien también importa</h2>
        <p class="block-text">Un error al marcar la cédula puede hacer que tu voto sea nulo o viciado. Practicar antes te ayuda a entender las opciones y evitar equivocaciones.</p>
      </div>

      <!-- Educational Block 4 - Decisiones múltiples -->
      <div class="educational-block" in:fade={{ duration: 400, delay: 1600 }}>
        <h2 class="block-title">La cédula tiene varias decisiones</h2>
        <p class="block-text">Puedes votar en distintas columnas y, en algunos casos, usar voto preferencial. Practicar antes te ayuda a llegar con más claridad el día de la elección.</p>
      </div>

      <!-- Secondary CTA -->
      <div class="cta-wrapper secondary" in:fly={{ y: 20, duration: 400, delay: 1800 }}>
        <button class="cta-btn cta-secondary" onclick={goToSimulation}>
          Practicar ahora
        </button>
      </div>

      <!-- Trust Bar -->
      <div class="trust-bar" in:fade={{ duration: 400, delay: 2000 }}>
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

      <!-- Footer -->
      <footer class="footer-section" in:fade={{ duration: 400, delay: 1900 }}>
        <div class="footer-links">
          <button 
            class="footer-link"
            onclick={() => showHelpPanel = true}
          >
            <svg class="footer-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span>¿Dudas o sugerencias?</span>
          </button>
          <span class="footer-separator">·</span>
          <span class="footer-credit">Hecho con ♥ por <a href="https://x.com/nirvriaji" target="_blank" rel="noopener noreferrer">@nirvriaji</a></span>
        </div>
      </footer>

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

  /* Footer Section */
  .footer-section {
    margin-top: 8px;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
  }

  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color 0.2s ease;
    padding: 4px;
  }

  .footer-link:hover {
    color: rgba(255, 255, 255, 0.95);
  }

  .footer-icon {
    flex-shrink: 0;
  }

  .footer-separator {
    color: rgba(255, 255, 255, 0.3);
  }

  .footer-credit a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .footer-credit a:hover {
    color: rgba(255, 255, 255, 0.95);
    text-decoration: underline;
  }

  /* Mobile: Footer adjustments */
  @media (max-width: 480px) {
    .footer-links {
      flex-direction: column;
      gap: 8px;
    }

    .footer-separator {
      display: none;
    }
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
