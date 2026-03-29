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
    console.log('✅ Firebase inicializado correctamente');
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
 * Obtener estado de votación basado en hora actual
 * Ciclo diario: 00:00 - 20:00 (abierto), 20:00 - 23:59 (cerrado)
 */
export function getVotingStatus(currentDate: Date = new Date()): 'open' | 'closed' {
  const hours = currentDate.getHours();
  
  if (hours < 20) {
    return 'open';
  }
  
  return 'closed';
}

/**
 * Verificar si se permite votar en este momento
 */
export function canVoteNow(): boolean {
  return getVotingStatus() === 'open';
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
    authInitialized: auth !== null
  };
}
