<script lang="ts">
  import type { BallotRow } from '$lib/types';
  import { ui } from '$lib/stores/ui.svelte';
  import { nav } from '$lib/stores/navigation.svelte';
  import VoteMark from './VoteMark.svelte';
  import PreferenceVoteSlot from './PreferenceVoteSlot.svelte';
  import { preferencePickerConfig, getPreferenceConfigByColumnId, type ColumnKey } from '$lib/config/preferencePicker';
  import { 
    isRowSelected, 
    toggleSymbolSelection,
    getSelectedRow
  } from '$lib/stores/preferencePicker.svelte';

  interface Props {
    row: BallotRow;
    columnId: string;
    section: string;
  }

  let { row, columnId, section }: Props = $props();

  let isActive = $derived(ui.activeRow?.id === row.id);
  let isEvenRow = $derived(row.rowIndex % 2 === 0);

  // Obtener configuración de voto preferencial
  let preferenceConfig = $derived(getPreferenceConfigByColumnId(columnId));
  let columnKey = $derived(preferenceConfig?.columnKey as ColumnKey | undefined);
  
  // Verificar si esta fila está seleccionada en esta columna
  let isThisRowSelected = $derived(columnKey ? isRowSelected(columnKey, row.id) : false);
  
  // Verificar si hay otra fila seleccionada en esta columna
  let selectedRowInColumn = $derived(columnKey ? getSelectedRow(columnKey) : null);
  let hasOtherRowSelected = $derived(selectedRowInColumn !== null && selectedRowInColumn !== row.id);

  // Toggle selección de símbolo
  function handleSymbolClick() {
    if (!columnKey) return;
    toggleSymbolSelection(columnKey, row.id);
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
  class="ballot-row section-{section}"
  class:is-voted={isThisRowSelected}
  class:is-faded={hasOtherRowSelected}
  class:is-active={isActive}
  class:is-presidential={row.isPresidential}
  class:is-even={isEvenRow}
  style="--party-color: {row.partyColor}"
  role="button"
  tabindex="0"
  aria-label="Partido {row.partyName}, número {row.partyNumber}"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Celda 1: Nombre del partido -->
  <div class="cell name-cell">
    <span class="party-name">{row.partyName}</span>
  </div>

  <!-- Celda 2: Logo del partido (clickeable para votar) -->
  <div class="cell image-cell">
    <div class="image-frame vote-target" onclick={handleSymbolClick} role="button" tabindex="0" onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSymbolClick()}>
      {#if row.partySymbolUrl}
        <img src={row.partySymbolUrl} alt="Logo {row.partyAbbr}" />
      {:else}
        <span class="image-placeholder">{row.partyAbbr}</span>
      {/if}
      <!-- X mark when voted -->
      {#if isThisRowSelected}
        <div class="vote-x-overlay" aria-label="Votado">
          <VoteMark type="symbol" size={36} animate={false} color="#C8102E" />
        </div>
      {/if}
    </div>
  </div>

  {#if row.isPresidential}
    <!-- Celda 3 (Presidencial): Foto del candidato (clickeable para votar) -->
    <div class="cell image-cell">
      {#if row.presidentialPhoto}
        <div class="image-frame is-photo vote-target" onclick={handleSymbolClick} role="button" tabindex="0" onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSymbolClick()}>
          <img src={row.presidentialPhoto} alt={row.candidates[0]?.name || 'Candidato'} />
          <!-- X mark when voted -->
          {#if isThisRowSelected}
            <div class="vote-x-overlay" aria-label="Votado">
              <VoteMark type="symbol" size={36} animate={false} color="#C8102E" />
            </div>
          {/if}
        </div>
      {:else if row.candidates.length > 0}
        <div class="image-frame is-photo vote-target" style:background-color={row.candidates[0].avatarColor} onclick={handleSymbolClick} role="button" tabindex="0" onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSymbolClick()}>
          <span class="photo-text">FOTO</span>
          <!-- X mark when voted -->
          {#if isThisRowSelected}
            <div class="vote-x-overlay" aria-label="Votado">
              <VoteMark type="symbol" size={36} animate={false} color="#C8102E" />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <!-- Para columnas legislativas: casillas de voto preferencial funcionales -->
    {#if columnKey}
      {#if preferenceConfig && preferenceConfig.slots >= 1}
        <div class="cell vote-cell">
          <PreferenceVoteSlot
            {columnKey}
            rowId={row.id}
            slotIndex={0}
          />
        </div>
      {/if}
      
      {#if preferenceConfig && preferenceConfig.slots >= 2}
        <div class="cell vote-cell">
          <PreferenceVoteSlot
            {columnKey}
            rowId={row.id}
            slotIndex={1}
          />
        </div>
      {/if}
    {:else}
      <!-- Fallback: casillas vacías si no hay config -->
      <div class="cell vote-cell">
        <div class="vote-box"></div>
      </div>
    {/if}
  {/if}
</div>
{:else}
  <!-- Spacer row for Frepap alignment -->
  <div
    class="ballot-row is-spacer section-{section}"
    class:is-even={isEvenRow}
    class:is-faded={hasOtherRowSelected}
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
    border-bottom: 2px solid #FFFFFF;
    cursor: pointer;
    position: relative;
    /* Background set by section classes below */
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
  }

  /* ─── Section Background Colors — Security Micro-Pattern ────────────────────── */
  /* Base color + diagonal crossed lines pattern overlay */
  .ballot-row.section-presidente {
    background-color: var(--col-presidente-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.section-senadores-nacional {
    background-color: var(--col-senadores-nacional-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.section-senadores-regional {
    background-color: var(--col-senadores-regional-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.section-diputados {
    background-color: var(--col-diputados-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.section-parlamento-andino {
    background-color: var(--col-parlamento-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  /* Presidential: 3 columns only (Party Name + Logo + Photo) - no number */
  .ballot-row.is-presidential {
    grid-template-columns: 1fr var(--col-logo-width, 56px) var(--col-photo-width, 56px);
  }

  /* Alternating row backgrounds - subtle brightness adjustment */
  .ballot-row.is-even {
    filter: brightness(0.985);
  }

  /* Hover state - preserve pattern with overlay blend */
  .ballot-row:hover:not(.is-faded) {
    filter: brightness(0.97);
  }

  /* Active/Focus state - stronger darkening */
  .ballot-row.is-active {
    filter: brightness(0.94);
  }

  /* Faded state (other row selected in column) */
  .ballot-row.is-faded {
    filter: brightness(0.6);
    pointer-events: none;
  }

  /* ─── Cells ──────────────────────────────────────────────────────────────────── */
  .cell {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 6px;
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
    border: 1px solid var(--text-primary);
    background-color: #FFFFFF !important;
    background-image: none !important;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }

  .ballot-row:hover .vote-box {
    border-color: var(--text-primary);
    background-color: #FFFFFF !important;
    background-image: none !important;
  }

  /* Empty cell for Senadores Regional - just space, no content */
  .vote-cell.empty {
    background: transparent;
  }

  /* ─── Vote Target — Clickable images for voting ─────────────────────────────── */
  .vote-target {
    cursor: pointer;
    position: relative;
    transition: transform 0.1s ease, box-shadow 0.2s ease;
  }

  .vote-target:hover {
    transform: scale(1.02);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }

  .vote-target:active {
    transform: scale(0.98);
  }

  /* X mark overlay on voted images */
  .vote-x-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.4);
    pointer-events: none;
    z-index: 20;
  }

  .vote-x-overlay :global(svg) {
    filter: drop-shadow(0 2px 6px rgba(200, 16, 46, 0.5));
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
  }

  /* Spacers use same section colors and pattern as regular rows */
  .ballot-row.is-spacer.section-presidente {
    background-color: var(--col-presidente-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.is-spacer.section-senadores-nacional {
    background-color: var(--col-senadores-nacional-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.is-spacer.section-senadores-regional {
    background-color: var(--col-senadores-regional-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.is-spacer.section-diputados {
    background-color: var(--col-diputados-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  .ballot-row.is-spacer.section-parlamento-andino {
    background-color: var(--col-parlamento-base);
    background-image: var(--security-micro-pattern);
    background-repeat: repeat;
  }

  /* Even spacer rows - slight darkening with filter */
  .ballot-row.is-spacer.is-even {
    filter: brightness(0.985);
  }

  .spacer-content {
    flex: 1;
    height: 100%;
    grid-column: 1 / -1;
  }
</style>
