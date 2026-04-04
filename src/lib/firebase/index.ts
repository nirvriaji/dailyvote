import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth, GoogleAuthProvider } from 'firebase/auth';
import { firebaseConfig } from './config';

// Variables para la app de Firebase
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Flag para saber si Firebase está inicializado
export let isFirebaseReady = false;

/**
 * Fecha objetivo final de la campaña de simulación
 * 12 de abril de 2026 a las 07:00:00
 */
export const ELECTION_DAY_TARGET = new Date('2026-04-12T07:00:00');

/**
 * Verificar si aún se pueden hacer simulaciones
 * Hasta el 12 de abril a las 07:00 a. m.
 */
export function canStillSimulate(now: Date = new Date()): boolean {
  return now.getTime() < ELECTION_DAY_TARGET.getTime();
}

/**
 * Inicializa Firebase con la configuración proporcionada
 * Llamar a esta función después de que el usuario proporcione la configuración
 */
export function initializeFirebase() {
  try {
    // Verificar si la configuración tiene valores reales
    if (firebaseConfig.apiKey === "YOUR_API_KEY_HERE") {
      console.warn('Firebase no configurado. Usando modo localStorage.');
      return false;
    }
    
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configurar provider de Google
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    isFirebaseReady = true;
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    isFirebaseReady = false;
    return false;
  }
}

/**
 * Obtener instancia de Firestore
 */
export function getDb(): Firestore {
  if (!db) {
    throw new Error('Firebase no inicializado. Llama a initializeFirebase() primero.');
  }
  return db;
}

/**
 * Obtener instancia de Auth
 */
export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase no inicializado. Llama a initializeFirebase() primero.');
  }
  return auth;
}

/**
 * Obtener provider de Google
 */
export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleProvider) {
    throw new Error('Firebase no inicializado. Llama a initializeFirebase() primero.');
  }
  return googleProvider;
}

/**
 * Verificar si Firebase está listo
 */
export function checkFirebaseReady(): boolean {
  return isFirebaseReady && app !== null && db !== null && auth !== null;
}

/**
 * Obtener estado de votación basado en fecha actual
 * Ya no hay cierre diario a las 20:00
 * Las simulaciones están abiertas continuamente hasta el 12 de abril a las 07:00
 * Después de esa fecha, se cierran permanentemente
 */
export function getVotingStatus(currentDate: Date = new Date()): 'open' | 'closed' {
  // Verificar si estamos antes del 12 de abril a las 07:00
  if (canStillSimulate(currentDate)) {
    return 'open';
  }
  
  // Después del 12 de abril a las 07:00, las simulaciones están cerradas permanentemente
  return 'closed';
}

/**
 * Verificar si se permite votar en este momento
 * Solo se puede votar hasta el 12 de abril a las 07:00 a. m.
 */
export function canVoteNow(): boolean {
  return canStillSimulate();
}

/**
 * Calcular tiempo restante hasta el día de la elección
 * Retorna objeto con días, horas, minutos, segundos
 */
export function getCountdownToElection(currentDate: Date = new Date()) {
  const diff = ELECTION_DAY_TARGET.getTime() - currentDate.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, isExpired: false };
}

/**
 * Formatear countdown para mostrar en UI
 * Formato: "14d 03h 22m 18s"
 */
export function formatCountdown(countdown: { days: number; hours: number; minutes: number; seconds: number }): string {
  return `${countdown.days}d ${countdown.hours.toString().padStart(2, '0')}h ${countdown.minutes.toString().padStart(2, '0')}m ${countdown.seconds.toString().padStart(2, '0')}s`;
}

/**
 * Obtener el estado actual de Firebase como objeto
 */
export function getFirebaseStatus() {
  return {
    isReady: isFirebaseReady,
    hasConfig: firebaseConfig.apiKey !== "YOUR_API_KEY_HERE",
    appInitialized: app !== null,
    dbInitialized: db !== null,
    authInitialized: auth !== null,
    canStillSimulate: canStillSimulate(),
    electionDate: ELECTION_DAY_TARGET.toISOString()
  };
}
