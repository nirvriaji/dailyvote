<script lang="ts">
  import { nav } from '$lib/stores/navigation.svelte';
  import { ui } from '$lib/stores/ui.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import MiniMap from './MiniMap.svelte';

  const ZONE_LABEL: Record<string, string> = {
    top: 'Superior', middle: 'Media', bottom: 'Inferior',
  };
</script>

<header class="context-bar">
  <!-- Left: minimap pills -->
  <div class="bar-left">
    <MiniMap />
  </div>

  <!-- Center: section name + zone -->
  <div class="bar-center">
    <p class="section-name">{nav.title}</p>
    <p class="zone-name">Zona {ZONE_LABEL[nav.zone]}</p>
  </div>

  <!-- Right: progress badge -->
  <div class="bar-right">
    <button
      class="progress-btn"
      class:complete={vote.count === vote.total}
      onclick={() => ui.toggleSummary()}
      aria-label="{vote.count} de {vote.total} votos. {ui.showSummary ? 'Cerrar' : 'Ver'} resumen"
      aria-expanded={ui.showSummary}
    >
      <span class="fraction" aria-hidden="true">{vote.count}/{vote.total}</span>
      <span class="pips" aria-hidden="true">
        {#each Array(vote.total) as _, i}
          <span class="pip" class:filled={i < vote.count}></span>
        {/each}
      </span>
    </button>
  </div>
</header>

<style>
  /* ─── Glassmorphism HUD ───────────────────────────────────────────────────── */
  .context-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    height: var(--bar-height, 52px);
    background: var(--hud-bg);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border-bottom: 1px solid var(--hud-border);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    padding-top: env(safe-area-inset-top, 0px);
    pointer-events: auto;
  }

  /* ─── Sections ─────────────────────────────────────────────────────────────── */
  .bar-left { flex-shrink: 0; }

  .bar-center {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 0 6px;
  }

  .bar-right {
    flex-shrink: 0;
    margin-left: auto;
  }

  /* ─── Section name ─────────────────────────────────────────────────────────── */
  .section-name {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    line-height: 1.3;
  }

  .zone-name {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.38);
    line-height: 1;
    letter-spacing: 0.04em;
  }

  /* ─── Progress button ──────────────────────────────────────────────────────── */
  .progress-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 5px 9px 4px;
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    color: white;
    transition: background 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .progress-btn:hover,
  .progress-btn:focus-visible {
    background: rgba(255, 255, 255, 0.13);
    outline: none;
  }

  .progress-btn.complete {
    border-color: var(--accent-light);
    background: rgba(200, 16, 46, 0.15);
  }

  .fraction {
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .pips {
    display: flex;
    gap: 3px;
  }

  .pip {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: background 0.22s ease;
  }

  .pip.filled {
    background: var(--accent);
  }
</style>
