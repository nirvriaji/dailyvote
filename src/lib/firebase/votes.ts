import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp,
  type Firestore
} from 'firebase/firestore';
import { getDb, isFirebaseReady } from './index';
import { getCurrentUser } from './auth';
import { COLLECTIONS, type UserVote, type UserDayVotes, type VoteEntry } from './config';

/**
 * Guardar voto de un usuario en Firestore
 */
export async function saveVote(
  date: string,
  category: string,
  voteData: { partyId: string; partyName: string }
): Promise<boolean> {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible, voto guardado solo localmente');
    return false;
  }
  
  const user = getCurrentUser();
  if (!user) {
    console.warn('Usuario no autenticado');
    return false;
  }
  
  try {
    const db = getDb();
    const voteRef = doc(db, COLLECTIONS.VOTES, user.uid);
    
    // Obtener voto existente
    const existingDoc = await getDoc(voteRef);
    const existingData = existingDoc.data() as UserVote | undefined;
    
    // Preparar datos del voto
    const voteEntry: VoteEntry = {
      partyId: voteData.partyId,
      partyName: voteData.partyName,
      timestamp: Date.now()
    };
    
    if (existingDoc.exists() && existingData) {
      // Actualizar voto existente
      const currentVotes = existingData.votes || {};
      const currentDateVotes: UserDayVotes = currentVotes[date] || {};
      
      const updatedDateVotes: UserDayVotes = {
        ...currentDateVotes,
        [category]: voteEntry
      };
      
      await updateDoc(voteRef, {
        [`votes.${date}`]: updatedDateVotes,
        lastVoteAt: serverTimestamp()
      });
    } else {
      // Crear nuevo documento de voto
      const newDayVotes: UserDayVotes = {
        [category]: voteEntry,
        completedAt: null
      };
      
      const newVote: Partial<UserVote> = {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        votes: {
          [date]: newDayVotes
        },
        createdAt: Date.now(),
        lastVoteAt: Date.now()
      };
      
      await setDoc(voteRef, newVote);
    }
    
    console.log(`✅ Voto guardado: ${category} -> ${voteData.partyName}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error guardando voto:', error.message);
    return false;
  }
}

/**
 * Marcar votación del día como completada (5 votos)
 */
export async function markVoteCompleted(date: string): Promise<boolean> {
  if (!isFirebaseReady) return false;
  
  const user = getCurrentUser();
  if (!user) return false;
  
  try {
    const db = getDb();
    const voteRef = doc(db, COLLECTIONS.VOTES, user.uid);
    
    await updateDoc(voteRef, {
      [`votes.${date}.completedAt`]: Date.now(),
      lastVoteAt: serverTimestamp()
    });
    
    console.log('✅ Votación completada guardada en Firebase');
    return true;
  } catch (error: any) {
    console.error('❌ Error marcando completado:', error.message);
    return false;
  }
}

/**
 * Cargar votos del usuario desde Firestore
 */
export async function loadUserVotes(): Promise<UserVote | null> {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible');
    return null;
  }
  
  const user = getCurrentUser();
  if (!user) {
    console.warn('Usuario no autenticado');
    return null;
  }
  
  try {
    const db = getDb();
    const voteRef = doc(db, COLLECTIONS.VOTES, user.uid);
    const docSnap = await getDoc(voteRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserVote;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error cargando votos:', error.message);
    return null;
  }
}

/**
 * Verificar si usuario ya votó hoy
 */
export async function hasVotedToday(date: string): Promise<boolean> {
  const votes = await loadUserVotes();
  if (!votes) return false;
  
  const todayVotes = votes.votes?.[date];
  if (!todayVotes) return false;
  
  // Verificar si tiene al menos un voto
  return !!(
    todayVotes.president ||
    todayVotes.senatorsNational ||
    todayVotes.senatorsRegional ||
    todayVotes.deputies ||
    todayVotes.andeanParliament
  );
}

/**
 * Sincronizar votos locales con Firebase
 * Útil para migrar datos de localStorage a Firebase
 */
export async function syncLocalVotes(
  date: string,
  localVotes: Record<string, any>
): Promise<boolean> {
  if (!isFirebaseReady || !getCurrentUser()) return false;
  
  try {
    // Guardar cada categoría
    for (const [category, voteData] of Object.entries(localVotes)) {
      if (voteData && voteData.partyName) {
        await saveVote(date, category, {
          partyId: voteData.partyId || voteData.partyAbbr,
          partyName: voteData.partyName
        });
      }
    }
    
    console.log('✅ Votos locales sincronizados con Firebase');
    return true;
  } catch (error: any) {
    console.error('❌ Error sincronizando:', error.message);
    return false;
  }
}
