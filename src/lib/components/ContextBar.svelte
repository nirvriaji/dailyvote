<script lang="ts">
  import { nav } from '$lib/stores/navigation.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { vote } from '$lib/stores/vote.svelte';
</script>

<header class="ballot-header">
  <!-- Official document branding -->
  <div class="header-branding">
    <div class="peru-seal">🇵🇪</div>
    <div class="header-titles">
      <h1 class="header-title">CÉDULA ELECTORAL</h1>
      <p class="header-subtitle">ELECCIONES GENERALES 2026</p>
    </div>
  </div>

  <!-- Section indicator -->
  <div class="header-section">
    <span class="section-label">SECCIÓN:</span>
    <span class="section-name">{nav.title}</span>
  </div>

  <!-- Progress indicator -->
  <div class="header-progress">
    <button
      class="progress-btn"
      class:complete={vote.count === vote.total}
      onclick={() => ui.toggleSummary()}
      aria-label="{vote.count} de {vote.total} votos. {ui.showSummary ? 'Cerrar' : 'Ver'} resumen"
      aria-expanded={ui.showSummary}
    >
      <span class="progress-label">VOTOS:</span>
      <span class="progress-fraction" aria-hidden="true">{vote.count}/{vote.total}</span>
      <span class="progress-pips" aria-hidden="true">
        {#each Array(vote.total) as _, i}
          <span class="pip" class:filled={i < vote.count}></span>
        {/each}
      </span>
    </button>
  </div>
</header>

<style>
  /* ─── Official Document Header ─────────────────────────────────────────────── */
  .ballot-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    height: var(--bar-height, 48px);
    background: var(--paper-white);
    border-bottom: 1px solid var(--grid-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    padding-top: env(safe-area-inset-top, 0px);
    pointer-events: auto;
  }

  /* ─── Branding Section ─────────────────────────────────────────────────────── */
  .header-branding {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .peru-seal {
    font-size: 22px;
    line-height: 1;
  }

  .header-titles {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .header-title {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--text-primary);
    line-height: 1.1;
  }

  .header-subtitle {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    line-height: 1;
  }

  /* ─── Section Indicator ─────────────────────────────────────────────────────── */
  .header-section {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: var(--sky-blue);
    border: 1px solid var(--sky-blue-dark);
    border-radius: 2px;
  }

  .section-label {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--sky-text);
  }

  .section-name {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--text-primary);
    text-transform: uppercase;
  }

  /* ─── Progress Indicator ────────────────────────────────────────────────────── */
  .header-progress {
    display: flex;
    align-items: center;
  }

  .progress-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--paper-cream);
    border: 1px solid var(--grid-border-light);
    border-radius: 2px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .progress-btn:hover,
  .progress-btn:focus-visible {
    background: var(--paper-offwhite);
    border-color: var(--grid-border);
  }

  .progress-btn.complete {
    background: var(--accent-light);
    border-color: var(--accent);
  }

  .progress-label {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .progress-fraction {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.01em;
  }

  .progress-pips {
    display: flex;
    gap: 3px;
  }

  .pip {
    width: 5px;
    height: 5px;
    border: 1px solid var(--grid-border);
    background: transparent;
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .pip.filled {
    background: var(--accent);
    border-color: var(--accent);
  }
</style>
