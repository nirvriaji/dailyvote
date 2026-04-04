<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { vote } from '$lib/stores/vote.svelte';
  import {
    getColumnPreferenceNumbers,
    loadPreferencesFromStorage,
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';

  // ─── Ballot definition ───────────────────────────────────────────────────────
  const BALLOT_DEF = [
    { colId: 'col0', key: 'presidente'       as ColumnKey, label: 'Presidencia',       hasPreferential: false },
    { colId: 'col1', key: 'senadoNacional'   as ColumnKey, label: 'Senado nacional',   hasPreferential: true  },
    { colId: 'col2', key: 'senadoRegional'   as ColumnKey, label: 'Senado regional',   hasPreferential: true  },
    { colId: 'col3', key: 'diputados'        as ColumnKey, label: 'Diputados',         hasPreferential: true  },
    { colId: 'col4', key: 'parlamentoAndino' as ColumnKey, label: 'Parlamento Andino', hasPreferential: true  },
  ] as const;

  // ─── State ───────────────────────────────────────────────────────────────────
  let arriving      = $state(true);
  let showHelpPanel = $state(false);

  // ─── Protagonist flow (Senado nacional) ──────────────────────────────────────
  let protagonistStep    = $state(0);
  let protagonistStarted = false;

  function startProtagonistFlow() {
    if (protagonistStarted) return;
    protagonistStarted = true;
    const next = (step: number) => {
      protagonistStep = step;
      if (step < 4) setTimeout(() => next(step + 1), 620);
    };
    setTimeout(() => next(1), 250);
  }

  // ─── User ballot ─────────────────────────────────────────────────────────────
  let userBallot = $derived(
    BALLOT_DEF.map(def => ({
      ...def,
      selection: vote.getVote(def.colId),
      prefs: def.hasPreferential ? getColumnPreferenceNumbers(def.key) : [] as number[],
    }))
  );
  let hasUserVote = $derived(vote.count > 0);

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  onMount(() => {
    const savedVotes = sessionStorage.getItem('dailyvote');
    if (savedVotes && vote.count === 0) vote.hydrate(savedVotes);
    loadPreferencesFromStorage();

    setTimeout(() => { arriving = false; }, 1200);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) startProtagonistFlow();
      });
    }, { threshold: 0.3 });

    setTimeout(() => {
      const el = document.querySelector('[data-protagonist-flow]');
      if (el) observer.observe(el);
    }, 800);

    return () => observer.disconnect();
  });
</script>

<svelte:head>
  <title>Así se procesó tu voto — Simulación Electoral Perú 2026</title>
  <meta name="description" content="Ve cómo tu voto se procesó paso a paso. Entiende la lógica de partido, valla y voto preferencial en las elecciones Perú 2026." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://lafechamasimportante.com/resultados" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://lafechamasimportante.com/resultados" />
  <meta property="og:title" content="Así se procesó tu voto — Elecciones Perú 2026" />
  <meta property="og:description" content="Ve cómo tu voto se procesó paso a paso." />
  <meta property="og:image" content="https://lafechamasimportante.com/favicon.svg" />
  <meta property="og:locale" content="es_PE" />
  <meta property="twitter:card" content="summary" />
  <meta property="twitter:url" content="https://lafechamasimportante.com/resultados" />
  <meta property="twitter:title" content="Así se procesó tu voto — Elecciones Perú 2026" />
  <meta property="twitter:description" content="Ve cómo tu voto se procesó paso a paso." />
  <meta property="twitter:image" content="https://lafechamasimportante.com/favicon.svg" />
</svelte:head>

<!-- ── Entry veil ─────────────────────────────────────────────────────────── -->
{#if arriving}
  <div class="arrival-veil" out:fade={{ duration: 600 }}>
    <div class="arrival-inner">
      <div class="arrival-check">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <p class="arrival-title">Tu voto fue registrado</p>
      <p class="arrival-sub">Preparando la explicación...</p>
    </div>
  </div>
{/if}

<!-- ── Page ───────────────────────────────────────────────────────────────── -->
<div class="res-page">

  <!-- ═══ HERO ════════════════════════════════════════════════════════════ -->
  <section class="hero-sect" in:fly={{ y: 28, duration: 700, delay: 500 }}>
    <p class="hero-eyebrow">Simulación electoral · Perú 2026</p>
    <h1 class="hero-title">Así se procesó tu voto</h1>
    <p class="hero-subtitle">Tu elección impactó en presidencia, partido y voto preferencial. Mira qué pasó paso a paso.</p>
  </section>

  <!-- ═══ TU SELECCIÓN ════════════════════════════════════════════════════ -->
  {#if hasUserVote}
    <section class="ballot-summary-sect" in:fly={{ y: 20, duration: 600, delay: 700 }}>
      <h2 class="section-label">Tu selección</h2>
      <div class="ballot-summary-grid">
        {#each userBallot as row}
          <div
            class="ballot-card"
            class:has-vote={!!row.selection}
            style="--party-color: {row.selection?.partyColor ?? '#334155'}"
          >
            <span class="bc-col-label">{row.label}</span>
            {#if row.selection}
              <div class="bc-party-row">
                <div class="bc-party-dot"></div>
                <span class="bc-party-name">{row.selection.partyName}</span>
              </div>
              {#if row.prefs.length > 0}
                <div class="bc-prefs">
                  {#each row.prefs as num}
                    <span class="pref-chip">N° {num}</span>
                  {/each}
                </div>
              {/if}
            {:else}
              <span class="bc-empty">Sin marcar</span>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ═══ QUÉ PASÓ CON TU VOTO ════════════════════════════════════════════ -->
  <section class="processing-sect">
    <h2 class="section-label">Qué pasó con tu voto</h2>

    <!-- Presidencia -->
    <div class="proc-card">
      <h3 class="proc-card-title">Presidencia</h3>
      <p class="proc-card-desc">Tu voto fue directo a esta candidatura presidencial.</p>
      {#if userBallot[0]?.selection}
        <div class="pres-selection-row">
          <div class="pres-dot" style="background: {userBallot[0].selection.partyColor}"></div>
          <span class="pres-party">{userBallot[0].selection.partyName}</span>
          <span class="direct-impact">+1 voto presidencial</span>
        </div>
      {:else}
        <p class="proc-no-vote">No realizaste una selección en esta sección.</p>
      {/if}
    </div>

    <!-- Senado nacional: flujo animado secuencial -->
    {#if userBallot[1]}
      {@const senadoNac = userBallot[1]}
      <div class="proc-card" data-protagonist-flow>
        <h3 class="proc-card-title">{senadoNac.label}</h3>

        {#if senadoNac.selection}
          <div class="flow-track-animated">

            {#if protagonistStep >= 1}
              <div class="fn" in:fly={{ y: 12, duration: 380 }}>
                <div class="fn-icon-wrap" style="border-color: {senadoNac.selection.partyColor}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:{senadoNac.selection.partyColor}"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                </div>
                <p class="fn-label">Tu voto</p>
                <p class="fn-desc">Tu voto sumó al partido que elegiste.</p>
                <span class="fn-tag" style="border-color:{senadoNac.selection.partyColor}25;background:{senadoNac.selection.partyColor}12;color:{senadoNac.selection.partyColor}">{senadoNac.selection.partyName}</span>
              </div>
            {/if}

            {#if protagonistStep >= 2}
              <div class="fn-arrow" in:fade={{ duration: 220 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div class="fn" in:fly={{ y: 12, duration: 380 }}>
                <div class="fn-icon-wrap fi-partido">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <p class="fn-label">Partido</p>
                <p class="fn-desc">Si el partido pasa la valla y obtiene puestos, entra en la distribución.</p>
              </div>
            {/if}

            {#if protagonistStep >= 3}
              <div class="fn-arrow" in:fade={{ duration: 220 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div class="fn" in:fly={{ y: 12, duration: 380 }}>
                <div class="fn-icon-wrap fi-puestos">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </div>
                <p class="fn-label">Puestos</p>
                <p class="fn-desc">Los puestos dependen de cuántos votos obtiene el partido.</p>
              </div>
            {/if}

            {#if protagonistStep >= 4}
              <div class="fn-arrow" in:fade={{ duration: 220 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div class="fn" in:fly={{ y: 12, duration: 380 }}>
                <div class="fn-icon-wrap fi-candidatos">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <p class="fn-label">Candidatos</p>
                <p class="fn-desc">Si marcaste números preferenciales, esos números ayudan a definir qué candidatos del partido entran al congreso.</p>
                {#if senadoNac.prefs.length > 0}
                  <div class="fn-prefs-row">
                    {#each senadoNac.prefs as num}<span class="fn-pref-num">N° {num}</span>{/each}
                  </div>
                  <p class="fn-pref-note">Este número cuenta si el partido pasa la valla y obtiene puestos. Define qué candidatos del partido entran al congreso.</p>
                {:else}
                  <span class="fn-no-pref">Sin voto preferencial</span>
                {/if}
              </div>
            {/if}

          </div>
        {:else}
          <p class="proc-no-vote">No realizaste una selección en esta sección.</p>
        {/if}
      </div>
    {/if}

    <!-- Secciones restantes: resumen simple -->
    {#each userBallot.slice(2) as col}
      <div class="bloque-resumen">
        <h3 class="proc-card-title">{col.label}</h3>
        {#if col.selection}
          <div class="resumen-partido" style="--party-color: {col.selection.partyColor}">
            <div class="resumen-dot"></div>
            <span class="resumen-name">{col.selection.partyName}</span>
            {#if col.prefs.length > 0}
              <div class="bc-prefs">
                {#each col.prefs as num}<span class="pref-chip">N° {num}</span>{/each}
              </div>
            {/if}
          </div>
          <p class="resumen-logic">Tu voto sigue la misma lógica: suma al partido y, si hay preferenciales, define qué candidatos del partido entran al congreso.</p>
        {:else}
          <p class="proc-no-vote">No realizaste una selección en esta sección.</p>
        {/if}
      </div>
    {/each}
  </section>

  <!-- ═══ QUÉ DEBES RECORDAR ═══════════════════════════════════════════════ -->
  <section class="takeaway-sect" in:fly={{ y: 16, duration: 500 }}>
    <h2 class="section-label">Qué debes recordar</h2>
    <div class="takeaway-card">
      <p class="takeaway-line">Tu voto primero suma al partido.</p>
      <p class="takeaway-line">Si el partido pasa la valla y obtiene puestos, el voto preferencial ayuda a definir qué candidatos del partido entran al congreso.</p>
      <p class="takeaway-footer">Los resultados finales dependen de millones de votos como este.</p>
    </div>
  </section>

  <HelpPanel isOpen={showHelpPanel} onClose={() => showHelpPanel = false} />

</div>

<style>
  /* ─────────────────────────────────────────────────────────────────────────
     Base
  ───────────────────────────────────────────────────────────────────────── */
  :global(body) {
    background: #0b1220;
    color: #e2e8f0;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .res-page {
    max-width: 860px;
    margin: 0 auto;
    padding: 0 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Entry veil
  ───────────────────────────────────────────────────────────────────────── */
  .arrival-veil {
    position: fixed;
    inset: 0;
    background: #0b1220;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arrival-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
  }

  .arrival-check {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(34, 197, 94, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arrival-title {
    font-size: 20px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }

  .arrival-sub {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Section label
  ───────────────────────────────────────────────────────────────────────── */
  .section-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #C8102E;
    margin: 0 0 16px;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Hero
  ───────────────────────────────────────────────────────────────────────── */
  .hero-sect {
    padding-top: 48px;
  }

  .hero-eyebrow {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #475569;
    margin: 0 0 12px;
  }

  .hero-title {
    font-size: clamp(28px, 5vw, 44px);
    font-weight: 800;
    color: #f8fafc;
    line-height: 1.15;
    margin: 0 0 14px;
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    font-size: 17px;
    color: #94a3b8;
    line-height: 1.65;
    margin: 0;
    max-width: 560px;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Ballot summary
  ───────────────────────────────────────────────────────────────────────── */
  .ballot-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 10px;
  }

  .ballot-card {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s;
  }

  .ballot-card.has-vote {
    border-color: color-mix(in srgb, var(--party-color) 35%, transparent);
  }

  .bc-col-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #475569;
  }

  .bc-party-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .bc-party-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--party-color);
    flex-shrink: 0;
  }

  .bc-party-name {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.3;
  }

  .bc-prefs {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-top: 2px;
  }

  .pref-chip {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    background: rgba(200, 16, 46, 0.12);
    border: 1px solid rgba(200, 16, 46, 0.25);
    border-radius: 99px;
    color: #f87171;
  }

  .bc-empty {
    font-size: 12px;
    color: #334155;
    font-style: italic;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Processing section
  ───────────────────────────────────────────────────────────────────────── */
  .processing-sect {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .proc-card {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 24px;
  }

  .proc-card-title {
    font-size: 16px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0 0 10px;
  }

  .proc-card-desc {
    font-size: 14px;
    color: #94a3b8;
    margin: 0 0 16px;
    line-height: 1.6;
  }

  /* Presidential */
  .pres-selection-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 8px;
  }

  .pres-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .pres-party {
    font-size: 15px;
    font-weight: 600;
    color: #e2e8f0;
    flex: 1;
  }

  .direct-impact {
    font-size: 11px;
    color: #22c55e;
    font-weight: 600;
  }

  .proc-no-vote {
    font-size: 13px;
    color: #334155;
    font-style: italic;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Flow track (protagonist — Senado nacional)
  ───────────────────────────────────────────────────────────────────────── */
  .flow-track-animated {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
  }

  .fn {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 10px;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    flex: 1;
    min-width: 120px;
  }

  .fn-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #1e293b;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .fi-partido   { border-color: rgba(99, 102, 241, 0.3); color: #818cf8; }
  .fi-puestos   { border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; }
  .fi-candidatos { border-color: rgba(34, 197, 94, 0.3); color: #4ade80; }

  .fn-label {
    font-size: 12px;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0;
  }

  .fn-desc {
    font-size: 11px;
    color: #64748b;
    line-height: 1.55;
    margin: 0;
  }

  .fn-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 99px;
    border: 1px solid;
    margin-top: 2px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fn-prefs-row {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .fn-pref-num {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    background: rgba(200, 16, 46, 0.12);
    border: 1px solid rgba(200, 16, 46, 0.25);
    border-radius: 99px;
    color: #f87171;
  }

  .fn-no-pref {
    font-size: 10px;
    color: #334155;
    font-style: italic;
    margin-top: 2px;
  }

  .fn-pref-note {
    font-size: 10px;
    color: #64748b;
    line-height: 1.55;
    margin: 4px 0 0;
    padding: 6px 8px;
    background: rgba(200, 16, 46, 0.06);
    border-left: 2px solid rgba(200, 16, 46, 0.3);
    border-radius: 0 4px 4px 0;
  }

  .fn-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #334155;
    padding-top: 18px;
    flex-shrink: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Collapsed summary blocks (other legislative columns)
  ───────────────────────────────────────────────────────────────────────── */
  .bloque-resumen {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .resumen-partido {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .resumen-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--party-color);
    flex-shrink: 0;
  }

  .resumen-name {
    font-size: 14px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .resumen-logic {
    font-size: 12px;
    color: #475569;
    line-height: 1.55;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Takeaway
  ───────────────────────────────────────────────────────────────────────── */
  .takeaway-card {
    background: #111827;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .takeaway-line {
    font-size: 16px;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.6;
    margin: 0;
  }

  .takeaway-footer {
    font-size: 13px;
    color: #475569;
    line-height: 1.6;
    margin: 0;
    padding-top: 6px;
    border-top: 1px solid #1e293b;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Responsive
  ───────────────────────────────────────────────────────────────────────── */
  @media (max-width: 700px) {
    .res-page {
      gap: 40px;
      padding: 0 16px 80px;
    }

    .hero-sect {
      padding-top: 32px;
    }

    .ballot-summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .flow-track-animated {
      flex-direction: column;
      gap: 4px;
    }

    .fn-arrow {
      padding-top: 0;
      transform: rotate(90deg);
      height: 24px;
    }
  }
</style>
