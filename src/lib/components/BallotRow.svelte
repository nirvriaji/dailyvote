<script lang="ts">
  import type { BallotRow } from '$lib/types';
  import { ui } from '$lib/stores/ui.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { nav } from '$lib/stores/navigation.svelte';
  import VoteMark from './VoteMark.svelte';

  interface Props {
    row: BallotRow;
    columnId: string;
    section: string;
  }

  let { row, columnId, section }: Props = $props();

  let currentVote = $derived(vote.getVote(columnId));
  let isThisRowVoted = $derived(currentVote?.rowId === row.id);
  let columnHasOtherVote = $derived(vote.hasVoted(columnId) && !isThisRowVoted);
  let isActive = $derived(ui.activeRow?.id === row.id);

  let isEvenRow = $derived(row.rowIndex % 2 === 0);

  function handleTap() {
    ui.selectRow(row);
  }

  function handleMouseEnter() {
    nav.setHoveredRow(row.rowIndex, section);
  }

  function handleMouseLeave() {
    nav.clearHoveredRow();
  }
</script>

{#if row.partyName}
<div
  class="ballot-row"
  class:is-voted={isThisRowVoted}
  class:is-faded={columnHasOtherVote}
  class:is-active={isActive}
  class:is-presidential={row.isPresidential}
  class:is-even={isEvenRow}
  style="--party-color: {row.partyColor}"
  role="button"
  tabindex="0"
  aria-label="Partido {row.partyName}, número {row.partyNumber}"
  onclick={handleTap}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleTap()}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Celda 1: Nombre del partido -->
  <div class="cell name-cell">
    <span class="party-name">{row.partyName}</span>
  </div>

  <!-- Celda 2: Logo del partido -->
  <div class="cell image-cell">
    <div class="image-frame">
      {#if row.partySymbolUrl}
        <img src={row.partySymbolUrl} alt="Logo {row.partyAbbr}" />
      {:else}
        <span class="image-placeholder">{row.partyAbbr}</span>
      {/if}
    </div>
  </div>

  {#if row.isPresidential}
    <!-- Celda 3 (Presidencial): Foto del candidato -->
    <div class="cell image-cell">
      {#if row.presidentialPhoto}
        <div class="image-frame is-photo">
          <img src={row.presidentialPhoto} alt={row.candidates[0]?.name || 'Candidato'} />
        </div>
      {:else if row.candidates.length > 0}
        <div class="image-frame is-photo" style:background-color={row.candidates[0].avatarColor}>
          <span class="photo-text">FOTO</span>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Celdas 3-4 (Legislativas): Casillas de votación -->
    <div class="cell vote-cell">
      <div class="vote-box"></div>
    </div>
    <div class="cell vote-cell">
      <div class="vote-box"></div>
    </div>
  {/if}

  <!-- Marca de voto -->
  {#if isThisRowVoted && currentVote}
    <div class="vote-indicator" aria-label="Voto registrado">
      <VoteMark type={currentVote.zoneType} size={28} animate={false} />
    </div>
  {/if}
</div>
{:else}
  <!-- Spacer row for Frepap alignment -->
  <div
    class="ballot-row is-spacer"
    class:is-even={isEvenRow}
    aria-label="Espacio reservado"
  >
    <div class="spacer-content"></div>
  </div>
{/if}

<style>
  /* ─── Row Container — Grid Layout — Official Ballot Style ───────────────────── */
  .ballot-row {
    display: grid;
    align-items: center;
    /* Default (Legislativo): Party Name | Logo | Vote 1 | Vote 2 */
    grid-template-columns: 1fr var(--col-logo-width, 56px) var(--col-vote-width, 52px) var(--col-vote-width, 52px);
    height: var(--row-height, 56px);
    border-bottom: 1px solid var(--grid-border-light);
    cursor: pointer;
    position: relative;
    background: transparent;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
  }

  /* Presidential: 3 columns only (Party Name + Logo + Photo) - no number */
  .ballot-row.is-presidential {
    grid-template-columns: 1fr var(--col-logo-width, 56px) var(--col-photo-width, 56px);
  }

  /* Alternating row backgrounds - subtle */
  .ballot-row.is-even {
    background: rgba(0, 0, 0, 0.015);
  }

  .ballot-row:last-child {
    border-bottom: 1px solid var(--grid-border);
  }

  /* Hover state */
  .ballot-row:hover:not(.is-faded) {
    background: rgba(207, 232, 243, 0.25);
  }

  /* Active/Focus state */
  .ballot-row.is-active {
    background: var(--sky-blue-light);
  }

  /* Voted state */
  .ballot-row.is-voted {
    background: var(--accent-light);
  }

  /* Faded state (other row selected in column) */
  .ballot-row.is-faded {
    opacity: 0.35;
    pointer-events: none;
  }

  /* ─── Cells ──────────────────────────────────────────────────────────────────── */
  .cell {
    display: flex;
    align-items: center;
    height: 100%;
    border-right: 1px solid var(--grid-border-light);
    padding: 0 6px;
  }

  .cell:last-child {
    border-right: none;
  }

  /* ─── Party Name Cell — All Caps ─────────────────────────────────────────────── */
  .name-cell {
    padding-left: 10px;
    padding-right: 8px;
    overflow: hidden;
  }

  .party-name {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .image-cell {
    justify-content: center;
    padding: 4px;
  }

  /* Placeholder text for missing images */
  .image-placeholder {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.02em;
  }

  /* Photo placeholder styling */
  .photo-text {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 8px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.04em;
  }

  /* ─── Vote Cell — Square Box ─────────────────────────────────────────────────── */
  .vote-cell {
    justify-content: center;
    padding: 4px;
  }

  .vote-box {
    width: 44px;
    height: 44px;
    border: 1px solid var(--grid-border);
    background: white;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .ballot-row:hover .vote-box {
    border-color: var(--sky-blue-dark);
    background: var(--sky-blue-light);
  }

  /* ─── Vote Indicator ──────────────────────────────────────────────────────────── */
  .vote-indicator {
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 5;
    pointer-events: none;
  }

  /* ─── Spacer row for Frepap alignment ────────────────────────────────────────── */
  .ballot-row.is-spacer {
    cursor: default;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.02);
  }

  .ballot-row.is-spacer.is-even {
    background: rgba(0, 0, 0, 0.03);
  }

  .spacer-content {
    flex: 1;
    height: 100%;
    grid-column: 1 / -1;
  }
</style>
