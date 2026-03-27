<script lang="ts">
  // Landing page — entry point to the simulation
</script>

<svelte:head>
  <title>Simulador Electoral Perú 2026</title>
</svelte:head>

<main class="landing">
  <div class="landing-inner">

    <!-- Top badge -->
    <span class="badge">Perú · Elecciones 2026</span>

    <!-- Headline -->
    <h1 class="headline">
      Practica tu<br />
      <span class="headline-accent">voto electoral</span>
    </h1>

    <p class="subline">
      Explora la cédula real, aprende cómo votar<br />
      y simula tu elección sin confusiones.
    </p>

    <!-- CTA -->
    <a href="/simular" class="cta-btn">
      Simular mi voto
      <span aria-hidden="true">→</span>
    </a>

    <!-- Feature list -->
    <ul class="features">
      <li>
        <span class="feat-icon" aria-hidden="true">↔</span>
        Navega las 5 columnas de la cédula
      </li>
      <li>
        <span class="feat-icon" aria-hidden="true">☝</span>
        Voto asistido — aprende las formas válidas de marcar
      </li>
      <li>
        <span class="feat-icon" aria-hidden="true">📍</span>
        Siempre sabes dónde estás en la cédula
      </li>
    </ul>

    <!-- Disclaimer -->
    <p class="disclaimer">
      Simulación con datos de ejemplo — no es información oficial ni vinculante.
    </p>

  </div>
</main>

<style>
  .landing {
    min-height: 100dvh;
    background: var(--surface-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    overflow: auto;
  }

  .landing-inner {
    max-width: 400px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ─── Badge ─────────────────────────────────────────────────────────────────── */
  .badge {
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    margin-bottom: 24px;
  }

  /* ─── Headline ───────────────────────────────────────────────────────────────── */
  .headline {
    font-size: clamp(32px, 8vw, 48px);
    font-weight: 900;
    color: white;
    line-height: 1.1;
    letter-spacing: -0.02em;
    margin-bottom: 16px;
  }

  .headline-accent {
    color: var(--accent-light);
  }

  .subline {
    font-size: 15px;
    color: rgba(255,255,255,0.5);
    line-height: 1.55;
    margin-bottom: 36px;
  }

  /* ─── CTA button ─────────────────────────────────────────────────────────────── */
  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 28px;
    background: var(--accent);
    color: white;
    text-decoration: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 700;
    transition: opacity 0.15s, transform 0.15s;
    margin-bottom: 40px;
    -webkit-tap-highlight-color: transparent;
  }

  .cta-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .cta-btn:active {
    transform: translateY(0);
    opacity: 1;
  }

  /* ─── Features ───────────────────────────────────────────────────────────────── */
  .features {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 40px;
    width: 100%;
    text-align: left;
    padding: 0;
  }

  .features li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    line-height: 1.35;
  }

  .feat-icon {
    min-width: 28px;
    height: 28px;
    background: rgba(255,255,255,0.07);
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: rgba(255,255,255,0.7);
  }

  /* ─── Disclaimer ─────────────────────────────────────────────────────────────── */
  .disclaimer {
    font-size: 11px;
    color: rgba(255,255,255,0.25);
    line-height: 1.4;
    max-width: 320px;
  }
</style>
