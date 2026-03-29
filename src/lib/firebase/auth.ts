import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { getAuthInstance, getGoogleProvider, isFirebaseReady } from './index';

// Estado del usuario
let currentUser: User | null = null;

/**
 * Iniciar sesión con Google
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!isFirebaseReady) {
    console.error('Firebase no está inicializado');
    return null;
  }
  
  try {
    const auth = getAuthInstance();
    const provider = getGoogleProvider();
    const result = await signInWithPopup(auth, provider);
    
    currentUser = result.user;
    console.log('✅ Usuario autenticado:', currentUser.displayName);
    return currentUser;
  } catch (error: any) {
    console.error('❌ Error en autenticación:', error.message);
    throw error;
  }
}

/**
 * Cerrar sesión
 */
export async function logout(): Promise<void> {
  if (!isFirebaseReady) return;
  
  try {
    const auth = getAuthInstance();
    await signOut(auth);
    currentUser = null;
    console.log('👋 Usuario desconectado');
  } catch (error: any) {
    console.error('❌ Error cerrando sesión:', error.message);
    throw error;
  }
}

/**
 * Obtener usuario actual
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * Verificar si hay usuario autenticado
 */
export function isAuthenticated(): boolean {
  return currentUser !== null;
}

/**
 * Escuchar cambios en el estado de autenticación
 * @param callback - Función a ejecutar cuando cambie el estado
 * @returns Función para desuscribirse
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!isFirebaseReady) {
    console.warn('Firebase no inicializado, usando callback con null');
    callback(null);
    return () => {};
  }
  
  const auth = getAuthInstance();
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

/**
 * Obtener ID del usuario para usar en Firestore
 */
export function getUserId(): string | null {
  return currentUser?.uid || null;
}

/**
 * Obtener datos del usuario para mostrar
 */
export function getUserDisplayInfo() {
  if (!currentUser) return null;
  
  return {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL,
    isAnonymous: currentUser.isAnonymous
  };
}
