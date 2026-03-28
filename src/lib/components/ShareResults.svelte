<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  
  interface SharedResult {
    category: string;
    partyName: string;
    partyColor: string;
    percentage: number;
  }
  
  let { 
    results, 
    onClose 
  }: { 
    results: SharedResult[]; 
    onClose: () => void;
  } = $props();
  
  let copied = $state(false);
  let shareText = $derived(generateShareText());
  
  function generateShareText(): string {
    const date = new Date().toLocaleDateString('es-PE');
    let text = `🗳️ Mi simulación de voto Perú 2026 - ${date}\n\n`;
    
    results.forEach(r => {
      text += `${r.category}: ${r.partyName} (${r.percentage.toFixed(1)}%)\n`;
    });
    
    text += `\n¿Y tú? Prueba el simulador en: ${window.location.origin}`;
    return text;
  }
  
  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareText);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (err) {
      console.error('Error copying:', err);
    }
  }
  
  async function shareNative() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi simulación de voto Perú 2026',
          text: shareText,
          url: window.location.origin
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  }
  
  function shareTwitter() {
    const text = encodeURIComponent(shareText.slice(0, 250) + '...');
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  }
  
  function shareWhatsApp() {
    const text = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
</script>

<div class="share-overlay" transition:fade={{ duration: 300 }}>
  <div class="share-backdrop" onclick={onClose}></div>
  
  <div class="share-card" transition:fly={{ y: 20, duration: 400 }}>
    <!-- Header -->
    <div class="share-header">
      <h2>📤 Compartir resultados</h2>
      <button class="btn-close" onclick={onClose}>✕</button>
    </div>
    
    <!-- Preview -->
    <div class="share-preview">
      <div class="preview-card">
        <div class="preview-header">
          <span class="preview-badge">🗳️ Simulación Perú 2026</span>
          <span class="preview-date">{new Date().toLocaleDateString('es-PE')}</span>
        </div>
        
        <div class="preview-results">
          {#each results as result}
            <div class="result-row">
              <span class="result-category">{result.category}</span>
              <div class="result-party">
                <span 
                  class="party-dot" 
                  style="background-color: {result.partyColor}"
                ></span>
                <span class="party-name">{result.partyName}</span>
                <span class="party-percent">{result.percentage.toFixed(1)}%</span>
              </div>
            </div>
          {/each}
        </div>
        
        <div class="preview-footer">
          <span>dailyvote.pe</span>
        </div>
      </div>
    </div>
    
    <!-- Share buttons -->
    <div class="share-options">
      <button class="share-btn btn-native" onclick={shareNative}>
        <span class="icon">📱</span>
        <span class="label">Compartir</span>
      </button>
      
      <button class="share-btn btn-twitter" onclick={shareTwitter}>
        <span class="icon">𝕏</span>
        <span class="label">Twitter</span>
      </button>
      
      <button class="share-btn btn-whatsapp" onclick={shareWhatsApp}>
        <span class="icon">💬</span>
        <span class="label">WhatsApp</span>
      </button>
    </div>
    
    <!-- Copy text -->
    <div class="copy-section">
      <div class="copy-preview">
        <p>{shareText.slice(0, 120)}...</p>
      </div>
      <button 
        class="btn-copy" 
        class:copied={copied}
        onclick={copyToClipboard}
      >
        {copied ? '✓ Copiado' : '📋 Copiar texto'}
      </button>
    </div>
  </div>
</div>

<style>
  .share-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .share-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(6px);
  }

  .share-card {
    position: relative;
    background: white;
    border-radius: 24px;
    padding: 32px;
    max-width: 450px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
  }

  /* Header */
  .share-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .share-header h2 {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0;
  }

  .btn-close {
    background: #f0f0f0;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-close:hover {
    background: #e0e0e0;
  }

  /* Preview card */
  .share-preview {
    margin-bottom: 24px;
  }

  .preview-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 16px;
    padding: 24px;
    color: white;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.2);
  }

  .preview-badge {
    font-size: 13px;
    font-weight: 600;
  }

  .preview-date {
    font-size: 12px;
    opacity: 0.7;
  }

  .preview-results {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .result-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .result-category {
    font-size: 11px;
    text-transform: uppercase;
    opacity: 0.6;
    letter-spacing: 0.05em;
  }

  .result-party {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .party-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .party-name {
    font-weight: 600;
    font-size: 14px;
  }

  .party-percent {
    margin-left: auto;
    font-weight: 700;
    color: #ff6b6b;
  }

  .preview-footer {
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid rgba(255,255,255,0.2);
    font-size: 12px;
    opacity: 0.5;
  }

  /* Share buttons */
  .share-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .share-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 12px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    background: #f8f9fa;
  }

  .share-btn:hover {
    transform: translateY(-2px);
  }

  .share-btn .icon {
    font-size: 28px;
  }

  .share-btn .label {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }

  .btn-native:hover {
    background: #e3f2fd;
  }

  .btn-twitter:hover {
    background: #e8f5e9;
  }

  .btn-whatsapp:hover {
    background: #e8f5e9;
  }

  /* Copy section */
  .copy-section {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 16px;
  }

  .copy-preview {
    background: white;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    border: 1px solid #e0e0e0;
  }

  .copy-preview p {
    font-size: 13px;
    color: #555;
    margin: 0;
    line-height: 1.4;
  }

  .btn-copy {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #C8102E, #a00d25);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-copy:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(200, 16, 46, 0.3);
  }

  .btn-copy.copied {
    background: #28a745;
  }

  /* Mobile */
  @media (max-width: 480px) {
    .share-card {
      padding: 24px;
    }

    .share-options {
      grid-template-columns: 1fr;
    }

    .share-btn {
      flex-direction: row;
      justify-content: center;
      padding: 14px;
    }
  }
</style>
