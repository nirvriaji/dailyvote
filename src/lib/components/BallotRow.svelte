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
    getSelectedRow,
    togglePresidentSymbol,
    togglePresidentPhoto,
    isPresidentSymbolSelected,
    isPresidentPhotoSelected,
    isPresidentRowActive,
    hasOtherPresidentRowSelected,
    castVoteFromSelection,
    removeVote
  } from '$lib/stores/preferencePicker.svelte';
  import { vote } from '$lib/stores/vote.svelte';

  interface Props {
    row: BallotRow;
    columnId: string;
    section: string;
    rowIndex?: number;
  }

  let { row, columnId, section, rowIndex = row.rowIndex }: Props = $props();

  let isActive = $derived(ui.activeRow?.id === row.id);
  let isEvenRow = $derived(row.rowIndex % 2 === 0);

  // Obtener configuración de voto preferencial
  let preferenceConfig = $derived(getPreferenceConfigByColumnId(columnId));
  let columnKey = $derived(preferenceConfig?.columnKey as ColumnKey | undefined);
  
  // Verificar si hay otra fila seleccionada en esta columna (legislativa) o en presidentes
  let selectedRowInColumn = $derived(columnKey ? getSelectedRow(columnKey) : null);
  let hasOtherLegislativeRowSelected = $derived(selectedRowInColumn !== null && selectedRowInColumn !== row.id);
  let hasOtherPresidentRow = $derived(row.isPresidential ? hasOtherPresidentRowSelected(row.id) : false);
  let hasOtherRowSelected = $derived(hasOtherLegislativeRowSelected || hasOtherPresidentRow);

  // Helper to check if a string is an emoji (simplified)
  function isEmoji(str: string): boolean {
    if (!str) return false;
    // If it's a URL (contains http or /), it's not an emoji
    if (str.includes('http') || str.includes('/')) return false;
    // If it's longer than 5 chars, probably not a single emoji
    if (str.length > 5) return false;
    return true;
  }

  // Toggle selección de símbolo (para columnas legislativas)
  function handleSymbolClick() {
    if (!columnKey) return;
    
    const isCurrentlySelected = isRowSelected(columnKey, row.id);
    
    if (isCurrentlySelected) {
      // Deseleccionar: remover voto
      toggleSymbolSelection(columnKey, row.id);
      removeVote(columnKey);
    } else {
      // Seleccionar: guardar voto
      toggleSymbolSelection(columnKey, row.id);
      castVoteFromSelection(
        columnKey,
        row.id,
        {
          partyName: row.partyName,
          partyNumber: row.partyNumber,
          partyColor: row.partyColor
        },
        'symbol',
        'Símbolo del partido'
      );
    }
  }

  // Toggle selección de símbolo del presidente (independiente)
  function handlePresidentSymbolClick() {
    const wasSelected = isPresidentSymbolSelected(row.id);
    togglePresidentSymbol(row.id);
    
    // Si se acaba de marcar (no estaba seleccionado antes), guardar voto
    if (!wasSelected) {
      castVoteFromSelection(
        'presidente',
        row.id,
        {
          partyName: row.partyName,
          partyNumber: row.partyNumber,
          partyColor: row.partyColor
        },
        'symbol',
        'Símbolo del partido'
      );
    }
  }

  // Toggle selección de foto del presidente (independiente)
  function handlePresidentPhotoClick() {
    const wasSelected = isPresidentPhotoSelected(row.id);
    togglePresidentPhoto(row.id);
    
    // Si se acaba de marcar (no estaba seleccionado antes), guardar voto
    if (!wasSelected) {
      castVoteFromSelection(
        'presidente',
        row.id,
        {
          partyName: row.partyName,
          partyNumber: row.partyNumber,
          partyColor: row.partyColor
        },
        'photo',
        'Foto del candidato'
      );
    }
  }

  // Para presidente: verificar si símbolo o foto están marcados
  let isPresidentSymbolMarked = $derived(isPresidentSymbolSelected(row.id));
  let isPresidentPhotoMarked = $derived(isPresidentPhotoSelected(row.id));
  let isPresidentRowSelected = $derived(isPresidentRowActive(row.id));

  // Para columnas legislativas: fila seleccionada completa
  let isLegislativeRowSelected = $derived(columnKey && columnKey !== 'presidente' ? isRowSelected(columnKey, row.id) : false);
  
  // Verificar si esta fila está seleccionada (para sombreado)
  let isThisRowSelected = $derived(row.isPresidential ? isPresidentRowSelected : isLegislativeRowSelected);

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
  data-demo="row-{section}-{rowIndex}"
>
  <!-- Celda 1: Nombre del partido -->
  <div class="cell name-cell">
    <span class="party-name">{row.partyName}</span>
  </div>

  <!-- Celda 2: Logo del partido (clickeable para votar) -->
  <div class="cell image-cell">
    {#if row.isPresidential}
      <!-- Para presidente: símbolo clickeable independientemente -->
      <div 
        class="image-frame vote-target" 
        data-demo="simbolo-{section}-{rowIndex}"
        onclick={handlePresidentSymbolClick} 
        role="button" 
        tabindex="0" 
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handlePresidentSymbolClick()}
      >
        {#if row.partySymbol}
          <span class="party-symbol-emoji">{row.partySymbol}</span>
        {:else if row.partySymbolUrl}
          <img src={row.partySymbolUrl} alt="Logo {row.partyAbbr}" />
        {:else}
          <span class="image-placeholder">{row.partyAbbr}</span>
        {/if}
        <!-- X mark when symbol selected -->
        {#if isPresidentSymbolMarked}
          <div class="vote-x-overlay" aria-label="Símbolo seleccionado">
            <VoteMark type="symbol" size={36} animate={false} color="#C8102E" />
          </div>
        {/if}
      </div>
    {:else}
      <!-- Para columnas legislativas: símbolo selecciona la fila -->
      <div 
        class="image-frame vote-target" 
        data-demo="simbolo-{section}-{rowIndex}"
        onclick={handleSymbolClick} 
        role="button" 
        tabindex="0" 
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSymbolClick()}
      >
        {#if row.partySymbol}
          <span class="party-symbol-emoji">{row.partySymbol}</span>
        {:else if row.partySymbolUrl}
          <img src={row.partySymbolUrl} alt="Logo {row.partyAbbr}" />
        {:else}
          <span class="image-placeholder">{row.partyAbbr}</span>
        {/if}
        <!-- X mark when row selected -->
        {#if isLegislativeRowSelected}
          <div class="vote-x-overlay" aria-label="Votado">
            <VoteMark type="symbol" size={36} animate={false} color="#C8102E" />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if row.isPresidential}
    <!-- Celda 3 (Presidencial): Foto del candidato clickeable independientemente -->
    <div class="cell image-cell">
      {#if row.presidentialPhoto}
        <div 
          class="image-frame is-photo vote-target" 
          data-demo="foto-{section}-{rowIndex}"
          onclick={handlePresidentPhotoClick} 
          role="button" 
          tabindex="0" 
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handlePresidentPhotoClick()}
        >
          {#if isEmoji(row.presidentialPhoto)}
            <span class="candidate-photo-emoji">{row.presidentialPhoto}</span>
          {:else}
            <img src={row.presidentialPhoto} alt={row.candidates[0]?.name || 'Candidato'} />
          {/if}
          <!-- X mark when photo selected -->
          {#if isPresidentPhotoMarked}
            <div class="vote-x-overlay" aria-label="Foto seleccionada">
              <VoteMark type="symbol" size={36} animate={false} color="#C8102E" />
            </div>
          {/if}
        </div>
      {:else if row.candidates.length > 0}
        <div 
          class="image-frame is-photo vote-target" 
          data-demo="foto-{section}-{rowIndex}"
          style:background-color={row.candidates[0].avatarColor} 
          onclick={handlePresidentPhotoClick} 
          role="button" 
          tabindex="0" 
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handlePresidentPhotoClick()}
        >
          <span class="photo-text">FOTO</span>
          <!-- X mark when photo selected -->
          {#if isPresidentPhotoMarked}
            <div class="vote-x-overlay" aria-label="Foto seleccionada">
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
        <div class="cell vote-cell" data-demo="preferencial-{section}-{rowIndex}-0">
          <PreferenceVoteSlot
            {columnKey}
            rowId={row.id}
            slotIndex={0}
            partyName={row.partyName}
            partyNumber={row.partyNumber}
            partyColor={row.partyColor}
          />
        </div>
      {/if}

      {#if preferenceConfig && preferenceConfig.slots >= 2}
        <div class="cell vote-cell" data-demo="preferencial-{section}-{rowIndex}-1">
          <PreferenceVoteSlot
            {columnKey}
            rowId={row.id}
            slotIndex={1}
            partyName={row.partyName}
            partyNumber={row.partyNumber}
            partyColor={row.partyColor}
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
    /* Legislative: Party Name | Logo | Vote 1 | Vote 2 */
    grid-template-columns: 1fr var(--col-logo-width, 56px) 56px 56px;
    column-gap: 4px;
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

  /* Selected row state - subtle highlight */
  .ballot-row.is-voted {
    filter: brightness(0.92);
    box-shadow: inset 3px 0 0 0 rgba(0, 0, 0, 0.4);
  }

  /* Active/Focus state - subtle */
  .ballot-row.is-active {
    filter: brightness(0.95);
  }

  /* Faded state (other row selected in column) - still visible but muted */
  .ballot-row.is-faded {
    filter: brightness(0.85) saturate(0.7);
    opacity: 0.8;
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

  /* ─── Vote Cell — Same as image cell ──────────────────────────────────────────── */
  .vote-cell {
    justify-content: center;
    padding: 4px;
    display: flex;
    gap: 16px;
  }

  .vote-box {
    width: 48px;
    height: 48px;
    border: 2px solid #000000;
    border-radius: 0;
    background-color: #ffffff;
    box-sizing: border-box;
  }

  .ballot-row:hover .vote-box {
    background-color: #f5f5f5;
  }

  /* Empty cell for Senadores Regional - just space, no content */
  .vote-cell.empty {
    background: transparent;
  }

  /* ─── Vote Target — Clickable images for voting ─────────────────────────────── */
  .vote-target {
    cursor: pointer;
    position: relative;
    /* Sin efectos modernos - estilo cédula rígida */
    transition: none;
  }

  .vote-target:hover {
    /* Sin scale ni shadow - solo ligero brillo */
    filter: brightness(0.95);
  }

  .vote-target:active {
    /* Sin scale */
    filter: brightness(0.9);
  }

  /* X mark overlay on voted images - estilo neutral */
  .vote-x-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.3);
    pointer-events: none;
    z-index: 20;
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

  /* ─── Emoji Styles for Demo Mode ───────────────────────────────────────────── */
  .party-symbol-emoji {
    font-size: 28px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .candidate-photo-emoji {
    font-size: 32px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
