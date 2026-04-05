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
    /** 'peek' = step context only (no help/video) */
    panelMode?: 'peek' | 'full';
  }
  let {
    showVideo = false,
    onToggleVideo,
    activeIdx: activeIdxProp = undefined,
    onNextStep,
    panelMode = 'full',
  }: Props = $props();

  type StepConfig = {
    key: ColumnKey;
    colId: string;
    title: string;
    briefEducation: string;
    hasPreferential: boolean;
  };

  const STEPS: StepConfig[] = [
    {
      key: 'presidente',
      colId: 'col0',
      title: 'Presidencia',
      briefEducation: 'Elige una sola fórmula presidencial. Un voto, una decisión.',
      hasPreferential: false,
    },
    {
      key: 'senadoNacional',
      colId: 'col1',
      title: 'Senado nacional',
      briefEducation: 'Primero elige partido. El voto preferencial decide qué candidatos entran.',
      hasPreferential: true,
    },
    {
      key: 'senadoRegional',
      colId: 'col2',
      title: 'Senado regional',
      briefEducation: 'Primero elige partido. El voto preferencial decide qué candidatos entran.',
      hasPreferential: true,
    },
    {
      key: 'diputados',
      colId: 'col3',
      title: 'Diputados',
      briefEducation: 'Tu voto es primero por partido. Luego influyes en qué candidatos entran.',
      hasPreferential: true,
    },
    {
      key: 'parlamentoAndino',
      colId: 'col4',
      title: 'Parlamento Andino',
      briefEducation: 'Primero elige partido. El voto preferencial decide qué candidatos entran.',
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
          <span class="state-empty">No has marcado una opción.</span>
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

      <!-- Single primary CTA -->
      {#if ballotStatus !== 'complete' && onNextStep}
        <button class="primary-cta" onclick={onNextStep}>
          {ctaLabel}
        </button>
      {:else if ballotStatus === 'complete'}
        <p class="complete-hint">Cédula completa — abre el resumen desde la cabecera para entregar.</p>
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
        <div class="video-body" transition:fly={{ y: -8, duration: 220 }}>
          <p class="video-desc">Aprende a recorrer la cédula, marcar correctamente y evitar errores comunes.</p>
          <div class="video-frame">
            <video class="video-player" autoplay muted loop playsinline preload="auto">
              <source src="/videos/demo.mp4" type="video/mp4" />
            </video>
          </div>
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

  /* ── Complete hint ───────────────────────────────────────────────────────── */
  .complete-hint {
    font-size: 12px;
    color: #4ade80;
    line-height: 1.55;
    margin: 0;
    padding: 10px 12px;
    background: rgba(34,197,94,0.05);
    border: 1px solid rgba(34,197,94,0.2);
    border-radius: 8px;
    text-align: center;
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

  .video-body { padding: 0 16px 12px; }

  .video-desc { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 10px; }

  .video-frame {
    background: #1a1a1a;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #334155;
  }

  .video-player { width: 100%; height: auto; display: block; max-height: 280px; background: #000; }
</style>
