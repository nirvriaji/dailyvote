<script lang="ts">
  import { isColumnValid, getValidColumnCount } from '$lib/stores/preferencePicker.svelte';
  import type { ColumnKey } from '$lib/stores/preferencePicker.svelte';
  import { fade, fly } from 'svelte/transition';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onDeliver: () => void;
    isSubmitting?: boolean;
  }
  let { isOpen, onClose, onDeliver, isSubmitting = false }: Props = $props();

  const SECTIONS: { key: ColumnKey; label: string }[] = [
    { key: 'presidente',       label: 'Presidencia' },
    { key: 'senadoNacional',   label: 'Senado nacional' },
    { key: 'senadoRegional',   label: 'Senado regional' },
    { key: 'diputados',        label: 'Diputados' },
    { key: 'parlamentoAndino', label: 'Parlamento Andino' },
  ];

  let validCount = $derived(getValidColumnCount());
  let ballotStatus = $derived<'blank' | 'partial' | 'complete'>(
    validCount === 5 ? 'complete' : validCount === 0 ? 'blank' : 'partial'
  );
  let deliverLabel = $derived(
    isSubmitting ? 'Procesando...' :
    ballotStatus === 'complete' ? 'Entregar cédula y ver cómo se procesa mi voto' :
    ballotStatus === 'partial'  ? 'Entregar cédula parcial y ver qué pasa' :
                                  'Entregar cédula en blanco y ver qué pasa'
  );
</script>

{#if isOpen}
  <div class="backdrop" onclick={onClose} transition:fade={{ duration: 180 }} aria-hidden="true"></div>

  <aside class="drawer" transition:fly={{ x: 360, duration: 220 }} aria-label="Resumen de cédula" role="complementary">
    <div class="drawer-header">
      <h2 class="drawer-title">Resumen de tu cédula</h2>
      <button class="close-btn" onclick={onClose} aria-label="Cerrar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="drawer-body">
      <div
        class="global-status"
        class:gs-complete={ballotStatus === 'complete'}
        class:gs-partial={ballotStatus === 'partial'}
        class:gs-blank={ballotStatus === 'blank'}
      >
        <span class="gs-count">{validCount}/5</span>
        <span class="gs-label">
          {ballotStatus === 'complete' ? 'Cédula completa' : ballotStatus === 'partial' ? 'Cédula parcial' : 'Cédula en blanco'}
        </span>
      </div>

      <div class="sections">
        {#each SECTIONS as section}
          {@const marked = isColumnValid(section.key)}
          <div class="section-row" class:s-marked={marked}>
            <span class="section-name">{section.label}</span>
            <span class="section-status" class:st-done={marked} class:st-blank={!marked}>
              {marked ? 'Completo' : 'En blanco'}
            </span>
          </div>
        {/each}
      </div>

      <p class="deliver-note">Puedes entregar aunque no hayas marcado todas las decisiones. El simulador te mostrará qué ocurre en cada caso.</p>
    </div>

    <div class="drawer-footer">
      <button
        class="deliver-btn"
        class:busy={isSubmitting}
        disabled={isSubmitting}
        onclick={onDeliver}
      >
        {deliverLabel}
      </button>
    </div>
  </aside>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 199;
    backdrop-filter: blur(2px);
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 360px;
    max-width: 100vw;
    background: #0f172a;
    border-left: 1px solid #1e293b;
    z-index: 200;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: -8px 0 40px rgba(0,0,0,0.5);
  }

  @media (max-width: 480px) {
    .drawer {
      top: auto;
      left: 0;
      right: 0;
      width: 100%;
      height: 85dvh;
      border-left: none;
      border-top: 1px solid #1e293b;
      border-radius: 16px 16px 0 0;
      box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
    }
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #1e293b;
    flex-shrink: 0;
  }

  .drawer-title {
    font-size: 16px;
    font-weight: 800;
    color: #e2e8f0;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .close-btn:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scrollbar-width: thin;
    scrollbar-color: #334155 transparent;
  }

  .global-status {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-radius: 10px;
    border: 1px solid #1e293b;
  }

  .gs-complete { border-color: rgba(34,197,94,0.3);   background: rgba(34,197,94,0.06);   }
  .gs-partial  { border-color: rgba(245,158,11,0.25); background: rgba(245,158,11,0.05); }
  .gs-blank    { border-color: #1e293b;               background: rgba(255,255,255,0.02); }

  .gs-count { font-size: 28px; font-weight: 800; line-height: 1; }
  .gs-complete .gs-count { color: #4ade80; }
  .gs-partial  .gs-count { color: #fbbf24; }
  .gs-blank    .gs-count { color: #475569; }

  .gs-label { font-size: 13px; font-weight: 600; color: #94a3b8; }

  .sections { display: flex; flex-direction: column; gap: 3px; }

  .section-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 6px;
    background: rgba(255,255,255,0.02);
    border: 1px solid transparent;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .section-row.s-marked {
    background: rgba(34,197,94,0.04);
    border-color: rgba(34,197,94,0.15);
  }

  .section-name { font-size: 13px; color: #64748b; }
  .section-row.s-marked .section-name { color: #cbd5e1; }

  .section-status { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  .st-done  { color: #4ade80; }
  .st-blank { color: #334155; }

  .deliver-note { font-size: 12px; color: #475569; line-height: 1.6; margin: 0; text-align: center; }

  .drawer-footer {
    padding: 16px 20px;
    border-top: 1px solid #1e293b;
    flex-shrink: 0;
  }

  .deliver-btn {
    width: 100%;
    padding: 14px 16px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    line-height: 1.4;
    text-align: center;
    transition: all 0.25s ease;
    font-family: inherit;
    background: linear-gradient(135deg, #C8102E 0%, #a00d25 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(200,16,46,0.35);
  }

  .deliver-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(200,16,46,0.45);
  }

  .deliver-btn.busy,
  .deliver-btn:disabled { opacity: 0.6; cursor: wait; transform: none; box-shadow: none; }
</style>
