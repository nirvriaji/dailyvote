<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { vote } from '$lib/stores/vote.svelte';
  import {
    getColumnPreferenceNumbers,
    loadPreferencesFromStorage,
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

  // ─── How-it-works flow ───────────────────────────────────────────────────────
  let hiwStep    = $state(0);
  let hiwStarted = false;

  function startHiwFlow() {
    if (hiwStarted) return;
    hiwStarted = true;
    const next = (step: number) => {
      hiwStep = step;
      if (step < 4) setTimeout(() => next(step + 1), 620);
    };
    setTimeout(() => next(1), 250);
  }

  // ─── User ballot ─────────────────────────────────────────────────────────────
  let userBallot = $derived(
    BALLOT_DEF.map(def => {
      const selection = vote.getVote(def.colId);
      return {
        ...def,
        selection,
        prefs: def.hasPreferential && selection ? getColumnPreferenceNumbers(def.key) : [] as number[],
      };
    })
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
    sessionStorage.setItem('entry_mode', 'new_simulation');
    await goto('/simular');
  }


  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  onMount(() => {
    const savedVotes = sessionStorage.getItem('dailyvote');
    if (savedVotes && vote.count === 0) vote.hydrate(savedVotes);
    loadPreferencesFromStorage();


    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) startProtagonistFlow();
      });
    }, { threshold: 0.3 });

    const hiwObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) startHiwFlow();
      });
    }, { threshold: 0.3 });

    setTimeout(() => {
      const el = document.querySelector('[data-protagonist-flow]');
      if (el) observer.observe(el);
      const hiw = document.querySelector('[data-hiw-flow]');
      if (hiw) hiwObserver.observe(hiw);
    }, 800);

    return () => { observer.disconnect(); hiwObserver.disconnect(); };
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
  <meta property="og:description" content="Ve cómo tu voto se procesó paso a paso: partidos, valla electoral, escaños y voto preferencial en las Elecciones Perú 2026." />
  <meta property="og:image" content="https://lafechamasimportante.com/og-image.png" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Así se procesó tu voto — Simulación Electoral Perú 2026" />
  <meta property="og:locale" content="es_PE" />
  <meta property="og:site_name" content="La Fecha Más Importante" />
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://lafechamasimportante.com/resultados" />
  <meta property="twitter:title" content="Así se procesó tu voto — Elecciones Perú 2026" />
  <meta property="twitter:description" content="Ve cómo tu voto se procesó paso a paso: partidos, valla electoral, escaños y voto preferencial en las Elecciones Perú 2026." />
  <meta property="twitter:image" content="https://lafechamasimportante.com/og-image.png" />
  <meta name="twitter:creator" content="@lafechamásimportante" />
</svelte:head>


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
      {#if ballotStatus === 'complete' && insights.isConcentrated}Tu voto al Congreso fue a un solo partido
      {:else if ballotStatus === 'complete' && insights.isFragmented}Repartiste tu voto entre {insights.uniqueParties} partidos
      {:else if ballotStatus === 'complete'}Así se procesó tu voto
      {:else if ballotStatus === 'partial'}Repartiste tu voto entre {insights.uniqueParties > 1 ? `${insights.uniqueParties} partidos` : 'algunos partidos'}
      {:else}Entregaste una cédula en blanco{/if}
    </h1>
    <p class="hero-subtitle">
      {#if ballotStatus === 'complete' && insights.isConcentrated}Tus cuatro elecciones al congreso sumaron al mismo partido. Tu voto presidencial es una elección separada y directa. Los escaños se reparten entre los partidos que superan la valla electoral.
      {:else if ballotStatus === 'complete' && insights.isFragmented}Tus decisiones se distribuyen entre varias fuerzas políticas. Los escaños en el Congreso se reparten entre quienes superan la valla electoral.
      {:else if ballotStatus === 'complete'}Tus decisiones se distribuyen entre los partidos que elegiste. Los escaños en el Congreso se reparten entre quienes superan la valla electoral.
      {:else if ballotStatus === 'partial'}Tus decisiones se distribuyen entre varias fuerzas políticas. Los escaños en el Congreso se reparten entre quienes superan la valla electoral.
      {:else}No marcaste ninguna de las elecciones de esta cédula. Por eso no hubo votos que procesar en presidencia ni en el Congreso.{/if}
    </p>
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
              <h3 class="reveal-card-title">Tus cuatro votos al Congreso fueron al mismo partido</h3>
              <p class="reveal-card-desc">Tu voto presidencial es directo e independiente. En el Congreso, tus cuatro votos válidos sumaron al mismo partido. Si supera la valla electoral, ese partido concentra más escaños.</p>
            </div>
          </article>
        {:else if insights.isFragmented}
          <article class="reveal-card reveal-card--fragmented">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="19" cy="18" r="2"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Tu voto se distribuyó entre {insights.uniqueParties} partidos distintos</h3>
              <p class="reveal-card-desc">Tus votos válidos se distribuyeron entre varios partidos. Cada uno que supere la valla electoral obtiene escaños proporcionales a sus votos.</p>
            </div>
          </article>
        {:else}
          <article class="reveal-card">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Repartiste el voto entre {insights.uniqueParties} partidos</h3>
              <p class="reveal-card-desc">Tus votos válidos sumaron a partidos distintos. Los escaños se reparten entre los que superen la valla electoral.</p>
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
              <p class="reveal-card-desc">Si tus partidos superan la valla electoral y obtienen escaños, tus números preferenciales aumentan las chances de esos candidatos de ocupar uno de esos escaños.</p>
            </div>
          </article>
        {:else if insights.hasAnyPreferences}
          <article class="reveal-card">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">Usaste el voto preferencial en algunas elecciones</h3>
              <p class="reveal-card-desc">Donde marcaste un número, ese candidato tiene más chances de ocupar un escaño si el partido supera la valla. Donde no marcaste, los escaños los definen los votos preferenciales de los demás electores.</p>
            </div>
          </article>
        {:else}
          <article class="reveal-card">
            <div class="reveal-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            </div>
            <div>
              <h3 class="reveal-card-title">No marcaste votos preferenciales</h3>
              <p class="reveal-card-desc">Tus votos válidos ayudan al partido a superar la valla electoral. Si lo logra y obtiene escaños, son los votos preferenciales de otros electores los que deciden qué candidatos entran.</p>
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
            <p class="reveal-card-desc">{insights.blankColumns.join(', ')} {insights.blankColumns.length === 1 ? 'no sumó votos en esa elección' : 'no sumaron votos en esas elecciones'}. Solo las decisiones marcadas entran al procesamiento de resultados.</p>
          </div>
        </article>
      {/if}
    </div>
  </section>
  {/if}

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
              {row.selection ? 'Válido' : 'En blanco'}
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
                <p class="fn-desc">Tu voto se suma como voto válido al partido que elegiste.</p>
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
                <p class="fn-desc">El partido necesita el 5% de los votos válidos para superar la valla electoral.</p>
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
                <p class="fn-label">Escaños</p>
                <p class="fn-desc">Si supera la valla, obtiene escaños proporcionales a sus votos.</p>
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
                <p class="fn-desc">Los escaños van a los candidatos con más votos preferenciales.</p>
                {#if senadoNac.prefs.length > 0}
                  <div class="fn-prefs-row">
                    {#each senadoNac.prefs as num}<span class="fn-pref-num">N° {num}</span>{/each}
                  </div>
                  <p class="fn-pref-note">Tu preferencia cuenta si el partido supera la valla electoral. Aumenta las chances de ese candidato de ocupar un escaño.</p>
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
          <p class="resumen-logic">
            Tu voto suma a {col.selection.partyName} como voto válido.
            Si supera la valla electoral, obtiene escaños en el Congreso.
            {#if col.prefs.length > 0}
              Tu N° {col.prefs.join(' y N° ')} le da más chances a {col.prefs.length === 1 ? 'ese candidato' : 'esos candidatos'} de ocupar uno de esos escaños.
            {:else}
              Los escaños van a los candidatos con más votos preferenciales de otros electores.
            {/if}
          </p>
        {:else}
          <p class="proc-blank-text">Esta sección quedó en blanco. No se sumó ningún voto en esta elección de la cédula.</p>
        {/if}
      </div>
    {/each}
  </section>

  <!-- ═══ CÓMO FUNCIONA EL CONTEO ═══════════════════════════════════════════ -->
  {#if ballotStatus !== 'blank'}
  <section class="how-it-works-sect" data-hiw-flow>
    <h2 class="section-label">Cómo se decide quién entra al Congreso</h2>

    <div class="flow-track-animated">

      {#if hiwStep >= 1}
        <div class="fn" in:fly={{ y: 12, duration: 380 }}>
          <div class="fn-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </div>
          <p class="fn-label">Votos válidos</p>
          <p class="fn-desc">Solo cuentan los votos marcados correctamente. Los nulos o viciados no suman a ningún partido — y reducen el total de votos válidos.</p>
        </div>
      {/if}

      {#if hiwStep >= 2}
        <div class="fn-arrow" in:fade={{ duration: 220 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
        <div class="fn" in:fly={{ y: 12, duration: 380 }}>
          <div class="fn-icon-wrap fi-partido">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </div>
          <p class="fn-label">Valla electoral</p>
          <p class="fn-desc">Un partido necesita al menos el 5% de los votos válidos. Si no lo alcanza, ninguno de sus candidatos entra al Congreso.</p>
        </div>
      {/if}

      {#if hiwStep >= 3}
        <div class="fn-arrow" in:fade={{ duration: 220 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
        <div class="fn" in:fly={{ y: 12, duration: 380 }}>
          <div class="fn-icon-wrap fi-puestos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </div>
          <p class="fn-label">Escaños</p>
          <p class="fn-desc">Los que superan la valla se reparten los escaños del Congreso proporcionalmente. Más votos válidos = más escaños.</p>
        </div>
      {/if}

      {#if hiwStep >= 4}
        <div class="fn-arrow" in:fade={{ duration: 220 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
        <div class="fn" in:fly={{ y: 12, duration: 380 }}>
          <div class="fn-icon-wrap fi-candidatos">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <p class="fn-label">Candidatos</p>
          <p class="fn-desc">Dentro de cada partido, los escaños van a los candidatos con más votos preferenciales. Si nadie marcó un número, entra el orden de lista.</p>
        </div>
      {/if}

    </div>

    <div class="hiw-example">
      <span class="hiw-example-label">Ejemplo ilustrativo</span>
      <p class="hiw-example-text">Imagina 150 votos en total. Si 50 son nulos o viciados, quedan 100 votos válidos — y la valla electoral es de 5 votos (5% de votos válidos). Si los votos nulos o viciados aumentaran y dejaran solo 80 votos válidos, la valla bajaría a 4 votos. Más votos en blanco o viciados = valla más baja.</p>
    </div>
  </section>
  {/if}

  <!-- ═══ VOTO EN BLANCO POR COLUMNA ════════════════════════════════════════ -->
  {#if insights.blankColumns.length > 0}
  <section class="blank-insight-sect">
    <div class="blank-insight-card">
      <div class="blank-insight-header">
        <svg class="blank-insight-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <h3 class="blank-insight-title">
          {insights.blankColumns.length === 1 ? 'Dejaste 1 decisión en blanco' : `Dejaste ${insights.blankColumns.length} decisiones en blanco`}
        </h3>
      </div>
      <ul class="blank-insight-list">
        <li>{insights.blankColumns.join(' y ')} {insights.blankColumns.length === 1 ? 'no sumó votos válidos' : 'no sumaron votos válidos'} — ese espacio no cuenta para ningún partido.</li>
        <li>Al reducirse los votos válidos en {insights.blankColumns.length === 1 ? 'esa elección' : 'esas elecciones'}, la valla electoral baja y puede ser más fácil de superar para los partidos que sí recibieron votos.</li>
      </ul>
    </div>
  </section>
  {/if}

  <!-- ═══ EXPLORA OTRO ESCENARIO ══════════════════════════════════════════ -->
  <section class="what-if-sect">
    <h2 class="section-label">Explora otro escenario</h2>

    <p class="what-if-intro">
      {#if insights.isConcentrated}Concentraste tus votos válidos en un partido. ¿Cómo cambia el reparto de escaños si los divides?
      {:else if insights.isFragmented}Distribuiste tus votos válidos entre varios partidos. ¿Cómo cambia el reparto de escaños si los concentras?
      {:else}Distribuiste tus votos válidos entre partidos distintos. ¿Cómo cambia el reparto de escaños si los concentras?{/if}
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
        <p class="what-if-result">Cuando los votos válidos se concentran en un partido, ese partido acumula más votos y puede obtener más escaños — siempre que supere la valla electoral.</p>
      </div>
    {:else}
      <div class="what-if-card">
        <p class="what-if-result">Cuando los votos válidos se reparten entre varios partidos, los escaños se distribuyen entre más fuerzas. Ningún partido domina solo — se necesitan acuerdos para gobernar.</p>
      </div>
    {/if}
  </section>

  <!-- ═══ SIMULAR DE NUEVO + FEEDBACK ══════════════════════════════════════ -->
  <section class="closing-sect">
    <p class="closing-invite">Ahora que viste cómo funciona tu voto, puedes probar distintas combinaciones y comparar resultados.</p>
    <button class="btn-primary" onclick={handleRestart} disabled={restarting}>
      {#if restarting}Preparando...
      {:else if ballotStatus === 'complete'}Probar otra combinación de voto
      {:else if ballotStatus === 'partial'}Probar otra combinación de voto
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
    background: #f8fafc !important;
    color: #0f172a;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .res-page {
    max-width: 860px;
    margin: 0 auto;
    padding: 0 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 56px;
    background: #f8fafc;
    min-height: 100dvh;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Entry veil
  ───────────────────────────────────────────────────────────────────────── */

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
    color: #0f172a;
    line-height: 1.15;
    margin: 0 0 14px;
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    font-size: 17px;
    color: #475569;
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
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
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
    color: #16a34a;
    border-color: rgba(22, 163, 74, 0.3);
    background: rgba(22, 163, 74, 0.07);
  }

  .chip-blank {
    color: #94a3b8;
    border-color: #e2e8f0;
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
    color: #0f172a;
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
    background: rgba(200, 16, 46, 0.08);
    border: 1px solid rgba(200, 16, 46, 0.2);
    border-radius: 99px;
    color: #C8102E;
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
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }

  .proc-card-title {
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 10px;
  }

  .proc-card-desc {
    font-size: 14px;
    color: #475569;
    margin: 0 0 16px;
    line-height: 1.6;
  }

  /* Presidential */
  .pres-selection-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
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
    color: #0f172a;
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
    align-items: stretch;
    gap: 8px;
  }

  .fn {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    flex: 1;
    min-width: 120px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .fn-icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: #f1f5f9;
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
    color: #0f172a;
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
    background: rgba(200, 16, 46, 0.08);
    border: 1px solid rgba(200, 16, 46, 0.2);
    border-radius: 99px;
    color: #C8102E;
  }

  .fn-no-pref {
    font-size: 10px;
    color: #cbd5e1;
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
    color: #cbd5e1;
    padding-top: 18px;
    flex-shrink: 0;
    align-self: flex-start;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Collapsed summary blocks (other legislative columns)
  ───────────────────────────────────────────────────────────────────────── */
  .bloque-resumen {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
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
    color: #0f172a;
  }

  .resumen-logic {
    font-size: 12px;
    color: #64748b;
    line-height: 1.55;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Preferential vote explainer
  ───────────────────────────────────────────────────────────────────────── */
  .pref-explainer-sect {
    padding: 0 0 8px;
  }

  .pref-explainer-card {
    background: rgba(99, 102, 241, 0.05);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .pref-explainer-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pref-explainer-icon {
    color: #818cf8;
    flex-shrink: 0;
  }

  .pref-explainer-title {
    font-size: 14px;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0;
  }

  .pref-rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pref-row {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .pref-row-top {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .pref-row-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
  }

  .pref-row-nums {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .pref-row-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  .pref-explainer-note {
    border-top: 1px solid rgba(99, 102, 241, 0.15);
    padding-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .pref-explainer-note p {
    font-size: 12px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  .pref-explainer-note strong {
    color: #94a3b8;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Blank vote insight
  ───────────────────────────────────────────────────────────────────────── */
  .blank-insight-card {
    background: rgba(251, 191, 36, 0.05);
    border: 1px solid rgba(217, 119, 6, 0.2);
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .blank-insight-header {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .blank-insight-icon {
    flex-shrink: 0;
    color: #fbbf24;
  }

  .blank-insight-title {
    font-size: 14px;
    font-weight: 700;
    color: #92400e;
    margin: 0;
    line-height: 1.3;
  }

  .blank-insight-body {
    font-size: 13px;
    color: #475569;
    line-height: 1.65;
    margin: 0;
  }

  .blank-insight-example {
    background: rgba(0, 0, 0, 0.04);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 2px;
  }

  .blank-insight-example-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin: 0;
  }

  .blank-insight-list {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .blank-insight-list li {
    font-size: 13px;
    color: #475569;
    line-height: 1.55;
  }

  .blank-insight-example-text {
    font-size: 12px;
    color: #64748b;
    line-height: 1.65;
    margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Ballot reveal (dynamic insights)
  ───────────────────────────────────────────────────────────────────────── */
  .reveal-cards {
    display: grid;
    gap: 12px;
  }

  .reveal-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px 18px;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .reveal-card--concentrated {
    border-color: rgba(59, 130, 246, 0.2);
    background: rgba(59, 130, 246, 0.04);
  }

  .reveal-card--fragmented {
    border-color: rgba(168, 85, 247, 0.2);
    background: rgba(168, 85, 247, 0.04);
  }

  .reveal-card--prefs {
    border-color: rgba(22, 163, 74, 0.2);
    background: rgba(22, 163, 74, 0.04);
  }

  .reveal-card--blank {
    border-color: #e2e8f0;
  }

  .reveal-card-icon {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    margin-top: 1px;
  }

  .reveal-card--concentrated .reveal-card-icon { color: #3b82f6; }
  .reveal-card--fragmented   .reveal-card-icon { color: #a855f7; }
  .reveal-card--prefs        .reveal-card-icon { color: #16a34a; }

  .reveal-card-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.35;
    margin: 0 0 6px;
  }

  .reveal-card-desc {
    font-size: 13px;
    color: #475569;
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
    color: #475569;
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
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #64748b;
    border-radius: 999px;
    padding: 9px 16px;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .what-if-btn.is-active {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
    font-weight: 600;
  }

  .what-if-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 20px;
  }

  .what-if-result {
    font-size: 13px;
    color: #475569;
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
    gap: 20px;
    padding-bottom: 16px;
  }

  .closing-invite {
    font-size: 15px;
    color: #475569;
    line-height: 1.6;
    margin: 0;
    text-align: center;
    max-width: 420px;
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
    color: #0f172a;
    margin: 0;
  }

  .feedback-sub {
    font-size: 13px;
    color: #64748b;
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
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
    font-family: inherit;
  }

  .btn-ghost:hover {
    border-color: #cbd5e1;
    color: #0f172a;
  }

  /* ─────────────────────────────────────────────────────────────────────────
     How it works
  ───────────────────────────────────────────────────────────────────────── */
  .how-it-works-sect {
    padding: 0 0 8px;
  }

  .hiw-chain {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .hiw-step {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .hiw-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .hiw-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .hiw-term {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }

  .hiw-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
  }

  .hiw-arrow {
    text-align: center;
    color: #cbd5e1;
    font-size: 18px;
    padding: 4px 0;
    line-height: 1;
  }

  .hiw-example {
    margin-top: 12px;
    background: rgba(59, 130, 246, 0.04);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 8px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .hiw-example-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #3b82f6;
  }

  .hiw-example-text {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin: 0;
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

  /* ── Desktop: bump gray text one stop darker for readability ──────────── */
  @media (min-width: 901px) {
    /* #475569 → #334155 */
    .hero-eyebrow,
    .hero-subtitle,
    .proc-card-desc,
    .blank-insight-body,
    .blank-insight-list li,
    .what-if-intro,
    .what-if-result,
    .closing-invite,
    .reveal-card-desc { color: #334155; }

    /* #64748b → #475569 */
    .fn-desc,
    .fn-pref-note,
    .resumen-logic,
    .pref-row-desc,
    .pref-explainer-note p,
    .blank-insight-example-label,
    .blank-insight-example-text,
    .feedback-sub,
    .hiw-desc,
    .hiw-example-text { color: #475569; }

    /* #94a3b8 → #64748b */
    .chip-blank,
    .pref-row-label,
    .pref-explainer-note strong { color: #64748b; }
  }

</style>
