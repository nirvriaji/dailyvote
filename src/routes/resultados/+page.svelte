<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { vote } from '$lib/stores/vote.svelte';
  import {
    getColumnPreferenceNumbers,
    loadPreferencesFromStorage,
    resetAllSelections,
  } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  import ShareModal from '$lib/components/ShareModal.svelte';
  import { deriveInsights } from '$lib/utils/simulationInsights';
  // ─── Ballot definition ───────────────────────────────────────────────────────
  const BALLOT_DEF = [
    { colId: 'col0', key: 'presidente'       as ColumnKey, label: 'Presidencia',       hasPreferential: false },
    { colId: 'col1', key: 'senadoNacional'   as ColumnKey, label: 'Senado nacional',   hasPreferential: true  },
    { colId: 'col2', key: 'senadoRegional'   as ColumnKey, label: 'Senado regional',   hasPreferential: true  },
    { colId: 'col3', key: 'diputados'        as ColumnKey, label: 'Diputados',         hasPreferential: true  },
    { colId: 'col4', key: 'parlamentoAndino' as ColumnKey, label: 'Parlamento Andino', hasPreferential: true  },
  ] as const;

  // ─── State ───────────────────────────────────────────────────────────────────
  let arriving = $state(true);

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
  let hasUserVote  = $derived(vote.count > 0);
  let markedCount  = $derived(vote.count);
  type BallotStatus = 'blank' | 'partial' | 'complete';
  let ballotStatus = $derived<BallotStatus>(
    markedCount === 5 ? 'complete' : markedCount === 0 ? 'blank' : 'partial'
  );
  let insights = $derived(deriveInsights(userBallot));

  // ─── Actions ─────────────────────────────────────────────────────────────────
  let showHelpPanel  = $state(false);
  let showShareModal = $state(false);
  let restarting       = $state(false);
  let _whatIfOverride  = $state<'concentrar' | 'dividir' | null>(null);
  let whatIfScenario   = $derived(_whatIfOverride ?? (insights.isConcentrated ? 'dividir' : 'concentrar'));

  async function handleRestart() {
    if (restarting) return;
    restarting = true;
    vote.resetForNewSimulation();
    resetAllSelections();
    await goto('/simular');
  }


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

<!-- ── Modales ────────────────────────────────────────────────────────────── -->
<HelpPanel isOpen={showHelpPanel} onClose={() => showHelpPanel = false} />
<ShareModal
  isOpen={showShareModal}
  onClose={() => showShareModal = false}
  url="https://lafechamasimportante.com/resultados"
  text="Simulé mi voto en las elecciones Perú 2026 — pruébalo tú también."
/>

<!-- ── Page ───────────────────────────────────────────────────────────────── -->
<div class="res-page">

  <!-- ═══ HERO ════════════════════════════════════════════════════════════ -->
  <section class="hero-sect" in:fly={{ y: 28, duration: 700, delay: 500 }}>
    <p class="hero-eyebrow">Simulación electoral · Perú 2026</p>
    <h1 class="hero-title">
      {#if ballotStatus === 'complete' && insights.isConcentrated}Tu voto fue directo y concentrado
      {:else if ballotStatus === 'complete' && insights.isFragmented}Tu voto se diversificó entre varios partidos
      {:else if ballotStatus === 'complete'}Así se procesó tu voto
      {:else if ballotStatus === 'partial'}Así se procesó tu cédula parcial
      {:else}Entregaste una cédula en blanco{/if}
    </h1>
    <p class="hero-subtitle">
      {#if ballotStatus === 'complete' && insights.isConcentrated}Marcaste las 5 decisiones y concentraste el voto legislativo en un solo partido. Mira cómo eso afecta la distribución de escaños y el voto preferencial.
      {:else if ballotStatus === 'complete' && insights.isFragmented}Marcaste las 5 decisiones y repartiste el voto entre {insights.uniqueParties} partidos distintos. Mira cómo esa diversificación se procesa en presidencia y en el congreso.
      {:else if ballotStatus === 'complete'}Marcaste las 5 decisiones de la cédula. Mira cómo tu elección impactó en presidencia, partido y voto preferencial.
      {:else if ballotStatus === 'partial'}Solo se procesaron las decisiones que sí marcaste. Mira qué pasó con esas elecciones y cuáles quedaron en blanco.
      {:else}No marcaste ninguna de las elecciones de esta cédula. Por eso no hubo votos que procesar en presidencia ni en el congreso.{/if}
    </p>
  </section>

  <!-- ═══ RESUMEN DE LA CÉDULA ════════════════════════════════════════════ -->
  <section class="ballot-summary-sect" in:fly={{ y: 20, duration: 600, delay: 700 }}>
    <h2 class="section-label">Resumen de tu cédula</h2>
    <div class="ballot-summary-grid">
      {#each userBallot as row}
        <div
          class="ballot-card"
          class:has-vote={!!row.selection}
          style="--party-color: {row.selection?.partyColor ?? '#334155'}"
        >
          <div class="bc-top-row">
            <span class="bc-col-label">{row.label}</span>
            <span class="bc-status-chip" class:chip-marked={!!row.selection} class:chip-blank={!row.selection}>
              {row.selection ? 'Marcado' : 'En blanco'}
            </span>
          </div>
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
          {/if}
        </div>
      {/each}
    </div>
  </section>

  <!-- ═══ QUÉ PASÓ CON TU VOTO ════════════════════════════════════════════ -->
  <section class="processing-sect">
    <h2 class="section-label">Qué pasó con tu voto</h2>

    <!-- Presidencia -->
    <div class="proc-card">
      <h3 class="proc-card-title">Presidencia</h3>
      {#if userBallot[0]?.selection}
        <p class="proc-card-desc">Tu voto fue directo a esta candidatura presidencial.</p>
        <div class="pres-selection-row">
          <div class="pres-dot" style="background: {userBallot[0].selection.partyColor}"></div>
          <span class="pres-party">{userBallot[0].selection.partyName}</span>
          <span class="direct-impact">+1 voto presidencial</span>
        </div>
      {:else}
        <p class="proc-blank-text">Esta elección quedó en blanco. No se sumó ningún voto presidencial en esta parte de la cédula.</p>
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
          <p class="proc-blank-text">Esta sección quedó en blanco. No se sumó ningún voto en esta elección de la cédula.</p>
        {/if}
      </div>
    {/if}

    <!-- Secciones restantes -->
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
          <p class="proc-blank-text">Esta sección quedó en blanco. No se sumó ningún voto en esta elección de la cédula.</p>
        {/if}
      </div>
    {/each}
  </section>

  <!-- ═══ QUÉ DEBES RECORDAR ═══════════════════════════════════════════════ -->
  <section class="takeaway-sect" in:fly={{ y: 16, duration: 500 }}>
    <h2 class="section-label">Qué debes recordar</h2>
    <div class="takeaway-card">
      {#if ballotStatus === 'complete'}
        <p class="takeaway-line">Tu voto primero suma al partido.</p>
        <p class="takeaway-line">Si el partido pasa la valla y obtiene puestos, el voto preferencial ayuda a definir qué candidatos del partido entran al congreso.</p>
        <p class="takeaway-footer">Los resultados finales dependen de millones de votos como este.</p>
      {:else if ballotStatus === 'partial'}
        <p class="takeaway-line">Solo las decisiones que marcaste entraron a la simulación.</p>
        <p class="takeaway-line">Las secciones en blanco no suman votos en esas elecciones.</p>
        <p class="takeaway-footer">Si el partido pasa la valla y obtiene puestos, el voto preferencial ayuda a definir qué candidatos del partido entran al congreso.</p>
      {:else}
        <p class="takeaway-line">Una cédula en blanco no suma votos en ninguna de las elecciones que contiene.</p>
        <p class="takeaway-line">Por eso esta simulación no muestra impacto en presidencia ni en el congreso.</p>
        <p class="takeaway-footer">Marcar la cédula es lo que activa el procesamiento del voto.</p>
      {/if}
    </div>
  </section>

  <!-- ═══ LO QUE REVELA TU CÉDULA ════════════════════════════════════════ -->
  {#if ballotStatus !== 'blank'}
  <section class="ballot-reveal-sect">
    <h2 class="section-label">Lo que revela tu cédula</h2>

    <div class="reveal-cards">
      <!-- Card 1: Concentración / fragmentación -->
      {#if insights.legislativeSelectionsCount >= 2}
        {#if insights.isConcentrated}
          <article class="reveal-card reveal-card--concentrated">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Apostaste por un solo partido en el Congreso</h3>
              <p class="reveal-card-desc">Todas tus elecciones legislativas sumaron al mismo partido. Si ese partido pasa la valla, concentra más escaños y tiene mayor influencia en el Congreso.</p>
            </div>
          </article>
        {:else if insights.isFragmented}
          <article class="reveal-card reveal-card--fragmented">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Tu voto se distribuyó entre {insights.uniqueParties} partidos distintos</h3>
              <p class="reveal-card-desc">Repartiste tu apoyo entre muchas fuerzas políticas. Cada una necesita pasar la valla por su cuenta para obtener escaños. Esto favorece un Congreso más diverso.</p>
            </div>
          </article>
        {:else}
          <article class="reveal-card">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Repartiste el voto entre {insights.uniqueParties} partidos</h3>
              <p class="reveal-card-desc">Tus elecciones legislativas sumaron a partidos distintos. Los escaños se distribuyen entre quienes pasen la valla electoral.</p>
            </div>
          </article>
        {/if}
      {/if}

      <!-- Card 2: Voto preferencial -->
      {#if insights.legislativeSelectionsCount > 0}
        {#if insights.hasAllPrefs}
          <article class="reveal-card reveal-card--prefs">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Usaste el voto preferencial en todas tus elecciones legislativas</h3>
              <p class="reveal-card-desc">Si tus partidos pasan la valla y obtienen escaños, tus números preferenciales influyen en qué candidatos de esos partidos entran al Congreso.</p>
            </div>
          </article>
        {:else if insights.hasAnyPreferences}
          <article class="reveal-card">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Usaste el voto preferencial en algunas elecciones</h3>
              <p class="reveal-card-desc">En las secciones donde sí marcaste un número, ese número influye en qué candidatos entran al Congreso si el partido pasa la valla. En las demás, el orden de lista del partido decide.</p>
            </div>
          </article>
        {:else}
          <article class="reveal-card">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">No marcaste votos preferenciales</h3>
              <p class="reveal-card-desc">Sin preferencial, el orden de la lista del partido determina qué candidatos entran al Congreso. El voto preferencial es opcional, pero influye en quiénes específicamente representan al partido.</p>
            </div>
          </article>
        {/if}
      {/if}

      <!-- Card 3: Columnas en blanco (solo si parcial) -->
      {#if ballotStatus === 'partial' && insights.blankColumns.length > 0}
        <article class="reveal-card reveal-card--blank">
          <div class="reveal-card-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </div>
          <div>
            <h3 class="reveal-card-title">{insights.blankColumns.length === 1 ? 'Una decisión quedó en blanco' : `${insights.blankColumns.length} decisiones quedaron en blanco`}</h3>
            <p class="reveal-card-desc">{insights.blankColumns.join(', ')} {insights.blankColumns.length === 1 ? 'no sumó votos' : 'no sumaron votos'} en esa elección. Solo las decisiones marcadas entran al procesamiento de resultados.</p>
          </div>
        </article>
      {/if}
    </div>
  </section>
  {/if}

  <!-- ═══ EXPLORA OTRO ESCENARIO ══════════════════════════════════════════ -->
  <section class="what-if-sect">
    <h2 class="section-label">Explora otro escenario</h2>

    <p class="what-if-intro">
      {#if insights.isConcentrated}Tu cédula concentró el voto legislativo en un solo partido. Aquí puedes ver qué implica esa decisión o explorar qué pasaría si lo dividieras.
      {:else if insights.isFragmented}Tu cédula repartió el voto entre varios partidos. Aquí puedes comparar qué implica eso frente a concentrar el apoyo.
      {:else}Tu resultado muestra lo que pasó con tu voto. Aquí puedes comparar, de forma simple, qué cambia cuando el apoyo se concentra en un solo partido o se reparte entre varios.{/if}
    </p>

    <div class="what-if-toggle" role="tablist" aria-label="Comparar escenarios de voto">
      <button
        type="button"
        class="what-if-btn"
        class:is-active={whatIfScenario === 'concentrar'}
        aria-pressed={whatIfScenario === 'concentrar'}
        onclick={() => _whatIfOverride = 'concentrar'}
      >
        Concentrar voto
      </button>
      <button
        type="button"
        class="what-if-btn"
        class:is-active={whatIfScenario === 'dividir'}
        aria-pressed={whatIfScenario === 'dividir'}
        onclick={() => _whatIfOverride = 'dividir'}
      >
        Dividir voto
      </button>
    </div>

    {#if whatIfScenario === 'concentrar'}
      <div class="what-if-card">
        <p class="what-if-result">
          Cuando el voto se concentra en un mismo partido, ese partido obtiene una mayor proporción de escaños en el Congreso.
          Luego de esa distribución, el voto preferencial define qué candidatos de ese partido ocupan esos escaños.
        </p>
      </div>
    {:else}
      <div class="what-if-card">
        <p class="what-if-result">
          Cuando el voto se reparte entre distintos partidos, los escaños se distribuyen entre más fuerzas políticas.
          Después de esa distribución, el voto preferencial define qué candidatos de cada partido ocupan esos escaños.
        </p>
      </div>
    {/if}
  </section>

  <!-- ═══ SIMULAR DE NUEVO + FEEDBACK ══════════════════════════════════════ -->
  <section class="closing-sect">
    <button class="btn-primary" onclick={handleRestart} disabled={restarting}>
      {#if restarting}Preparando...
      {:else if ballotStatus === 'complete'}Simular de nuevo
      {:else if ballotStatus === 'partial'}Probar una cédula completa
      {:else}Volver y marcar la cédula{/if}
    </button>

    <div class="feedback-block">
      <p class="feedback-title">¿Te ayudó esta herramienta?</p>
      <p class="feedback-sub">Tu opinión ayuda a mejorar.</p>
      <div class="feedback-actions">
        <button class="btn-ghost" onclick={() => showHelpPanel = true}>Contacto</button>
        <button class="btn-ghost" onclick={() => showShareModal = true}>Compartir</button>
      </div>
    </div>

  </section>

</div>

<style>
  /* ─────────────────────────────────────────────────────────────────────────
     Base
  ───────────────────────────────────────────────────────────────────────── */
  :global(html),
  :global(body) {
    background: #0b1220 !important;
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
    background: #0b1220;
    min-height: 100dvh;
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

  .bc-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .bc-col-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #475569;
  }

  .bc-status-chip {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 99px;
    border: 1px solid;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .chip-marked {
    color: #4ade80;
    border-color: rgba(74, 222, 128, 0.3);
    background: rgba(74, 222, 128, 0.07);
  }

  .chip-blank {
    color: #475569;
    border-color: #1e293b;
    background: transparent;
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

  .proc-blank-text {
    font-size: 14px;
    color: #475569;
    line-height: 1.6;
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
     Ballot reveal (dynamic insights)
  ───────────────────────────────────────────────────────────────────────── */
  .reveal-cards {
    display: grid;
    gap: 12px;
  }

  .reveal-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 16px 18px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .reveal-card--concentrated {
    border-color: rgba(59, 130, 246, 0.25);
    background: rgba(59, 130, 246, 0.05);
  }

  .reveal-card--fragmented {
    border-color: rgba(168, 85, 247, 0.25);
    background: rgba(168, 85, 247, 0.05);
  }

  .reveal-card--prefs {
    border-color: rgba(34, 197, 94, 0.22);
    background: rgba(34, 197, 94, 0.04);
  }

  .reveal-card--blank {
    border-color: rgba(100, 116, 139, 0.25);
  }

  .reveal-card-icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    margin-top: 1px;
  }

  .reveal-card--concentrated .reveal-card-icon { color: #60a5fa; }
  .reveal-card--fragmented   .reveal-card-icon { color: #c084fc; }
  .reveal-card--prefs        .reveal-card-icon { color: #4ade80; }

  .reveal-card-title {
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.35;
    margin: 0 0 6px;
  }

  .reveal-card-desc {
    font-size: 13px;
    color: rgba(203, 213, 225, 0.75);
    line-height: 1.65;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     What-if / scenario explorer
  ───────────────────────────────────────────────────────────────────────── */
  .what-if-sect {
    margin-top: 40px;
  }

  .what-if-intro {
    font-size: 14px;
    color: rgba(220, 230, 242, 0.78);
    line-height: 1.6;
    margin: 12px 0 16px;
  }

  .what-if-toggle {
    display: inline-flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .what-if-btn {
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(230, 238, 248, 0.72);
    border-radius: 999px;
    padding: 9px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .what-if-btn.is-active {
    background: rgba(255, 255, 255, 0.09);
    border-color: rgba(255, 255, 255, 0.18);
    color: #f4f7fb;
    font-weight: 600;
  }

  .what-if-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 18px 20px;
  }

  .what-if-result {
    font-size: 13px;
    color: rgba(203, 213, 225, 0.78);
    line-height: 1.65;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Closing section
  ───────────────────────────────────────────────────────────────────────── */
  .closing-sect {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
    padding-bottom: 16px;
  }

  .btn-primary {
    display: inline-block;
    padding: 14px 32px;
    background: #C8102E;
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    border-radius: 8px;
    border: none;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
  }

  .btn-primary:hover:not(:disabled) {
    background: #a50d26;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .feedback-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
  }

  .feedback-title {
    font-size: 15px;
    font-weight: 600;
    color: #94a3b8;
    margin: 0;
  }

  .feedback-sub {
    font-size: 13px;
    color: #475569;
    margin: 0;
  }

  .feedback-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 4px;
  }

  .btn-ghost {
    padding: 9px 20px;
    background: transparent;
    border: 1px solid #334155;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    font-family: inherit;
  }

  .btn-ghost:hover {
    border-color: #475569;
    color: #94a3b8;
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
