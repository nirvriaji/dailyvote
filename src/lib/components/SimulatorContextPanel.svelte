<script lang="ts">
  import {
    isColumnValid,
    getValidColumnCount,
    getColumnPreferenceNumbers,
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { fade, fly } from 'svelte/transition';

  interface Props {
    showVideo?: boolean;
    onToggleVideo?: () => void;
    activeIdx?: number;
    onNextStep?: () => void;
    onDeliver?: () => void;
    /** 'peek' = step context only (no help/video) */
    panelMode?: 'peek' | 'full';
  }
  let {
    showVideo = false,
    onToggleVideo,
    activeIdx: activeIdxProp = undefined,
    onNextStep,
    onDeliver,
    panelMode = 'full',
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
    <div class="step-body" transition:fade={{ duration: 180 }}>

      <!-- Step header -->
      <div class="step-header">
        <span class="step-eyebrow">Paso {activeIdx + 1} de 5</span>
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

    </div>
  {/key}

  <!-- Help section — only in full mode -->
  {#if panelMode !== 'peek'}
    <div class="help-section">
      <button class="help-toggle" onclick={onToggleVideo} aria-expanded={showVideo}>
        <span class="help-icon" aria-hidden="true">?</span>
        <span class="help-text">¿Cómo funciona el voto preferencial?</span>
        <span class="help-chevron" class:rotated={showVideo} aria-hidden="true">›</span>
      </button>
      {#if showVideo}
        <div class="pref-explainer" transition:fly={{ y: -8, duration: 220 }}>
          <p class="pref-item">
            <span class="pref-label">¿Qué es?</span>
            Después de elegir partido, puedes indicar qué candidatos específicos del partido prefieres que entren al congreso.
          </p>
          <p class="pref-item">
            <span class="pref-label">¿Siempre cuenta?</span>
            Solo si tu partido supera la valla electoral. Si no la pasa, ninguno de sus candidatos entra, independientemente del número que marcaste.
          </p>
          <p class="pref-item">
            <span class="pref-label">¿Es obligatorio?</span>
            No. Puedes votar solo por partido y dejar el número en blanco.
          </p>
        </div>
      {/if}
    </div>
  {/if}

</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #0f172a;
    border-left: 1px solid #1e293b;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
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

  .step-eyebrow {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #475569;
  }

  .step-title {
    font-size: 22px;
    font-weight: 800;
    color: white;
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  /* ── Education brief ─────────────────────────────────────────────────────── */
  .education-brief {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.55;
    margin: 0;
    padding: 10px 12px;
    background: rgba(200,16,46,0.07);
    border-left: 3px solid rgba(200,16,46,0.6);
    border-radius: 0 6px 6px 0;
  }

  /* ── Local state ─────────────────────────────────────────────────────────── */
  .local-state {
    padding: 12px 14px;
    background: rgba(255,255,255,0.03);
    border: 1px solid #1e293b;
    border-radius: 8px;
    min-height: 52px;
    display: flex;
    align-items: center;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .local-state.has-vote {
    border-color: rgba(34,197,94,0.3);
    background: rgba(34,197,94,0.05);
  }

  .state-empty { font-size: 13px; color: #475569; font-style: italic; }

  .state-filled { display: flex; flex-direction: column; gap: 3px; }

  .state-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #4ade80;
  }

  .state-party { font-size: 14px; font-weight: 700; color: #e2e8f0; line-height: 1.3; }
  .state-prefs { font-size: 12px; color: #94a3b8; }

  /* ── Education block ─────────────────────────────────────────────────────── */
  .ctx-education {
    padding: 10px 12px;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    border-left: 3px solid #C8102E;
  }

  .ctx-education p {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.6;
    margin: 0;
  }

  /* ── Primary CTA ─────────────────────────────────────────────────────────── */
  .primary-cta {
    width: 100%;
    padding: 13px 16px;
    border: none;
    border-radius: 8px;
    background: #1e3a5f;
    color: #60a5fa;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s ease, color 0.15s ease;
    font-family: inherit;
    letter-spacing: 0.01em;
    line-height: 1.4;
  }

  .primary-cta:hover { background: #1e4080; color: #93c5fd; }

  /* ── Deliver CTA ─────────────────────────────────────────────────────────── */
  .deliver-cta {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 14px;
    border: 1px solid rgba(34,197,94,0.35);
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(21,128,61,0.18) 100%);
    color: #4ade80;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.12s ease;
  }

  .deliver-cta:hover {
    background: linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(21,128,61,0.26) 100%);
    border-color: rgba(34,197,94,0.55);
    transform: translateY(-1px);
  }

  .deliver-cta:active {
    transform: translateY(0);
  }

  .deliver-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(34,197,94,0.18);
    border: 1px solid rgba(34,197,94,0.35);
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
    color: #4ade80;
    line-height: 1.2;
  }

  .deliver-sub {
    font-size: 11px;
    color: rgba(74,222,128,0.7);
    line-height: 1.3;
  }

  .deliver-arrow {
    font-size: 16px;
    color: rgba(74,222,128,0.5);
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }

  .deliver-cta:hover .deliver-arrow {
    transform: translateX(3px);
    color: rgba(74,222,128,0.8);
  }

  /* ── Help section ────────────────────────────────────────────────────────── */
  .help-section {
    border-top: 1px solid #1e293b;
    margin-top: auto;
  }

  .help-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: #475569;
    transition: color 0.15s ease, background 0.15s ease;
    font-family: inherit;
  }

  .help-toggle:hover { background: rgba(255,255,255,0.03); color: #64748b; }

  .help-icon {
    width: 18px;
    height: 18px;
    border: 1px solid #334155;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    font-style: normal;
    flex-shrink: 0;
  }

  .help-text { flex: 1; font-size: 12px; font-weight: 500; line-height: 1.4; }

  .help-chevron {
    font-size: 18px;
    font-weight: 300;
    color: #334155;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .help-chevron.rotated { transform: rotate(90deg); }

  .pref-explainer {
    padding: 0 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pref-item {
    font-size: 12px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  .pref-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #475569;
    margin-bottom: 2px;
  }
</style>
