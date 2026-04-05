<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';

  interface Props {
    text: string;
    anchorEl: HTMLElement;
    onDismiss: () => void;
  }

  let { text, anchorEl, onDismiss }: Props = $props();

  let tooltipEl = $state<HTMLDivElement | null>(null);
  let top = $state(0);
  let left = $state(0);
  let ready = $state(false);

  const GAP = 8;
  const EDGE_MARGIN = 10;

  function position() {
    if (!tooltipEl || !anchorEl) return;
    const anchor = anchorEl.getBoundingClientRect();
    const tip    = tooltipEl.getBoundingClientRect();
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;

    // Prefer above; fall back to below
    const fitsAbove = anchor.top - tip.height - GAP >= EDGE_MARGIN;
    top = fitsAbove
      ? anchor.top  - tip.height - GAP
      : anchor.bottom + GAP;

    // Center on anchor, clamp to viewport
    left = anchor.left + anchor.width / 2 - tip.width / 2;
    left = Math.max(EDGE_MARGIN, Math.min(left, vw - tip.width - EDGE_MARGIN));

    // Clamp vertical too
    top = Math.max(EDGE_MARGIN, Math.min(top, vh - tip.height - EDGE_MARGIN));

    ready = true;
  }

  onMount(() => {
    // Two rAFs: first for paint, second to read layout after paint
    requestAnimationFrame(() => requestAnimationFrame(position));
    window.addEventListener('resize', position, { passive: true });
    // Dismiss on any scroll (ballot pans, page scroll)
    window.addEventListener('scroll', onDismiss, { passive: true, capture: true });
  });

  onDestroy(() => {
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', onDismiss, { capture: true });
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={tooltipEl}
  class="hint-tooltip"
  class:hint-ready={ready}
  style:top="{top}px"
  style:left="{left}px"
  role="tooltip"
  transition:fade={{ duration: 160 }}
>
  <span class="hint-text">{text}</span>
  <button class="hint-close" onclick={onDismiss} aria-label="Cerrar ayuda" type="button">
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  </button>
</div>

<style>
  .hint-tooltip {
    position: fixed;
    z-index: 500;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    max-width: 240px;
    padding: 9px 10px 9px 12px;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
    pointer-events: auto;
    /* Hidden until positioned to avoid flash at 0,0 */
    visibility: hidden;
  }

  .hint-tooltip.hint-ready {
    visibility: visible;
    animation: hint-pop 0.18s ease-out both;
  }

  @keyframes hint-pop {
    from { transform: scale(0.93); }
    to   { transform: scale(1); }
  }

  .hint-text {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    color: #e2e8f0;
    line-height: 1.5;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .hint-close {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    padding: 0;
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    transition: color 0.15s ease;
    margin-top: 1px;
  }

  .hint-close:hover {
    color: #94a3b8;
  }
</style>
