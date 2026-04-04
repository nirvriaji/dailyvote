<script lang="ts">
  import { fade, fly } from 'svelte/transition';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    url?: string;
    text?: string;
  }

  let { isOpen, onClose, url = '', text = '' }: Props = $props();

  let copyStatus = $state<'idle' | 'copied'>('idle');

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) onClose();
  }

  function shareX() {
    const encoded = encodeURIComponent(`${text} ${url}`);
    window.open(`https://x.com/intent/tweet?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }

  function shareWhatsApp() {
    const encoded = encodeURIComponent(`${text} ${url}`);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }

  function shareFacebook() {
    const encoded = encodeURIComponent(url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      copyStatus = 'copied';
      setTimeout(() => { copyStatus = 'idle'; }, 2000);
    } catch {}
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="backdrop"
    onclick={onClose}
    transition:fade={{ duration: 200 }}
    role="presentation"
  ></div>

  <!-- Modal -->
  <div class="modal" transition:fly={{ y: 24, duration: 280 }} role="dialog" aria-modal="true" aria-label="Compartir">
    <div class="modal-header">
      <span class="modal-title">Compartir simulador</span>
      <button class="modal-close" onclick={onClose} aria-label="Cerrar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <p class="modal-sub">Comparte este simulador en tus redes</p>

    <div class="share-grid">
      <!-- X / Twitter -->
      <button class="share-btn" onclick={shareX}>
        <span class="share-icon si-x">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
          </svg>
        </span>
        <span class="share-label">X</span>
      </button>

      <!-- WhatsApp -->
      <button class="share-btn" onclick={shareWhatsApp}>
        <span class="share-icon si-wa">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </span>
        <span class="share-label">WhatsApp</span>
      </button>

      <!-- Facebook -->
      <button class="share-btn" onclick={shareFacebook}>
        <span class="share-icon si-fb">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </span>
        <span class="share-label">Facebook</span>
      </button>

      <!-- Copiar enlace -->
      <button class="share-btn" onclick={copyLink}>
        <span class="share-icon si-copy" class:si-done={copyStatus === 'copied'}>
          {#if copyStatus === 'copied'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          {:else}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          {/if}
        </span>
        <span class="share-label">{copyStatus === 'copied' ? 'Copiado' : 'Copiar enlace'}</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 998;
    backdrop-filter: blur(2px);
  }

  .modal {
    position: fixed;
    z-index: 999;
    width: 320px;
    padding: 20px;
    border-radius: 16px;
    background: #111827;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  @media (max-width: 480px) {
    .modal {
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
      padding: 24px 20px 32px;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .modal-title {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .modal-close {
    background: transparent;
    border: none;
    color: #64748b;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s ease;
    border-radius: 4px;
  }

  .modal-close:hover { color: #e2e8f0; }

  .modal-sub {
    font-size: 12px;
    color: #64748b;
    margin: 0 0 20px;
  }

  .share-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .share-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 6px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    font-family: inherit;
  }

  .share-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .share-icon {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .si-x    { background: #000; color: #fff; }
  .si-wa   { background: #25d366; color: #fff; }
  .si-fb   { background: #1877f2; color: #fff; }
  .si-copy { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
  .si-done { background: rgba(34,197,94,0.15); color: #4ade80; border-color: rgba(34,197,94,0.3); }

  .share-label {
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-align: center;
    white-space: nowrap;
  }
</style>
