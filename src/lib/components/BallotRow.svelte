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
  <div class="cell logo-cell">
    <div class="logo-box">
      <span class="logo-text">{row.partyAbbr}</span>
    </div>
  </div>

  {#if row.isPresidential}
    <!-- Celda 3 (Presidencial): Foto del candidato -->
    <div class="cell photo-cell">
      {#if row.candidates.length > 0}
        <div class="candidate-photo" style:background-color={row.candidates[0].avatarColor}>
          <span class="photo-text">FOTO</span>
        </div>
      {/if}
    </div>
    <!-- Celda 4 (Presidencial): Vacía -->
    <div class="cell empty-cell"></div>
  {:else}
    <!-- Celdas 3-4 (Legislativas): Casillas de votación sutiles -->
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

<style>
  /* ─── Row Container ──────────────────────────────────────────────────────────── */
  .ballot-row {
    display: grid;
    align-items: center;
    grid-template-columns: minmax(200px, 1fr) 80px 80px 80px;
    column-gap: 8px;
    padding: 0 16px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    cursor: pointer;
    position: relative;
    background: transparent;
    text-align: left;
    width: 100%;
    height: 88px;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.12s ease;
    
    /* Party color accent: subtle left border */
    border-left: 3px solid transparent;
  }

  /* Alternating row backgrounds - subtle */
  .ballot-row.is-even {
    background: rgba(0, 0, 0, 0.02);
  }

  .ballot-row:last-child {
    border-bottom: none;
  }

  /* Hover state - big tech pattern */
  .ballot-row:hover:not(.is-faded) {
    background: rgba(0, 0, 0, 0.03);
  }

  /* Active/Focus state */
  .ballot-row.is-active {
    background: rgba(0, 0, 0, 0.04);
    border-left-color: var(--party-color);
  }

  /* Voted state */
  .ballot-row.is-voted {
    background: rgba(200, 16, 46, 0.06);
    border-left-color: var(--party-color);
  }

  /* Faded state (other row selected in column) */
  .ballot-row.is-faded {
    opacity: 0.4;
    pointer-events: none;
  }

  /* ─── Cells ──────────────────────────────────────────────────────────────────── */
  .cell {
    display: flex;
    align-items: center;
    height: 100%;
  }

  /* ─── Party Name - Primary Focus ─────────────────────────────────────────────── */
  .name-cell {
    overflow: hidden;
    padding-right: 4px;
  }

  .party-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.1;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  /* ─── Logo Box - Minimal, no shadow ─────────────────────────────────────────── */
  .logo-cell {
    justify-content: center;
  }

  .logo-box {
    width: 64px;
    height: 64px;
    border: 1.5px solid rgba(0, 0, 0, 0.15);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }

  .logo-text {
    font-size: 14px;
    font-weight: 800;
    color: var(--text-secondary);
    letter-spacing: 0.01em;
  }

  /* ─── Photo Cell (Presidential) ──────────────────────────────────────────────── */
  .photo-cell {
    justify-content: center;
  }

  .candidate-photo {
    width: 64px;
    height: 64px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .photo-text {
    font-size: 9px;
    font-weight: 700;
    color: white;
    letter-spacing: 0.04em;
  }

  /* ─── Empty Cell ─────────────────────────────────────────────────────────────── */
  .empty-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  /* ─── Vote Boxes - Subtle by default ─────────────────────────────────────────── */
  .vote-cell {
    justify-content: center;
  }

  .vote-box {
    width: 64px;
    height: 64px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 2px;
    background: transparent;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .ballot-row:hover .vote-box {
    border-color: rgba(0, 0, 0, 0.3);
    background: rgba(255, 255, 255, 0.5);
  }

  /* ─── Vote Indicator ─────────────────────────────────────────────────────────── */
  .vote-indicator {
    position: absolute;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    pointer-events: none;
    z-index: 1;
  }

  .ballot-row:not(.is-presidential) .vote-indicator {
    right: 28px;
  }
</style>
