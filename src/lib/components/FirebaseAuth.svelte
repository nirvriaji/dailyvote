<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { signInWithGoogle, logout, getCurrentUser, isAuthenticated, onAuthChange } from '$lib/firebase/auth';
  import { initializeFirebase, checkFirebaseReady } from '$lib/firebase/index';
  
  let isReady = $state(false);
  let isLoggedIn = $state(false);
  let user = $state<any>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  
  onMount(() => {
    // Inicializar Firebase (necesita configuración del usuario)
    initializeFirebase();
    isReady = checkFirebaseReady();
    
    // Escuchar cambios de autenticación
    onAuthChange((authUser) => {
      user = authUser;
      isLoggedIn = authUser !== null;
    });
  });
  
  async function handleLogin() {
    isLoading = true;
    error = null;
    
    try {
      await signInWithGoogle();
    } catch (err: any) {
      error = err.message || 'Error al iniciar sesión';
    } finally {
      isLoading = false;
    }
  }
  
  async function handleLogout() {
    try {
      await logout();
    } catch (err: any) {
      error = err.message || 'Error al cerrar sesión';
    }
  }
</script>

{#if !isReady}
  <!-- Firebase no configurado - mensaje para el usuario -->
  <div class="auth-container" transition:fade>
    <div class="auth-card warning">
      <span class="icon">⚙️</span>
      <h3>Firebase no configurado</h3>
      <p>Para habilitar la sincronización en la nube, necesitas:</p>
      <ol>
        <li>Crear proyecto en Firebase Console</li>
        <li>Copiar la configuración a <code>src/lib/firebase/config.ts</code></li>
        <li>Activar Firestore y Authentication</li>
      </ol>
      <p class="note">Mientras tanto, tus votos se guardarán solo en este dispositivo.</p>
    </div>
  </div>
{:else if isLoggedIn}
  <!-- Usuario autenticado -->
  <div class="auth-container logged-in" transition:fly={{ y: 20 }}>
    <div class="user-info">
      {#if user?.photoURL}
        <img src={user.photoURL} alt="" class="user-avatar" />
      {:else}
        <div class="user-avatar placeholder">👤</div>
      {/if}
      <div class="user-details">
        <span class="user-name">{user?.displayName || 'Usuario'}</span>
        <span class="user-email">{user?.email}</span>
      </div>
    </div>
    <button class="btn-logout" onclick={handleLogout}>
      Cerrar sesión
    </button>
  </div>
{:else}
  <!-- Usuario no autenticado -->
  <div class="auth-container" transition:fly={{ y: 20 }}>
    <div class="auth-card">
      <span class="icon">🔐</span>
      <h3>Guarda tus votos en la nube</h3>
      <p>Inicia sesión para:</p>
      <ul>
        <li>✓ Sincronizar entre dispositivos</li>
        <li>✓ Ver resultados globales</li>
        <li>✓ Acceder desde cualquier lugar</li>
      </ul>
      
      {#if error}
        <div class="error-message" transition:fade>
          ⚠️ {error}
        </div>
      {/if}
      
      <button 
        class="btn-google" 
        onclick={handleLogin}
        disabled={isLoading}
      >
        {#if isLoading}
          <span class="spinner"></span>
          Conectando...
        {:else}
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Iniciar sesión con Google
        {/if}
      </button>
      
      <button class="btn-skip" onclick={() => {}}>
        Continuar sin iniciar sesión →
      </button>
    </div>
  </div>
{/if}

<style>
  .auth-container {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
  }

  .auth-card {
    background: white;
    border-radius: 16px;
    padding: 32px;
    text-align: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .auth-card.warning {
    background: #fff8e1;
    border: 2px solid #ffc107;
  }

  .icon {
    font-size: 48px;
    display: block;
    margin-bottom: 16px;
  }

  .auth-card h3 {
    font-size: 20px;
    font-weight: 700;
    color: #1a1a2e;
    margin: 0 0 12px 0;
  }

  .auth-card p {
    color: #666;
    font-size: 14px;
    margin: 0 0 16px 0;
  }

  .auth-card ol,
  .auth-card ul {
    text-align: left;
    color: #555;
    font-size: 14px;
    margin: 16px 0;
    padding-left: 20px;
  }

  .auth-card li {
    margin-bottom: 8px;
  }

  code {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
  }

  .note {
    font-size: 13px;
    color: #888;
    font-style: italic;
  }

  /* Botón de Google */
  .btn-google {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 14px 24px;
    background: white;
    border: 2px solid #ddd;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    color: #555;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 16px;
  }

  .btn-google:hover:not(:disabled) {
    border-color: #C8102E;
    color: #C8102E;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .btn-google:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .google-icon {
    width: 20px;
    height: 20px;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #ddd;
    border-top-color: #C8102E;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Botón de omitir */
  .btn-skip {
    width: 100%;
    margin-top: 12px;
    padding: 12px;
    background: transparent;
    border: none;
    color: #999;
    font-size: 14px;
    cursor: pointer;
    transition: color 0.2s;
  }

  .btn-skip:hover {
    color: #666;
  }

  /* Error */
  .error-message {
    background: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    margin-bottom: 16px;
  }

  /* Usuario logueado */
  .logged-in {
    background: white;
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-avatar.placeholder {
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .user-details {
    display: flex;
    flex-direction: column;
    text-align: left;
    min-width: 0;
  }

  .user-name {
    font-weight: 600;
    color: #1a1a2e;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-email {
    font-size: 12px;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-logout {
    padding: 8px 16px;
    background: #f0f0f0;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-logout:hover {
    background: #e0e0e0;
    color: #C8102E;
  }
</style>
