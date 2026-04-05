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
    onDeliver: () => void;
    isSubmitting?: boolean;
    showVideo?: boolean;
    onToggleVideo?: () => void;
    activeIdx?: number;
    onNextStep?: () => void;
    /** 'peek' = step context only (no video, no delivery CTA) */
    panelMode?: 'peek' | 'full';
  }
  let {
    onDeliver,
    isSubmitting = false,
    showVideo = false,
    onToggleVideo,
    activeIdx: activeIdxProp = undefined,
    onNextStep,
    panelMode = 'full',
  }: Props = $props();

  // ─── Step config ─────────────────────────────────────────────────────────────
  type StepConfig = {
    key: ColumnKey;
    colId: string;
    title: string;
    instruction: string;
    education: string;
    hasPreferential: boolean;
    maxPreferences?: number;
  };

  const STEPS: StepConfig[] = [
    {
      key: 'presidente',
      colId: 'col0',
      title: 'Presidencia',
      instruction: 'Aquí eliges una sola opción para presidente y vicepresidentes.',
      education: 'Este voto impacta directamente en la elección presidencial.',
      hasPreferential: false,
    },
    {
      key: 'senadoNacional',
      colId: 'col1',
      title: 'Senado nacional',
      instruction: 'Elige un partido. Si quieres, también puedes marcar hasta 2 números preferenciales.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
      maxPreferences: 2,
    },
    {
      key: 'senadoRegional',
      colId: 'col2',
      title: 'Senado regional',
      instruction: 'Elige un partido. Si quieres, también puedes marcar hasta 2 números preferenciales.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
      maxPreferences: 2,
    },
    {
      key: 'diputados',
      colId: 'col3',
      title: 'Diputados',
      instruction: 'Elige un partido. Si quieres, también puedes marcar hasta 2 números preferenciales.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
      maxPreferences: 2,
    },
    {
      key: 'parlamentoAndino',
      colId: 'col4',
      title: 'Parlamento Andino',
      instruction: 'Elige un partido. Si quieres, también puedes marcar hasta 2 números preferenciales.',
      education: 'Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.',
      hasPreferential: true,
      maxPreferences: 2,
    },
  ];

  // ─── Reactive state ───────────────────────────────────────────────────────────
  let validCount = $derived(getValidColumnCount());

  type BallotStatus = 'blank' | 'partial' | 'complete';
  let ballotStatus = $derived<BallotStatus>(
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

  let currentStep = $derived(STEPS[activeIdx]);
  let currentVote = $derived(vote.getVote(currentStep.colId));

  // Preference numbers for current step — read directly from preferencePicker store
  let preferenceNums = $derived(getColumnPreferenceNumbers(currentStep.key));

  // Is the current step done?
  let currentStepDone = $derived(isColumnValid(currentStep.key));

  // Derived strings to avoid {#if} inside <p> tags (causes hydration HierarchyRequestError)
  let bsbTitle = $derived(
    ballotStatus === 'complete' ? 'Tu cédula está completa.' :
    ballotStatus === 'partial'  ? 'Tu cédula está parcial.' :
                                  'Tu cédula está en blanco.'
  );
  let bsbDesc = $derived(
    ballotStatus === 'complete'
      ? 'Has marcado las 5 decisiones de esta cédula. Ahora puedes ver cómo se procesa todo tu voto.'
      : ballotStatus === 'partial'
        ? `Has marcado ${validCount} de 5 decisiones. Si la entregas así, solo se tomarán en cuenta las elecciones que sí marcaste.`
        : 'Si la entregas así, no habrás marcado ninguna de las elecciones de esta cédula.'
  );
</script>

<div class="panel">

  <!-- ── Video help ─────────────────────────────────────────────────────────── -->
  {#if panelMode !== 'peek'}
  <div class="video-help">
    <button class="video-toggle" onclick={onToggleVideo} aria-expanded={showVideo}>
      <span class="video-toggle-icon" aria-hidden="true">▶</span>
      <span class="video-toggle-text">Mira cómo marcar la cédula en menos de 30 segundos</span>
      <span class="video-chevron" class:rotated={showVideo} aria-hidden="true">›</span>
    </button>

    {#if showVideo}
      <div class="video-body" transition:fly={{ y: -8, duration: 220 }}>
        <p class="video-desc">Aprende a recorrer la cédula, marcar correctamente y evitar errores comunes antes de empezar.</p>
        <div class="video-frame">
          <video
            class="video-player"
            autoplay
            muted
            loop
            playsinline
            preload="auto"
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    {/if}
  </div>
  {/if}

  <!-- ── Persistent microcopy ──────────────────────────────────────────────── -->
  {#if panelMode !== 'peek'}
  <div class="microcopy">
    <span class="microcopy-icon" aria-hidden="true">ℹ</span>
    <p>Primero eliges un partido. Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido finalmente entran al congreso.</p>
  </div>
  {/if}

  <!-- ── Step context ───────────────────────────────────────────────────────── -->
  {#key activeIdx}
    <div class="step-context" transition:fade={{ duration: 200 }}>

      <!-- Block A: Step title -->
      <div class="ctx-header">
        <span class="ctx-step-label">Paso {activeIdx + 1} de 5</span>
        <h3 class="ctx-title">{currentStep.title}</h3>
      </div>

      <!-- Block B: Instruction -->
      <p class="ctx-instruction">{currentStep.instruction}</p>

      <!-- Block C: Selection summary -->
      <div class="ctx-summary" class:has-vote={!!currentVote}>
        {#if !currentVote}
          <span class="summary-empty">Aún no has marcado una opción.</span>
        {:else}
          <div class="summary-filled">
            <span class="summary-label">Has seleccionado:</span>
            <span class="summary-party">{currentVote.partyName}</span>
            {#if preferenceNums.length > 0}
              <span class="summary-prefs">
                Preferencial: {preferenceNums.join(' y ')}
              </span>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Block D: Educational explanation -->
      <div class="ctx-education">
        <p>{currentStep.education}</p>
      </div>

      <!-- Block E: Local action — advance or skip -->
      {#if onNextStep && ballotStatus !== 'complete'}
        {#if currentStepDone}
          <button class="local-action-btn" onclick={onNextStep}>
            {currentStep.hasPreferential && preferenceNums.length === 0
              ? 'Continuar sin voto preferencial'
              : 'Continuar'}
          </button>
        {:else}
          <button class="local-action-btn local-action-skip" onclick={onNextStep}>
            Dejar en blanco y continuar
          </button>
        {/if}
      {/if}

    </div>
  {/key}

  <!-- ── CTA area ───────────────────────────────────────────────────────────── -->
  {#if panelMode !== 'peek'}
  <div class="cta-area" class:state-complete={ballotStatus === 'complete'}>

    <!-- Estado global de la cédula -->
    <div class="ballot-state-block" class:bsb-complete={ballotStatus === 'complete'} class:bsb-partial={ballotStatus === 'partial'} class:bsb-blank={ballotStatus === 'blank'}>
      <p class="bsb-title">{bsbTitle}</p>
      <p class="bsb-desc">{bsbDesc}</p>

      <!-- Resumen por sección -->
      <div class="section-summary">
        <p class="summary-hd">Resumen de tu cédula</p>
        {#each STEPS as step}
          {@const marked = isColumnValid(step.key)}
          <div class="summary-row">
            <span class="summary-col-name">{step.title}</span>
            <span class="summary-col-status" class:s-marked={marked} class:s-blank={!marked}>
              {marked ? 'Marcado' : 'En blanco'}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Microcopy educativo -->
    <p class="deliver-microcopy">Puedes entregar la cédula aunque no hayas marcado todas las decisiones. El simulador te mostrará qué ocurre en cada caso.</p>

    <!-- CTA — siempre habilitado -->
    <button
      class="deliver-btn active"
      class:busy={isSubmitting}
      disabled={isSubmitting}
      onclick={onDeliver}
    >
      {#if isSubmitting}
        Procesando...
      {:else if ballotStatus === 'complete'}
        Entregar cédula y ver cómo se procesa mi voto
      {:else if ballotStatus === 'partial'}
        Entregar cédula parcial y ver qué pasa
      {:else}
        Entregar cédula en blanco y ver qué pasa
      {/if}
    </button>
  </div>
  {/if}

</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100%;
    background: #0f172a;
    border-left: 1px solid #1e293b;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
  }

  /* ── Video help ─────────────────────────────────────────────────────────── */
  .video-help {
    border-bottom: 1px solid #1e293b;
  }

  .video-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    color: #94a3b8;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .video-toggle:hover {
    background: rgba(255,255,255,0.04);
    color: #cbd5e1;
  }

  .video-toggle-icon {
    font-size: 9px;
    color: #C8102E;
    flex-shrink: 0;
  }

  .video-toggle-text {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
  }

  .video-chevron {
    font-size: 18px;
    font-weight: 300;
    color: #475569;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .video-chevron.rotated {
    transform: rotate(90deg);
  }

  .video-body {
    padding: 0 16px 12px;
  }

  .video-desc {
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    margin: 0 0 10px;
  }

  .video-frame {
    background: #1a1a1a;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #334155;
  }

  .video-player {
    width: 100%;
    height: auto;
    display: block;
    max-height: 300px;
    background: #000;
  }

  /* ── Microcopy ──────────────────────────────────────────────────────────── */
  .microcopy {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 12px 16px;
    background: rgba(200, 16, 46, 0.07);
    border-bottom: 1px solid rgba(200, 16, 46, 0.15);
  }

  .microcopy-icon {
    font-size: 12px;
    color: #C8102E;
    margin-top: 1px;
    flex-shrink: 0;
    font-style: normal;
  }

  .microcopy p {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.55;
    margin: 0;
  }

  /* ── Step context ────────────────────────────────────────────────────────── */
  .step-context {
    padding: 16px;
    border-bottom: 1px solid #1e293b;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ctx-header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ctx-step-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #475569;
  }

  .ctx-title {
    font-size: 18px;
    font-weight: 800;
    color: white;
    margin: 0;
    line-height: 1.2;
  }

  .ctx-instruction {
    font-size: 13px;
    color: #94a3b8;
    line-height: 1.55;
    margin: 0;
  }

  /* Summary */
  .ctx-summary {
    padding: 10px 12px;
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
    border: 1px solid #1e293b;
    min-height: 46px;
    display: flex;
    align-items: center;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .ctx-summary.has-vote {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.05);
  }

  .summary-empty {
    font-size: 12px;
    color: #475569;
    font-style: italic;
  }

  .summary-filled {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .summary-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #4ade80;
    font-weight: 600;
  }

  .summary-party {
    font-size: 13px;
    font-weight: 700;
    color: #e2e8f0;
    line-height: 1.3;
  }

  .summary-prefs {
    font-size: 12px;
    color: #94a3b8;
  }

  /* Education */
  .ctx-education {
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border-left: 3px solid #C8102E;
  }

  .ctx-education p {
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.6;
    margin: 0;
  }

  /* ── Local action button (Continuar / Dejar en blanco) ─────────────────── */
  .local-action-btn {
    width: 100%;
    padding: 11px 14px;
    border: none;
    border-radius: 6px;
    background: #1e3a5f;
    font-size: 13px;
    font-weight: 700;
    color: #60a5fa;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s ease, color 0.15s ease;
    font-family: inherit;
    letter-spacing: 0.01em;
  }

  .local-action-btn:hover {
    background: #1e4080;
    color: #93c5fd;
  }

  .local-action-btn.local-action-skip {
    background: transparent;
    color: #475569;
    border: 1px dashed #334155;
  }

  .local-action-btn.local-action-skip:hover {
    color: #64748b;
    border-color: #475569;
  }

  /* ── CTA area ────────────────────────────────────────────────────────────── */
  .cta-area {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: auto;
    border-top: 1px solid #1e293b;
    position: sticky;
    bottom: 0;
    background: #0f172a;
  }

  .cta-area.state-complete {
    border-top-color: rgba(34, 197, 94, 0.25);
  }

  /* ── Ballot state block ──────────────────────────────────────────────────── */
  .ballot-state-block {
    border-radius: 8px;
    padding: 12px;
    border: 1px solid #1e293b;
    background: rgba(255,255,255,0.03);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .bsb-complete { border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.05); }
  .bsb-partial  { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.04); }
  .bsb-blank    { border-color: #1e293b; background: rgba(255,255,255,0.02); }

  .bsb-title {
    font-size: 13px;
    font-weight: 700;
    margin: 0;
  }
  .bsb-complete .bsb-title { color: #4ade80; }
  .bsb-partial  .bsb-title { color: #fbbf24; }
  .bsb-blank    .bsb-title { color: #94a3b8; }

  .bsb-desc {
    font-size: 11px;
    color: #64748b;
    line-height: 1.55;
    margin: 0;
  }

  /* Section summary */
  .section-summary {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-hd {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #334155;
    margin: 0 0 2px;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .summary-col-name {
    font-size: 11px;
    color: #64748b;
  }

  .summary-col-status {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .s-marked { color: #4ade80; }
  .s-blank  { color: #334155; }

  /* Microcopy */
  .deliver-microcopy {
    font-size: 11px;
    color: #334155;
    line-height: 1.55;
    margin: 0;
    text-align: center;
  }

  /* Deliver button — always active */
  .deliver-btn {
    width: 100%;
    padding: 14px 16px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    line-height: 1.4;
    text-align: center;
    transition: all 0.25s ease;
    font-family: inherit;
    background: linear-gradient(135deg, #C8102E 0%, #a00d25 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(200, 16, 46, 0.35);
  }

  .deliver-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(200, 16, 46, 0.45);
  }

  .deliver-btn.busy,
  .deliver-btn:disabled {
    opacity: 0.6;
    cursor: wait;
    transform: none;
    box-shadow: none;
  }

</style>
