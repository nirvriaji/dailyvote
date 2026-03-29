/**
 * Device Fingerprinting Service
 * Genera un ID único anónimo por dispositivo/navegador
 * No requiere login ni almacena datos personales
 */

// Variable para cachear el device ID
let cachedDeviceId: string | null = null;

/**
 * Generar fingerprint único del dispositivo
 * Combina múltiples características del navegador
 */
export function getDeviceFingerprint(): string {
  // Si ya lo calculamos, devolver el cacheado
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  
  // Intentar recuperar de localStorage primero
  const stored = localStorage.getItem('dailyvote_device_id');
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  
  // Generar nuevo fingerprint
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.hardwareConcurrency || 'unknown',
    getCanvasFingerprint(),
    getWebGLFingerprint()
  ];
  
  // Crear hash simple
  const fingerprint = hashString(components.join('|||'));
  
  // Guardar en localStorage para persistencia
  cachedDeviceId = fingerprint;
  localStorage.setItem('dailyvote_device_id', fingerprint);
  
  return fingerprint;
}

/**
 * Canvas fingerprinting - variación sutil de rendering
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    
    // Dibujar elementos específicos
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(10, 10, 50, 30);
    
    ctx.fillStyle = '#069';
    ctx.fillText('DailyVote Peru 2026', 15, 15);
    
    // Añadir emojis y caracteres especiales
    ctx.fillStyle = '#C8102E';
    ctx.fillText('🗳️ 🇵🇪', 150, 15);
    
    return canvas.toDataURL().slice(-50); // Últimos 50 chars del base64
  } catch (e) {
    return 'canvas-blocked';
  }
}

/**
 * WebGL fingerprinting - info del GPU
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';
    
    const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor}-${renderer}`.slice(0, 50);
  } catch (e) {
    return 'webgl-blocked';
  }
}

/**
 * Hash string simple (FNV-1a inspired)
 */
function hashString(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  
  // Convertir a base64 url-safe
  const hashHex = (hash >>> 0).toString(16);
  return 'dv_' + hashHex + '_' + Date.now().toString(36).slice(-4);
}

/**
 * Verificar si este dispositivo ya votó hoy
 * (localStorage check - rápido)
 */
export function hasDeviceVotedToday(date: string = getTodayDate()): boolean {
  const deviceId = getDeviceFingerprint();
  const voteKey = `dailyvote_${deviceId}_${date}`;
  return localStorage.getItem(voteKey) === 'voted';
}

/**
 * Marcar que este dispositivo votó hoy
 */
export function markDeviceAsVoted(date: string = getTodayDate()): void {
  const deviceId = getDeviceFingerprint();
  const voteKey = `dailyvote_${deviceId}_${date}`;
  localStorage.setItem(voteKey, 'voted');
  
  // También guardar timestamp para referencia
  localStorage.setItem(`${voteKey}_time`, Date.now().toString());
}

/**
 * Obtener fecha de hoy en formato YYYY-MM-DD
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Obtener estadísticas de votos del dispositivo
 * Útil para debugging
 */
export function getDeviceVoteHistory(): Array<{date: string; timestamp: number}> {
  const deviceId = getDeviceFingerprint();
  const history: Array<{date: string; timestamp: number}> = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`dailyvote_${deviceId}_`) && key.endsWith('_time')) {
      const date = key.replace(`dailyvote_${deviceId}_`, '').replace('_time', '');
      const timestamp = parseInt(localStorage.getItem(key) || '0');
      history.push({ date, timestamp });
    }
  }
  
  return history.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Limpiar historial de votos de este dispositivo
 * Útil para testing
 */
export function clearDeviceVoteHistory(): void {
  const deviceId = getDeviceFingerprint();
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`dailyvote_${deviceId}_`)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('🧹 Historial de votos local borrado');
}

/**
 * Obtener ID del dispositivo (para Firebase)
 */
export function getAnonymousDeviceId(): string {
  return getDeviceFingerprint();
}
