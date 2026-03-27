<script lang="ts">
  import { ui } from '$lib/stores/ui.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { nav } from '$lib/stores/navigation.svelte';
  import VoteMark from './VoteMark.svelte';

  const COLUMN_TITLES = [
    'Presidente y Vicepresidentes',
    'Senadores Nacionales',
    'Senadores Regionales',
    'Diputados',
    'Parlamento Andino',
  ];
  const COLUMN_IDS = ['col0', 'col1', 'col2', 'col3', 'col4'];

  function jumpTo(colIndex: number) {
    nav.goTo(colIndex);
    ui.closeSummary();
  }

  function removeVote(columnId: string) {
    vote.remove(columnId);
  }
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" onclick={() => ui.closeSummary()} aria-hidden="true"></div>

<!-- Panel -->
<aside class="panel" aria-label="Resumen de votos">
  <div class="panel-head">
    <h2 class="panel-title">Tu simulación</h2>
    <button class="close-btn" onclick={() => ui.closeSummary()} aria-label="Cerrar resumen">✕</button>
  </div>

  <p class="panel-sub">
    {vote.count} de {vote.total} cargos seleccionados
  </p>

  <ul class="vote-list">
    {#each COLUMN_IDS as colId, i}
      {@const sel = vote.getVote(colId)}
      <li class="vote-item" class:pending={!sel}>
        <button
          class="vote-row"
          onclick={() => jumpTo(i)}
          aria-label="Ir a {COLUMN_TITLES[i]}"
        >
          <div class="vote-col-name">
            <span class="col-index">{i + 1}</span>
            <span class="col-title">{COLUMN_TITLES[i]}</span>
          </div>

          {#if sel}
            <div class="vote-result">
              <span class="result-party">{sel.partyName}</span>
              <span class="result-zone">{sel.zoneLabel}</span>
            </div>
            <VoteMark type={sel.zoneType} size={28} animate={false} />
          {:else}
            <span class="pending-label">Sin votar</span>
            <span class="pending-arrow" aria-hidden="true">→</span>
          {/if}
        </button>

        {#if sel}
          <button
            class="remove-btn"
            onclick={(e) => { e.stopPropagation(); removeVote(colId); }}
            aria-label="Quitar voto en {COLUMN_TITLES[i]}"
          >
            Quitar
          </button>
        {/if}
      </li>
    {/each}
  </ul>

  <div class="panel-footer">
    <button
      class="reset-btn"
      onclick={() => { vote.reset(); ui.closeSummary(); }}
    >
      Reiniciar simulación
    </button>
  </div>
</aside>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 90;
    animation: fade 0.18s ease;
  }

  @keyframes fade { from { opacity: 0 } to { opacity: 1 } }

  .panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 91;
    width: min(360px, 100vw);
    background: var(--paper-white);
    border-left: 1px solid var(--grid-border);
    box-shadow: -4px 0 24px rgba(0,0,0,0.12);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slide-in 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  }

  @keyframes slide-in {
    from { transform: translateX(100%) }
    to   { transform: translateX(0) }
  }

  /* ─── Head ─────────────────────────────────────────────────────────────────── */
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 8px;
    padding-top: max(env(safe-area-inset-top, 0px), 16px);
    border-bottom: 1px solid var(--grid-border);
    background: var(--sky-blue);
  }

  .panel-title {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: var(--sky-text);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .close-btn {
    background: var(--paper-white);
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px 10px;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, border-color 0.15s;
  }

  .close-btn:hover {
    background: var(--paper-cream);
    border-color: var(--grid-border-light);
  }

  .panel-sub {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 11px;
    color: var(--text-muted);
    margin: 8px 16px 4px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* ─── Vote list ────────────────────────────────────────────────────────────── */
  .vote-list {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
    overflow-y: auto;
  }

  .vote-item {
    border-bottom: 1px solid var(--grid-border-light);
  }

  .vote-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
    -webkit-tap-highlight-color: transparent;
  }

  .vote-row:active {
    background: var(--sky-blue-light);
  }

  .vote-col-name {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .col-index {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: var(--sky-text);
    flex-shrink: 0;
    background: var(--sky-blue);
    width: 18px;
    height: 18px;
    border-radius: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .col-title {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
    flex: 1;
    min-width: 0;
    text-transform: uppercase;
  }

  .vote-result {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    flex-shrink: 0;
    max-width: 120px;
  }

  .result-party {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: right;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .result-zone {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 9px;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .pending-label {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 10px;
    color: var(--text-muted);
    flex-shrink: 0;
    text-transform: uppercase;
  }

  .pending-arrow {
    font-size: 14px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .remove-btn {
    display: block;
    width: 100%;
    padding: 4px 14px 8px;
    background: none;
    border: none;
    color: var(--accent);
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 10px;
    font-weight: 600;
    text-align: right;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s;
  }

  .remove-btn:hover {
    background: var(--accent-light);
  }

  /* ─── Footer ───────────────────────────────────────────────────────────────── */
  .panel-footer {
    padding: 12px 14px;
    padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px);
    border-top: 1px solid var(--grid-border);
    background: var(--paper-cream);
  }

  .reset-btn {
    width: 100%;
    padding: 12px;
    background: var(--paper-white);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 2px;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .reset-btn:hover {
    background: var(--accent);
    color: white;
  }
</style>
