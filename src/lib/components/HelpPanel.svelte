<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  
  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }
  
  let { isOpen, onClose }: Props = $props();
  
  // Contact URLs
  const X_URL = 'https://x.com/nirvriaji';
  const LINKEDIN_URL = 'https://www.linkedin.com/in/irvin-pereyra/';
  
  // Determine if mobile
  let isMobile = $derived(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }
  
  function openLink(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
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
      <h3 class="help-title">¿Necesitas algo?</h3>
      <button class="help-close" onclick={onClose} aria-label="Cerrar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    
    <p class="help-subtitle">
      Escríbenos si quieres sugerir mejoras, reportar un problema o ponerte en contacto.
    </p>
    
    <!-- Options -->
    <div class="help-options">
      <button 
        class="help-option"
        onclick={() => openLink(X_URL)}
      >
        <span class="option-title">Enviar sugerencia</span>
        <span class="option-subtitle">Ayúdanos a mejorar el simulador</span>
      </button>
      
      <button 
        class="help-option"
        onclick={() => openLink(X_URL)}
      >
        <span class="option-title">Reportar un problema</span>
        <span class="option-subtitle">Si algo no funciona como esperabas</span>
      </button>
      
      <button 
        class="help-option"
        onclick={() => openLink(LINKEDIN_URL)}
      >
        <span class="option-title">Contacto</span>
        <span class="option-subtitle">Para consultas, prensa o colaboraciones</span>
      </button>
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
    width: 320px;
    padding: 16px;
    border-radius: 16px;
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    
    /* Desktop: positioned top-right near header */
    top: 80px;
    right: 20px;
  }

  .help-panel.mobile {
    /* Mobile: bottom sheet style */
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    min-height: 280px;
    padding: 20px;
  }

  .help-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
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

  .help-subtitle {
    font-size: 13px;
    line-height: 1.4;
    color: #9CA3AF;
    margin: 0 0 16px 0;
  }

  .help-options {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .help-option {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    border-radius: 12px;
    background: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .help-option:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .option-title {
    font-size: 14px;
    font-weight: 700;
    color: #F9FAFB;
  }

  .option-subtitle {
    font-size: 12px;
    line-height: 1.3;
    color: #9CA3AF;
  }
</style>
