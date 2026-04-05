<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let isMobile = $derived(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="help-backdrop"
    onclick={onClose}
    transition:fade={{ duration: 200 }}
  ></div>

  <!-- Panel -->
  <div
    class="help-panel"
    class:mobile={isMobile}
    transition:fly={{ y: isMobile ? 100 : 20, duration: 300 }}
  >
    <!-- Header -->
    <div class="help-header">
      <h3 class="help-title">Contacto</h3>
      <button class="help-close" onclick={onClose} aria-label="Cerrar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="authors-grid">
      <div class="author-card">
        <p class="author-name">Irvin Pereyra</p>
        <p class="author-role">Desarrollo de software</p>
        <div class="author-actions">
          <a href="https://x.com/nirvriaji" target="_blank" rel="noopener" class="author-btn">Ver en X</a>
          <a href="https://www.linkedin.com/in/irvin-pereyra/" target="_blank" rel="noopener" class="author-btn">Ver LinkedIn</a>
        </div>
      </div>

      <div class="author-card">
        <p class="author-name">Adolfo Coll Cárdenas</p>
        <p class="author-role">Dirección de producto</p>
        <div class="author-actions">
          <a href="mailto:adolfcoll65@gmail.com" class="author-btn">Enviar correo</a>
          <a href="https://www.linkedin.com/in/adolfo-coll-cardenas" target="_blank" rel="noopener" class="author-btn">Ver LinkedIn</a>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .help-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 998;
  }

  .help-panel {
    position: fixed;
    z-index: 999;
    width: 360px;
    padding: 20px;
    border-radius: 16px;
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
  }

  .help-panel.mobile {
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    transform: none;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    padding: 20px;
  }

  @media (max-width: 768px) {
    .help-panel {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      transform: none;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      padding: 20px;
    }
  }

  .help-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .help-title {
    font-size: 16px;
    font-weight: 700;
    color: #F9FAFB;
    margin: 0;
  }

  .help-close {
    background: transparent;
    border: none;
    color: #9CA3AF;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;
  }

  .help-close:hover {
    color: #F9FAFB;
  }

  .authors-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .author-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .author-name {
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }

  .author-role {
    font-size: 12px;
    color: rgba(148, 163, 184, 0.8);
    margin: 2px 0 10px;
  }

  .author-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .author-btn {
    display: inline-block;
    padding: 6px 12px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    transition: border-color 0.15s ease, color 0.15s ease;
    font-family: inherit;
  }

  .author-btn:hover {
    border-color: rgba(255, 255, 255, 0.25);
    color: rgba(255, 255, 255, 0.9);
  }
</style>
