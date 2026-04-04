<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { ELECTION_DAY_TARGET } from '$lib/firebase';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  import ShareModal from '$lib/components/ShareModal.svelte';

  let isLoaded = $state(false);
  let countdownData = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let showHelpPanel = $state(false);
  let showShareModal = $state(false);

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
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });

  function goToSimulation() {
    goto('/simular');
  }
</script>

<svelte:head>
  <title>Simulador Electoral Perú 2026 — Aprende a votar | La Fecha Más Importante</title>
  <meta name="description" content="Practica tu voto para las Elecciones Generales Perú 2026. Simulador interactivo de la cédula electoral con los partidos políticos. Aprende a votar correctamente por presidente, congreso y parlamento andino. Evita errores que anulan tu voto." />
  <meta name="keywords" content="simulador voto Perú 2026, cédula electoral, elecciones Perú, cómo votar, practicar voto, voto preferencial, simulador electoral, fecha elecciones 2026" />
  <meta name="author" content="Irvin Pereyra" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://lafechamasimportante.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://lafechamasimportante.com/" />
  <meta property="og:site_name" content="La Fecha Más Importante" />
  <meta property="og:title" content="Simulador Electoral Perú 2026 — Aprende a votar" />
  <meta property="og:description" content="Practica tu voto para las Elecciones Generales Perú 2026. Simulador interactivo de la cédula electoral con los partidos políticos." />
  <meta property="og:image" content="https://lafechamasimportante.com/favicon.svg" />
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:locale" content="es_PE" />
  <meta property="twitter:card" content="summary" />
  <meta property="twitter:url" content="https://lafechamasimportante.com/" />
  <meta property="twitter:title" content="Simulador Electoral Perú 2026 — Aprende a votar" />
  <meta property="twitter:description" content="Practica tu voto para las Elecciones Generales Perú 2026. Simulador interactivo de la cédula electoral." />
  <meta property="twitter:image" content="https://lafechamasimportante.com/favicon.svg" />
  <meta property="twitter:creator" content="@nirvriaji" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Simulador Electoral Perú 2026",
    "description": "Practica tu voto para las Elecciones Generales Perú 2026",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Any",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "PEN" },
    "author": { "@type": "Person", "name": "Irvin Pereyra", "url": "https://x.com/nirvriaji" },
    "url": "https://lafechamasimportante.com/",
    "datePublished": "2025-03-01",
    "dateModified": "2025-03-30",
    "inLanguage": "es"
  })}</script>`}
</svelte:head>

{#if isLoaded}
  <main class="landing">
    <div class="landing-inner" in:fly={{ y: 30, duration: 600 }}>

      <HelpPanel isOpen={showHelpPanel} onClose={() => showHelpPanel = false} />
      <ShareModal
        isOpen={showShareModal}
        onClose={() => showShareModal = false}
        url="https://lafechamasimportante.com/"
        text="Practica tu voto para las elecciones Perú 2026 con la cédula real."
      />

      <!-- ━━━ S1 · HERO ━━━
           Layout: pill → headline (2 lines) → countdown → subtitle → CTA + trust note -->
      <section class="hero">
        <div in:fade={{ duration: 400, delay: 100 }}>
          <span class="top-pill">PE · ELECCIONES GENERALES 2026</span>
        </div>

        <h1 class="headline" in:fly={{ y: 20, duration: 500, delay: 200 }}>
          <span class="headline-line1">SIMULA TU VOTO.</span>
          <span class="headline-line2">VE CÓMO CAMBIA LOS RESULTADOS.</span>
        </h1>

        <div class="countdown-wrapper" in:fade={{ duration: 400, delay: 300 }}>
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
          <span class="countdown-caption">Para el 12 de abril</span>
        </div>

        <p class="subline" in:fade={{ duration: 400, delay: 400 }}>
          Usa la cédula electoral real. Aprende a marcar sin errores, ve cómo tu voto suma al partido y comprueba cómo eso cambia los resultados.
        </p>

        <div class="cta-wrapper" in:fly={{ y: 20, duration: 400, delay: 500 }}>
          <button class="cta-btn" onclick={goToSimulation}>
            <span class="cta-icon">🗳️</span>
            <span class="cta-text">Simular mi voto</span>
          </button>
          <span class="cta-note">Gratis · Sin registro · 100% educativo</span>
          <span class="cta-outcome">Después de votar, verás cómo tu decisión se transforma en resultados.</span>
        </div>
      </section>

      <!-- ━━━ S2 · 3 BENEFITS ━━━
           Layout: section title → 3-column card grid (stacks on mobile) -->
      <section class="benefits-section" in:fade={{ duration: 400, delay: 600 }}>
        <h2 class="section-title">Lo que vas a descubrir</h2>
        <div class="benefits-grid">
          <div class="benefit-card">
            <span class="benefit-icon">✓</span>
            <p class="benefit-title">Sin votos nulos ni viciados</p>
            <p class="benefit-text">Aprende a marcar correctamente y evita que tu voto sea nulo o viciado.</p>
          </div>
          <div class="benefit-card">
            <span class="benefit-icon">✓</span>
            <p class="benefit-title">Cuatro elecciones en una cédula</p>
            <p class="benefit-text">En esta vuelta decides presidente, Senado, Diputados y Parlamento Andino al mismo tiempo.</p>
          </div>
          <div class="benefit-card">
            <span class="benefit-icon">✓</span>
            <p class="benefit-title">Tu voto suma al partido, no solo al candidato</p>
            <p class="benefit-text">Tu voto suma al partido que eliges. El voto preferencial define cuáles de sus candidatos entran al Congreso.</p>
          </div>
        </div>
      </section>

      <!-- ━━━ S3 · HOW IT WORKS ━━━
           Layout: section title → vertical 3-step flow with connecting dividers -->
      <section class="how-section" in:fade={{ duration: 400, delay: 700 }}>
        <h2 class="section-title">¿Cómo funciona?</h2>
        <div class="steps">
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <p class="step-title">Practica con la cédula real</p>
              <p class="step-desc">Recorre la cédula oficial con los 36 partidos y candidatos, tal como aparece en cabina.</p>
            </div>
          </div>
          <div class="step-divider"></div>
          <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <p class="step-title">Marca tus decisiones</p>
              <p class="step-desc">Elige tus opciones en cada sección de la cédula: presidente, Senado, Diputados y Parlamento Andino.</p>
            </div>
          </div>
          <div class="step-divider"></div>
          <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <p class="step-title">Descubre qué pasa con tu voto</p>
              <p class="step-desc">Tu voto suma al partido que marcaste. El voto preferencial decide qué candidatos de ese partido entran al Congreso.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ━━━ S4 · VIDEO ━━━
           Layout: section title → description → phone-framed video centered -->
      <section class="video-section" in:fade={{ duration: 400, delay: 800 }}>
        <h2 class="section-title">Mira cómo votar en menos de 30 segundos</h2>
        <p class="video-subtitle">Es más simple de lo que parece. Mira cómo se recorre la cédula, cómo se marca correctamente cada sección y qué convierte un voto en nulo.</p>
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
              if (video) { video.currentTime = 0; video.play(); }
            }}
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      <!-- ━━━ S5 · CONTEXT ━━━
           Layout: titled card with short text + bullet list + closing note -->
      <section class="context-section" in:fade={{ duration: 400, delay: 900 }}>
        <h2 class="context-title">Esta elección define más que la presidencia</h2>
        <p class="context-text">El 12 de abril votas por cuatro cargos en una sola cédula. El Congreso se define en esta etapa, no en segunda vuelta.</p>
        <ul class="vote-list">
          <li>Presidente de la República</li>
          <li>Senado de la República</li>
          <li>Cámara de Diputados</li>
          <li>Parlamento Andino</li>
        </ul>
        <p class="context-note">En segunda vuelta solo compiten dos candidatos presidenciales. Todo lo demás ya fue decidido.</p>
      </section>

      <!-- ━━━ S6 · TRUST / DISCLAIMER ━━━
           Layout: trust pills row → disclaimer text → footer link -->
      <div class="trust-section" in:fade={{ duration: 400, delay: 1000 }}>
        <div class="trust-bar">
          <span class="trust-item">
            <span class="trust-icon">✓</span>
            Cédula con datos reales
          </span>
          <span class="trust-dot">·</span>
          <span class="trust-item">
            <span class="trust-icon">✓</span>
            Sin afiliación política
          </span>
          <span class="trust-dot">·</span>
          <span class="trust-item">
            <span class="trust-icon">✓</span>
            Herramienta educativa
          </span>
        </div>
        <p class="disclaimer">
          Los resultados que ves son simulaciones acumuladas de usuarios. No representan proyecciones electorales ni tienen carácter oficial.
        </p>
      </div>

      <!-- Footer -->
      <footer class="footer-section" in:fade={{ duration: 400, delay: 1100 }}>
        <p class="footer-title">¿Te ayudó esta herramienta?</p>
        <p class="footer-sub">Tu opinión ayuda a mejorar este simulador educativo.</p>
        <div class="footer-actions">
          <button class="footer-link" onclick={() => showHelpPanel = true}>Enviar sugerencia</button>
          <button class="footer-link" onclick={() => showShareModal = true}>Compartir</button>
        </div>
      </footer>

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

  .landing-inner {
    max-width: 600px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 56px;
  }

  /* ── S1: HERO ── */
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: 100%;
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

  .headline {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
  }

  .headline-line1 {
    font-size: clamp(36px, 7.5vw, 60px);
    font-weight: 900;
    color: white;
    line-height: 1;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }

  .headline-line2 {
    font-size: clamp(36px, 7.5vw, 60px);
    font-weight: 900;
    color: #ff6b6b;
    line-height: 1;
    letter-spacing: -0.03em;
    text-transform: uppercase;
  }

  .countdown-wrapper {
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

  .subline {
    font-size: clamp(16px, 2.5vw, 19px);
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.65;
    max-width: 480px;
    margin: 0;
  }

  .cta-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 20px 44px;
    background: linear-gradient(135deg, #C8102E 0%, #a00d25 100%);
    color: white;
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

  .cta-icon {
    font-size: 26px;
  }

  .cta-note {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.65);
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .cta-outcome {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    font-style: italic;
    max-width: 380px;
    line-height: 1.5;
    text-align: center;
  }

  /* ── SHARED SECTION TITLE ── */
  .section-title {
    font-size: clamp(18px, 3vw, 22px);
    font-weight: 700;
    color: white;
    margin: 0 0 24px 0;
    line-height: 1.4;
  }

  /* ── S2: BENEFITS ── */
  .benefits-section {
    width: 100%;
  }

  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    width: 100%;
  }

  .benefit-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 10px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .benefit-icon {
    width: 24px;
    height: 24px;
    min-width: 24px;
    background: #22c55e;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: white;
    font-weight: bold;
  }

  .benefit-title {
    font-size: 14px;
    font-weight: 700;
    color: white;
    margin: 0;
    line-height: 1.35;
  }

  .benefit-text {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.55;
    margin: 0;
  }

  /* ── S3: HOW IT WORKS ── */
  .how-section {
    width: 100%;
  }

  .steps {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 460px;
    margin: 0 auto;
    text-align: left;
  }

  .step {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 14px 0;
  }

  .step-number {
    width: 36px;
    height: 36px;
    min-width: 36px;
    background: #C8102E;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 800;
    color: white;
    line-height: 1;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 5px;
  }

  .step-title {
    font-size: 15px;
    font-weight: 700;
    color: white;
    margin: 0;
    line-height: 1.3;
  }

  .step-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.55;
    margin: 0;
  }

  .step-divider {
    width: 1px;
    height: 14px;
    background: rgba(255, 255, 255, 0.12);
    margin-left: 17px;
  }

  /* ── S4: VIDEO ── */
  .video-section {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .video-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.55;
    max-width: 360px;
    margin: 0;
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

  /* ── S5: CONTEXT ── */
  .context-section {
    width: 100%;
    max-width: 480px;
    padding: 28px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-align: left;
  }

  .context-title {
    font-size: clamp(17px, 3vw, 20px);
    font-weight: 700;
    color: white;
    margin: 0 0 12px 0;
    line-height: 1.4;
  }

  .context-text {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.6;
    margin: 0 0 16px 0;
  }

  .vote-list {
    list-style: none;
    padding: 0;
    margin: 0 0 16px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .vote-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }

  .vote-list li::before {
    content: '';
    width: 6px;
    height: 6px;
    min-width: 6px;
    background: #C8102E;
    border-radius: 50%;
  }

  .context-note {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
    font-style: italic;
  }

  /* ── S6: TRUST ── */
  .trust-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
  }

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

  .disclaimer {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.6;
    max-width: 440px;
    text-align: center;
    margin: 0;
  }

  /* ── FOOTER ── */
  .footer-section {
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .footer-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  .footer-sub {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    margin: 0 0 6px;
  }

  .footer-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .footer-link {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.55);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    padding: 8px 14px;
    transition: border-color 0.2s ease, color 0.2s ease;
  }

  .footer-link:hover {
    border-color: rgba(255, 255, 255, 0.28);
    color: rgba(255, 255, 255, 0.85);
  }

  /* ── MOBILE ── */
  @media (max-width: 640px) {
    .landing {
      padding: 16px;
    }

    .landing-inner {
      gap: 40px;
    }

    .top-pill {
      font-size: 10px;
      padding: 6px 12px;
    }

    .headline-line1,
    .headline-line2 {
      font-size: 30px;
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

    .countdown-item {
      min-width: 40px;
    }

    .subline {
      font-size: 15px;
    }

    .cta-btn {
      padding: 16px 32px;
      font-size: 16px;
    }

    .benefits-grid {
      grid-template-columns: 1fr;
    }

    .benefit-card {
      flex-direction: row;
      align-items: flex-start;
      gap: 12px;
    }

    .video-frame {
      max-width: 280px;
    }

    .context-section {
      padding: 20px;
    }

    .trust-bar {
      flex-direction: column;
      gap: 8px;
      padding: 14px 20px;
      border-radius: 14px;
    }

    .trust-dot {
      display: none;
    }

    .trust-item {
      font-size: 13px;
    }

    .disclaimer {
      font-size: 11px;
      padding: 0 8px;
    }
  }

  @media (max-width: 380px) {
    .headline-line1,
    .headline-line2 {
      font-size: 26px;
    }

    .countdown-number {
      font-size: 20px;
    }
  }
</style>
