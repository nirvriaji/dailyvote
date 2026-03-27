<script lang="ts">
  import type { VoteZoneType, VoteZone } from '$lib/types';
  import { ui } from '$lib/stores/ui.svelte';
  import { vote } from '$lib/stores/vote.svelte';
  import { nav } from '$lib/stores/navigation.svelte';

  let row       = $derived(ui.activeRow);
  let visible   = $derived(row !== null);
  let columnId  = $derived(`col${nav.column}`);
  let existing  = $derived(vote.getVote(columnId));
  let isConflict = $derived(existing !== undefined && existing.rowId !== row?.id);

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

  function clearVote() {
    vote.remove(columnId);
    ui.closeOverlay();
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
        <button
          class="zone-card"
          onclick={() => {
            // Cast vote for all zones
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
    background: rgba(0, 0, 0, 0.5);
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
    background: var(--surface);
    border-radius: 22px 22px 0 0;
    padding-bottom: max(env(safe-area-inset-bottom, 0px), 20px);
    max-height: 76dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    transform: translateY(100%);
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
    box-shadow: 0 -4px 48px rgba(0, 0, 0, 0.22);
  }
  .sheet.visible { transform: translateY(0); }

  /* ─── Handle ───────────────────────────────────────────────────────────────── */
  .handle {
    width: 36px;
    height: 4px;
    background: var(--border-strong);
    border-radius: 2px;
    margin: 12px auto 0;
  }

  /* ─── Header ───────────────────────────────────────────────────────────────── */
  .sheet-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border);
  }

  .swatch {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .swatch-num {
    font-size: 17px;
    font-weight: 900;
    color: white;
    line-height: 1;
  }

  .sheet-info { flex: 1; min-width: 0; }
  .sheet-party {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 2px;
    line-height: 1.2;
  }
  .sheet-sub {
    font-size: 11px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.3;
  }
  .sheet-sub.conflict { color: var(--accent); }
  .sheet-sub.ok { color: var(--success); }

  .close-btn {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    border-radius: 6px;
  }
  .close-btn:hover { background: var(--surface-alt); }

  /* ─── Zone cards ───────────────────────────────────────────────────────────── */
  .zone-cards {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 10px 12px 0;
  }

  .zone-card {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    margin-bottom: 8px;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.1s;
    -webkit-tap-highlight-color: transparent;
  }

  .zone-card:hover {
    border-color: color-mix(in srgb, var(--pc) 40%, var(--border) 60%);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  }

  .zone-card:active {
    background: var(--surface-alt);
    box-shadow: none;
  }

  /* ─── Mini ballot preview ──────────────────────────────────────────────────── */
  .preview {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--ballot-bg);
    padding: 10px 10px 10px 12px;
    flex-shrink: 0;
    border-right: 1px solid var(--border);
    min-width: 100px;
  }

  .preview-badge {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .preview-badge span {
    font-size: 10px;
    font-weight: 900;
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
    width: 20px;
    height: 24px;
    border-radius: 4px;
    border: 1.5px solid var(--border-strong);
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
    background: color-mix(in srgb, var(--pc) 12%, white 88%);
    color: var(--pc);
  }

  .pz-x {
    width: 12px;
    height: 12px;
    display: block;
  }

  /* ─── Zone label & description ─────────────────────────────────────────────── */
  .zone-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 0;
  }

  .zone-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .zone-desc {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.3;
  }

  .zone-cta {
    font-size: 15px;
    color: var(--text-muted);
    flex-shrink: 0;
    padding-right: 14px;
    transition: color 0.15s, transform 0.15s;
  }

  .zone-card:hover .zone-cta {
    color: var(--pc);
    transform: translateX(2px);
  }

  /* ─── Footer ───────────────────────────────────────────────────────────────── */
  .sheet-footer {
    padding: 4px 12px 0;
    border-top: 1px solid var(--border);
    margin-top: 2px;
  }

  .clear-btn {
    width: 100%;
    padding: 13px;
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }
</style>
