<script lang="ts">
  import {
    isColumnValid,
    getValidColumnCount,
    getColumnPreferenceNumbers,
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { fade } from 'svelte/transition';

  interface Props {
    activeIdx?: number;
    onNextStep?: () => void;
    onDeliver?: () => void;
    onCollapse?: () => void;
    /** 'peek' = step context only (no help/video) */
    panelMode?: 'peek' | 'full';
    /** false = hide CTA buttons (used when parent renders them externally) */
    showCta?: boolean;
  }
  let {
    activeIdx: activeIdxProp = undefined,
    onNextStep,
    onDeliver,
    onCollapse,
    panelMode = 'full',
    showCta = true,
  }: Props = $props();

  type StepConfig = {
    key: ColumnKey;
    colId: string;
    title: string;
    briefEducation: string;
    education: string;
    hasPreferential: boolean;
  };

  const STEPS: StepConfig[] = [
    {
      key: 'presidente',
      colId: 'col0',
      title: 'Presidencia',
      briefEducation: 'Aquí eliges una sola opción para presidente y vicepresidentes.',
      education: 'Este voto impacta directamente en la elección presidencial.',
      hasPreferential: false,
    },
    {
      key: 'senadoNacional',
      colId: 'col1',
      title: 'Senado nacional',
      briefEducation: 'Elige un partido. Si quieres, también puedes marcar hasta 2 números preferenciales.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
    },
    {
      key: 'senadoRegional',
      colId: 'col2',
      title: 'Senado regional',
      briefEducation: 'Elige un partido. Si quieres, también puedes marcar un número preferencial.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
    },
    {
      key: 'diputados',
      colId: 'col3',
      title: 'Diputados',
      briefEducation: 'Elige un partido. Si quieres, también puedes marcar hasta 2 números preferenciales.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
    },
    {
      key: 'parlamentoAndino',
      colId: 'col4',
      title: 'Parlamento Andino',
      briefEducation: 'Elige un partido. Si quieres, también puedes marcar hasta 2 números preferenciales.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
    },
  ];

  let validCount    = $derived(getValidColumnCount());
  let ballotStatus  = $derived<'blank' | 'partial' | 'complete'>(
    validCount === 5 ? 'complete' : validCount === 0 ? 'blank' : 'partial'
  );

  let activeIdx = $derived(
    activeIdxProp !== undefined
      ? activeIdxProp
      : (() => {
          const i = STEPS.findIndex(s => !isColumnValid(s.key));
          return i === -1 ? STEPS.length - 1 : i;
        })()
  );

  let currentStep    = $derived(STEPS[activeIdx]);
  let currentVote    = $derived(vote.getVote(currentStep.colId));
  let preferenceNums = $derived(getColumnPreferenceNumbers(currentStep.key));

  let ctaLabel = $derived(
    !currentVote
      ? 'Continuar sin elegir'
      : currentStep.hasPreferential && preferenceNums.length === 0
        ? 'Continuar sin números preferenciales'
        : 'Continuar'
  );
</script>

<div class="panel">

  {#key activeIdx}
    <div class="step-body" out:fade={{ duration: 120 }} in:fade={{ duration: 200, delay: 130 }}>

      <!-- Step header -->
      <div class="step-header">
        <div class="step-eyebrow-row">
          <span class="step-eyebrow">Paso {activeIdx + 1} de 5</span>
          {#if onCollapse}
            <button class="collapse-btn" onclick={onCollapse} type="button" aria-label="Cerrar panel">›</button>
          {/if}
        </div>
        <h3 class="step-title">{currentStep.title}</h3>
      </div>

      <!-- Education brief — 1 line, always visible -->
      <p class="education-brief">{currentStep.briefEducation}</p>

      <!-- Local state -->
      <div class="local-state" class:has-vote={!!currentVote}>
        {#if !currentVote}
          <span class="state-empty">Aún no has marcado una opción.</span>
        {:else}
          <div class="state-filled">
            <span class="state-label">Has elegido</span>
            <span class="state-party">{currentVote.partyName}</span>
            {#if preferenceNums.length > 0}
              <span class="state-prefs">Números: {preferenceNums.join(' y ')}</span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Education block -->
      <div class="ctx-education">
        <p>{currentStep.education}</p>
      </div>

      <!-- Single primary CTA -->
      {#if showCta}
        {#if ballotStatus !== 'complete' && onNextStep}
          <button class="primary-cta" onclick={onNextStep}>
            {ctaLabel}
          </button>
        {:else if ballotStatus === 'complete'}
          <button class="deliver-cta" onclick={onDeliver}>
            <span class="deliver-icon" aria-hidden="true">✓</span>
            <span class="deliver-text">
              <span class="deliver-title">Cédula completa</span>
              <span class="deliver-sub">Toca aquí para entregar y ver resultados</span>
            </span>
            <span class="deliver-arrow" aria-hidden="true">→</span>
          </button>
        {/if}
      {/if}

    </div>
  {/key}


</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #ffffff;
    border-left: 1px solid #e2e8f0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;
  }

  .panel::-webkit-scrollbar {
    width: 0;
    display: none;
  }

  /* ── Step body ───────────────────────────────────────────────────────────── */
  .step-body {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
  }

  .step-header {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .step-eyebrow-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .step-eyebrow {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
  }

  .step-title {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .collapse-btn {
    font-size: 40px;
    font-weight: 300;
    color: #3b82f6;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transform: rotate(90deg);
    line-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .collapse-btn:active {
    color: #2563eb;
  }

  /* ── Education brief ─────────────────────────────────────────────────────── */
  .education-brief {
    font-size: 13px;
    color: #475569;
    line-height: 1.55;
    margin: 0;
    padding: 10px 12px;
    background: rgba(200,16,46,0.05);
    border-left: 3px solid rgba(200,16,46,0.5);
    border-radius: 0 6px 6px 0;
  }

  /* ── Local state ─────────────────────────────────────────────────────────── */
  .local-state {
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    min-height: 52px;
    display: flex;
    align-items: center;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .local-state.has-vote {
    border-color: rgba(22,163,74,0.3);
    background: rgba(22,163,74,0.04);
  }

  .state-empty { font-size: 13px; color: #94a3b8; font-style: italic; }

  .state-filled { display: flex; flex-direction: column; gap: 3px; }

  .state-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #16a34a;
  }

  .state-party { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.3; }
  .state-prefs { font-size: 12px; color: #64748b; }

  /* ── Education block ─────────────────────────────────────────────────────── */
  .ctx-education {
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 8px;
    border-left: 3px solid #C8102E;
  }

  .ctx-education p {
    font-size: 12px;
    color: #475569;
    line-height: 1.6;
    margin: 0;
  }

  /* ── Primary CTA ─────────────────────────────────────────────────────────── */
  .primary-cta {
    width: 100%;
    padding: 13px 16px;
    border: none;
    border-radius: 8px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s ease, color 0.15s ease;
    font-family: inherit;
    letter-spacing: 0.01em;
    line-height: 1.4;
  }

  .primary-cta:hover { background: #dbeafe; color: #1e40af; }

  /* ── Deliver CTA ─────────────────────────────────────────────────────────── */
  .deliver-cta {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 14px;
    border: 1px solid rgba(21,128,61,0.3);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(22,163,74,0.08) 0%, rgba(21,128,61,0.12) 100%);
    color: #15803d;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  }

  .deliver-cta:hover {
    background: linear-gradient(135deg, rgba(22,163,74,0.13) 0%, rgba(21,128,61,0.18) 100%);
    border-color: rgba(21,128,61,0.45);
    transform: translateY(-1px);
  }

  .deliver-cta:active {
    transform: translateY(0);
  }

  .deliver-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(21,128,61,0.1);
    border: 1px solid rgba(21,128,61,0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .deliver-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    min-width: 0;
  }

  .deliver-title {
    font-size: 13px;
    font-weight: 700;
    color: #15803d;
    line-height: 1.2;
  }

  .deliver-sub {
    font-size: 11px;
    color: rgba(21,128,61,0.7);
    line-height: 1.3;
  }

  .deliver-arrow {
    font-size: 16px;
    color: rgba(21,128,61,0.5);
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .deliver-cta:hover .deliver-arrow {
    transform: translateX(3px);
    color: rgba(21,128,61,0.8);
  }

  /* ── Desktop: full height + larger text ──────────────────────────────── */
  @media (min-width: 901px) {
    .step-body {
      padding: 28px 24px;
      gap: 22px;
    }

    .step-eyebrow { font-size: 12px; color: #64748b; }

    .step-title { font-size: 28px; }

    .education-brief {
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
    }

    .local-state {
      padding: 14px 18px;
      min-height: 64px;
    }

    .state-empty   { font-size: 15px; color: #64748b; }
    .state-label   { font-size: 11px; }
    .state-party   { font-size: 17px; }
    .state-prefs   { font-size: 14px; color: #475569; }

    .ctx-education { padding: 12px 16px; }
    .ctx-education p { font-size: 14px; color: #334155; }

    /* Push CTA to bottom of the flex column */
    .primary-cta,
    .deliver-cta { margin-top: auto; font-size: 15px; padding: 15px 18px; }

    .deliver-icon { width: 32px; height: 32px; font-size: 15px; }
    .deliver-title { font-size: 15px; }
    .deliver-sub   { font-size: 13px; }
  }

</style>
