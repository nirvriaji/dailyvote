<script lang="ts">
  import type { VoteZoneType } from '$lib/types';
  import { ui } from '$lib/stores/ui.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { nav } from '$lib/stores/navigation.svelte';

  let row       = $derived(ui.activeRow);
  let visible   = $derived(row !== null);
  let columnId  = $derived(`col${nav.column}`);
  let existing  = $derived(vote.getVote(columnId));
  let isConflict = $derived(existing !== undefined && existing.rowId !== row?.id);
  let isLegislative = $derived(nav.column > 0); // Columnas 2,3,4,5 son legislativas
  
  // Number picker state for legislative columns
  let firstDigit = $state(0);
  let secondDigit = $state(0);

  function castVote(zoneId: string, zoneType: VoteZoneType, zoneLabel: string) {
    if (!row) return;
    vote.cast({
      columnId,
      rowId:       row.id,
      partyName:   row.partyName,
      partyNumber: row.partyNumber,
      partyColor:  row.partyColor,
      zoneId,
      zoneType,
      zoneLabel,
    });
    ui.closeOverlay();
  }

  function castVoteWithNumber() {
    if (!row) return;
    const candidateNumber = firstDigit * 10 + secondDigit;
    // Cast symbol vote
    const symbolZone = row.voteZones.find(z => z.type === 'symbol');
    if (symbolZone) {
      vote.cast({
        columnId,
        rowId:       row.id,
        partyName:   row.partyName,
        partyNumber: row.partyNumber,
        partyColor:  row.partyColor,
        zoneId:      symbolZone.id,
        zoneType:    symbolZone.type,
        zoneLabel:   symbolZone.label,
      });
    }
    // Cast number vote with selected candidate number
    const numberZone = row.voteZones.find(z => z.type === 'number');
    if (numberZone) {
      vote.cast({
        columnId,
        rowId:       row.id,
        partyName:   row.partyName,
        partyNumber: row.partyNumber,
        partyColor:  row.partyColor,
        zoneId:      numberZone.id,
        zoneType:    numberZone.type,
        zoneLabel:   `${numberZone.label}: ${candidateNumber}`,
      });
    }
    ui.closeOverlay();
  }

  function clearVote() {
    vote.remove(columnId);
    ui.closeOverlay();
  }

  function handleDigitScroll(digit: 'first' | 'second', direction: 'up' | 'down') {
    if (digit === 'first') {
      firstDigit = direction === 'up' 
        ? (firstDigit + 1) % 10 
        : (firstDigit - 1 + 10) % 10;
    } else {
      secondDigit = direction === 'up' 
        ? (secondDigit + 1) % 10 
        : (secondDigit - 1 + 10) % 10;
    }
  }
</script>

<!-- Backdrop -->
{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={() => ui.closeOverlay()} aria-hidden="true"></div>
{/if}

<!-- Bottom sheet -->
<div
  class="sheet"
  class:visible
  role="dialog"
  aria-modal="true"
  aria-label="Opciones de voto"
  aria-hidden={!visible}
>
  {#if row}
    <div class="handle" aria-hidden="true"></div>

    <!-- Header -->
    <div class="sheet-head">
      <div class="swatch" style:background={row.partyColor} aria-hidden="true">
        <span class="swatch-num">{row.partyNumber}</span>
      </div>
      <div class="sheet-info">
        <p class="sheet-party">{row.partyName}</p>
        {#if isConflict && existing}
          <p class="sheet-sub conflict">Ya votaste por <strong>{existing.partyName}</strong>. Selecciona para cambiar.</p>
        {:else if existing?.rowId === row.id}
          <p class="sheet-sub ok">Ya marcaste este partido aquí.</p>
        {:else}
          <p class="sheet-sub">Elige cómo marcar tu voto</p>
        {/if}
      </div>
      <button class="close-btn" onclick={() => ui.closeOverlay()} aria-label="Cerrar">✕</button>
    </div>

    <!-- Zone cards — individual options AND both option -->
    <div class="zone-cards">
      {#each row.voteZones as zone (zone.id)}
        <button
          class="zone-card"
          onclick={() => castVote(zone.id, zone.type, zone.label)}
          aria-label={zone.description}
          style:--pc={row.partyColor}
        >
          <div class="preview">
            <div class="preview-badge" style:background={row.partyColor}>
              <span>{row.partyNumber}</span>
            </div>
            <div class="preview-zones">
              {#each row.voteZones as z}
                <div class="pz" class:pz-on={z.id === zone.id}>
                  {#if z.id === zone.id}
                    <svg class="pz-x" viewBox="0 0 16 16" aria-hidden="true">
                      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5"
                            stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5"
                            stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
          <div class="zone-info">
            <span class="zone-title">{zone.label}</span>
            <span class="zone-desc">{zone.description}</span>
          </div>
          <span class="zone-cta" aria-hidden="true">→</span>
        </button>
      {/each}
      
      <!-- Third option: Mark both/all zones -->
      {#if row.voteZones.length > 1}
        {#if isLegislative}
          <!-- Legislative columns: Number picker -->
          <div class="zone-card number-picker-card" style:--pc={row.partyColor}>
            <div class="zone-info">
              <span class="zone-title">Marcar símbolo + número</span>
              <span class="zone-desc">Selecciona el número de candidato</span>
            </div>
            
            <div class="number-picker">
              <div class="digit-container">
                <button 
                  class="digit-scroll digit-up" 
                  onclick={() => handleDigitScroll('first', 'up')}
                  aria-label="Aumentar primer dígito"
                >▲</button>
                <span class="digit-display">{firstDigit}</span>
                <button 
                  class="digit-scroll digit-down" 
                  onclick={() => handleDigitScroll('first', 'down')}
                  aria-label="Disminuir primer dígito"
                >▼</button>
              </div>
              <div class="digit-container">
                <button 
                  class="digit-scroll digit-up" 
                  onclick={() => handleDigitScroll('second', 'up')}
                  aria-label="Aumentar segundo dígito"
                >▲</button>
                <span class="digit-display">{secondDigit}</span>
                <button 
                  class="digit-scroll digit-down" 
                  onclick={() => handleDigitScroll('second', 'down')}
                  aria-label="Disminuir segundo dígito"
                >▼</button>
              </div>
            </div>
            
            <button 
              class="confirm-number-btn" 
              onclick={castVoteWithNumber}
              aria-label="Confirmar voto con número {firstDigit}{secondDigit}"
            >
              →
            </button>
          </div>
        {:else}
          <!-- Presidential column: Standard button -->
          <button
            class="zone-card"
            onclick={() => {
              row.voteZones.forEach((z, i) => {
                setTimeout(() => castVote(z.id, z.type, z.label), i * 100);
              });
            }}
            aria-label="Marcar ambas opciones"
            style:--pc={row.partyColor}
          >
            <div class="preview">
              <div class="preview-badge" style:background={row.partyColor}>
                <span>{row.partyNumber}</span>
              </div>
              <div class="preview-zones">
                {#each row.voteZones as z}
                  <div class="pz pz-on">
                    <svg class="pz-x" viewBox="0 0 16 16" aria-hidden="true">
                      <line x1="3.5" y1="3.5" x2="12.5" y2="12.5"
                            stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                      <line x1="12.5" y1="3.5" x2="3.5" y2="12.5"
                            stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                  </div>
                {/each}
              </div>
            </div>
            <div class="zone-info">
              <span class="zone-title">Marcar ambos</span>
              <span class="zone-desc">Selecciona todas las opciones disponibles</span>
            </div>
            <span class="zone-cta" aria-hidden="true">→</span>
          </button>
        {/if}
      {/if}
    </div>

    <!-- Clear vote link (shown when this row is already voted) -->
    {#if existing?.rowId === row.id}
      <div class="sheet-footer">
        <button class="clear-btn" onclick={clearVote}>Quitar voto en esta sección</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* ─── Backdrop ─────────────────────────────────────────────────────────────── */
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    animation: fade-in 0.18s ease;
  }
  @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }

  /* ─── Sheet ────────────────────────────────────────────────────────────────── */
  .sheet {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 101;
    background: var(--paper-white);
    border-radius: 4px 4px 0 0;
    border-top: 2px solid var(--sky-blue);
    padding-bottom: max(env(safe-area-inset-bottom, 0px), 16px);
    max-height: 80dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    transform: translateY(100%);
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
    pointer-events: none;
  }
  .sheet.visible { transform: translateY(0); pointer-events: auto; }

  /* ─── Handle ───────────────────────────────────────────────────────────────── */
  .handle {
    width: 32px;
    height: 3px;
    background: var(--grid-border);
    border-radius: 1px;
    margin: 10px auto 0;
  }

  /* ─── Header ───────────────────────────────────────────────────────────────── */
  .sheet-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px 10px;
    border-bottom: 1px solid var(--grid-border-light);
  }

  .swatch {
    width: 36px;
    height: 36px;
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .swatch-num {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: white;
    line-height: 1;
  }

  .sheet-info { flex: 1; min-width: 0; }
  .sheet-party {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    text-transform: uppercase;
    margin: 0 0 2px;
    line-height: 1.2;
    letter-spacing: 0.01em;
  }
  .sheet-sub {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 10px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.3;
  }
  .sheet-sub.conflict { color: var(--accent); }
  .sheet-sub.ok { color: #2e7d32; }

  .close-btn {
    background: none;
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px 10px;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s, border-color 0.15s;
  }
  .close-btn:hover { 
    background: var(--paper-cream);
    border-color: var(--grid-border-light);
  }

  /* ─── Zone cards ───────────────────────────────────────────────────────────── */
  .zone-cards {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 8px 12px 0;
  }

  .zone-card {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    background: var(--paper-white);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    margin-bottom: 8px;
    transition: border-color 0.15s, background 0.1s;
    -webkit-tap-highlight-color: transparent;
  }

  .zone-card:hover {
    border-color: var(--sky-blue-dark);
    background: var(--sky-blue-light);
  }

  .zone-card:active {
    background: var(--paper-cream);
  }

  /* ─── Mini ballot preview ──────────────────────────────────────────────────── */
  .preview {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--paper-offwhite);
    padding: 8px 10px 8px 12px;
    flex-shrink: 0;
    border-right: 1px solid var(--grid-border-light);
    min-width: 90px;
  }

  .preview-badge {
    width: 22px;
    height: 22px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .preview-badge span {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: white;
    line-height: 1;
  }

  .preview-zones {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  /* Each small zone box in the preview */
  .pz {
    width: 18px;
    height: 22px;
    border-radius: 1px;
    border: 1px solid var(--grid-border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: white;
    transition: background 0.15s, border-color 0.15s;
  }

  /* Highlighted zone (this card's zone) */
  .pz.pz-on {
    border-color: var(--pc);
    background: color-mix(in srgb, var(--pc) 10%, white 90%);
    color: var(--pc);
  }

  .pz-x {
    width: 10px;
    height: 10px;
    display: block;
  }

  /* ─── Zone label & description ─────────────────────────────────────────────── */
  .zone-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 10px 0;
  }

  .zone-title {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.01em;
  }

  .zone-desc {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .zone-cta {
    font-size: 14px;
    color: var(--text-muted);
    flex-shrink: 0;
    padding-right: 12px;
    transition: color 0.15s, transform 0.15s;
  }

  .zone-card:hover .zone-cta {
    color: var(--pc);
    transform: translateX(2px);
  }

  /* ─── Number picker for legislative columns ────────────────────────────────── */
  .number-picker-card {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    background: var(--paper-white);
    padding: 8px 12px;
    transition: border-color 0.15s, background 0.15s;
  }

  .number-picker-card:hover {
    border-color: var(--sky-blue-dark);
    background: var(--sky-blue-light);
  }

  .number-picker {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-left: auto;
    margin-right: 10px;
  }

  .digit-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }

  .digit-scroll {
    width: 28px;
    height: 20px;
    border: 1px solid var(--grid-border);
    border-radius: 1px;
    background: var(--paper-cream);
    color: var(--text-muted);
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 9px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
    -webkit-tap-highlight-color: transparent;
  }

  .digit-scroll:hover {
    background: var(--paper-offwhite);
    color: var(--text-primary);
    border-color: var(--grid-border-light);
  }

  .digit-scroll:active {
    background: var(--grid-border-light);
  }

  .digit-display {
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    min-width: 24px;
    text-align: center;
  }

  .confirm-number-btn {
    width: 32px;
    height: 32px;
    border: 1px solid var(--grid-border);
    border-radius: 2px;
    background: var(--paper-white);
    color: var(--text-muted);
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: border-color 0.15s, color 0.15s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .confirm-number-btn:hover {
    border-color: var(--pc);
    color: var(--pc);
    transform: translateX(2px);
  }

  /* ─── Footer ───────────────────────────────────────────────────────────────── */
  .sheet-footer {
    padding: 2px 12px 0;
    border-top: 1px solid var(--grid-border-light);
    margin-top: 2px;
  }

  .clear-btn {
    width: 100%;
    padding: 12px;
    background: none;
    border: none;
    color: var(--accent);
    font-family: 'Roboto Condensed', 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s;
  }

  .clear-btn:hover {
    background: var(--accent-light);
  }
</style>
