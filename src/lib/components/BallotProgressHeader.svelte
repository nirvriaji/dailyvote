<script lang="ts">
  import {
    isColumnValid,
    getValidColumnCount,
    isBallotReady,
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';

  interface Props {
    activeIdx?: number;
    onOpenSummary?: () => void;
  }
  let { activeIdx: activeIdxProp = undefined, onOpenSummary }: Props = $props();

  const STEPS: { key: ColumnKey; label: string }[] = [
    { key: 'presidente',      label: 'Presidencia' },
    { key: 'senadoNacional',  label: 'Senado nacional' },
    { key: 'senadoRegional',  label: 'Senado regional' },
    { key: 'diputados',       label: 'Diputados' },
    { key: 'parlamentoAndino',label: 'Parlamento Andino' },
  ];

  let validCount    = $derived(getValidColumnCount());
  let isReady       = $derived(isBallotReady());
  let activeIdx     = $derived(
    activeIdxProp !== undefined
      ? activeIdxProp
      : (() => {
          const i = STEPS.findIndex(s => !isColumnValid(s.key));
          return i === -1 ? STEPS.length - 1 : i;
        })()
  );
</script>

<header class="sim-header" class:all-done={isReady}>
  <!-- Top row -->
  <div class="header-top">
    <div class="header-info">
      <span class="header-eyebrow">Estás simulando tu voto real</span>
      <span class="header-step-label">
        {#if isReady}
          Tu cédula está completa
        {:else}
          Paso {activeIdx + 1} de 5 — {STEPS[activeIdx].label}
        {/if}
      </span>
    </div>
    <div class="header-actions">
      <div class="header-tally">
        <span class="header-counter" aria-label="{validCount} de 5 secciones completas">
          {validCount}<span class="counter-total">/5</span>
        </span>
        <span
          class="status-badge"
          class:sb-complete={isReady}
          class:sb-partial={validCount > 0 && !isReady}
          class:sb-blank={validCount === 0}
        >
          {isReady ? 'Cédula completa' : validCount > 0 ? 'Cédula parcial' : 'Cédula en blanco'}
        </span>
      </div>
      <button class="summary-btn" onclick={onOpenSummary}>
        Ver resumen
      </button>
    </div>
  </div>

  <!-- Stepper -->
  <nav class="stepper" aria-label="Progreso de votación">
    {#each STEPS as step, i}
      {@const completed = isColumnValid(step.key)}
      {@const active    = i === activeIdx && !completed}
      <div
        class="stepper-item"
        class:is-completed={completed}
        class:is-active={active}
        class:is-pending={!completed && !active}
        role="listitem"
        aria-current={active ? 'step' : undefined}
        aria-label="{step.label}: {completed ? 'completo' : active ? 'en progreso' : 'pendiente'}"
      >
        <div class="step-dot" aria-hidden="true">
          {#if completed}
            <!-- Check icon -->
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4.5L3.5 7L8 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          {:else}
            {i + 1}
          {/if}
        </div>
        <span class="step-label">{step.label}</span>
      </div>
    {/each}
  </nav>
</header>

<style>
  .sim-header {
    background: #0f172a;
    border-bottom: 1px solid #1e293b;
    padding: 10px 16px 0;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
    transition: background 0.3s ease;
  }

  .sim-header.all-done {
    background: #0a1a0a;
    border-bottom-color: rgba(34, 197, 94, 0.3);
  }

  /* Top row */
  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .header-eyebrow {
    font-size: 11px;
    font-weight: 500;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
  }

  .header-step-label {
    font-size: 14px;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-counter {
    font-size: 22px;
    font-weight: 800;
    color: white;
    line-height: 1;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .counter-total {
    font-size: 13px;
    font-weight: 500;
    color: #475569;
  }

  /* Stepper */
  .stepper {
    display: flex;
    gap: 0;
    margin: 0 -16px; /* bleed to edges */
    padding: 0 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .stepper::-webkit-scrollbar {
    display: none;
  }

  .stepper-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 2px solid transparent;
    white-space: nowrap;
    cursor: default;
    transition: border-color 0.25s ease, opacity 0.25s ease;
    flex-shrink: 0;
  }

  .stepper-item.is-active {
    border-bottom-color: #C8102E;
  }

  .stepper-item.is-completed {
    border-bottom-color: #22c55e;
  }

  .stepper-item.is-pending {
    opacity: 1;
  }

  /* Step dot */
  .step-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 800;
    flex-shrink: 0;
    transition: background 0.25s ease, color 0.25s ease;
  }

  .is-pending .step-dot {
    background: #1e293b;
    color: #94a3b8;
    border: 1px solid #475569;
  }

  .is-active .step-dot {
    background: #C8102E;
    color: white;
    border: none;
  }

  .is-completed .step-dot {
    background: #22c55e;
    color: white;
    border: none;
  }

  /* Step label */
  .step-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    transition: color 0.25s ease;
  }

  .is-pending .step-label  { color: #94a3b8; }
  .is-active .step-label   { color: #e2e8f0; }
  .is-completed .step-label { color: #4ade80; }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .header-tally {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .status-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 10px;
    white-space: nowrap;
  }

  .sb-complete { background: rgba(34,197,94,0.15);   color: #4ade80; }
  .sb-partial  { background: rgba(245,158,11,0.15); color: #fbbf24; }
  .sb-blank    { background: rgba(100,116,139,0.15); color: #94a3b8; }

  .summary-btn {
    padding: 6px 12px;
    border: 1px solid #334155;
    border-radius: 6px;
    background: transparent;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    font-family: inherit;
  }

  .summary-btn:hover {
    border-color: #475569;
    color: #e2e8f0;
    background: rgba(255,255,255,0.04);
  }

  @media (max-width: 768px) {
    .summary-btn {
      padding: 5px 10px;
      font-size: 10px;
    }
  }

  /* Mobile */
  @media (max-width: 768px) {
    .sim-header {
      padding: 8px 12px 0;
    }

    .header-top {
      margin-bottom: 8px;
    }

    .header-eyebrow {
      font-size: 10px;
    }

    .header-step-label {
      font-size: 13px;
    }

    .header-counter {
      font-size: 18px;
    }

    .stepper-item {
      padding: 6px 10px;
    }

    .step-dot {
      width: 18px;
      height: 18px;
      font-size: 9px;
    }

    .step-label {
      font-size: 11px;
    }
  }
</style>
