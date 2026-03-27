<script lang="ts">
  import { nav, COLUMN_COUNT } from '$lib/stores/navigation.svelte';
  import { vote } from '$lib/stores/vote.svelte';

  const FULL_TITLES = [
    'Presidente y Vicepresidentes',
    'Senadores Nacionales',
    'Senadores Regionales',
    'Diputados',
    'Parlamento Andino',
  ];
  const COL_IDS = ['col0', 'col1', 'col2', 'col3', 'col4'];
</script>

<!--
  Pill minimap — each column is a narrow rect that expands when active.
  Voted columns get a subtle accent treatment.
-->
<nav class="minimap" aria-label="Columnas de la cédula">
  {#each Array(COLUMN_COUNT) as _, i}
    {@const isActive = nav.column === i}
    {@const hasVote = vote.hasVoted(COL_IDS[i])}
    <button
      class="pill"
      class:active={isActive}
      class:voted={hasVote}
      onclick={() => nav.goTo(i)}
      title={FULL_TITLES[i]}
      aria-label="{FULL_TITLES[i]}{hasVote ? ' — votado' : ''}"
      aria-current={isActive ? 'true' : undefined}
    >
      {#if isActive}
        <span class="pill-label" aria-hidden="true">{i + 1}</span>
      {/if}
      {#if hasVote && !isActive}
        <!-- Tiny accent dot for voted-but-not-active columns -->
        <span class="vote-dot" aria-hidden="true"></span>
      {/if}
    </button>
  {/each}
</nav>

<style>
  .minimap {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pill {
    position: relative;
    height: 6px;
    width: 6px;
    border-radius: 3px;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    padding: 0;
    transition: width 0.28s cubic-bezier(0.34, 1.1, 0.64, 1),
                background 0.2s ease,
                border-radius 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    /* Increase tap target without affecting layout */
    outline-offset: 6px;
  }

  /* Hover: slightly brighter */
  .pill:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  /* Active: wider pill showing column number */
  .pill.active {
    width: 28px;
    height: 20px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.95);
  }

  /* Voted + active: accent tint */
  .pill.voted.active {
    background: white;
    box-shadow: 0 0 0 1.5px var(--accent-light);
  }

  /* Voted + idle: accent color */
  .pill.voted:not(.active) {
    background: var(--accent);
    opacity: 0.85;
  }

  .pill-label {
    font-size: 10px;
    font-weight: 800;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.01em;
  }

  /* Tiny dot inside voted idle pills */
  .vote-dot {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
