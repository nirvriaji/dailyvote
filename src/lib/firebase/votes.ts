import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getDb, isFirebaseReady } from './index';
import { getAnonymousDeviceId, hasDeviceVotedToday, markDeviceAsVoted } from './device';
import { addVoteToGlobalStats } from './stats';
import { COLLECTIONS, type UserVote, type UserDayVotes, type VoteEntry } from './config';
import { BALLOT_COLUMNS } from '$lib/data/mock';

/**
 * Buscar información del partido en los datos mock
 */
function findPartyInfo(category: string, partyName: string) {
  // Map category to column index
  const categoryMap: Record<string, number> = {
    'president': 0,
    'senatorsNational': 1,
    'senatorsRegional': 2,
    'deputies': 3,
    'andeanParliament': 4
  };
  
  const colIndex = categoryMap[category];
  if (colIndex === undefined) return null;
  
  const column = BALLOT_COLUMNS[colIndex];
  if (!column) return null;
  
  // Search in all rows
  for (const row of column.rows) {
    if (row.partyName === partyName || row.partyAbbr === partyName) {
      return {
        partyColor: row.partyColor,
        partySymbolUrl: row.partySymbolUrl
      };
    }
  }
  
  return null;
}

/**
 * Guardar voto anónimo de un dispositivo en Firestore
 * No requiere login - usa device fingerprinting
 */
export async function saveVote(
  date: string,
  category: string,
  voteData: { partyId: string; partyName: string }
): Promise<boolean> {
  // Siempre guardar en localStorage primero (fallback)
  markDeviceAsVoted(date);
  
  // Si Firebase no está listo, solo localStorage
  if (!isFirebaseReady) {
    console.log('💾 Voto guardado localmente (Firebase no activo)');
    return true;
  }
  
  try {
    const db = getDb();
    const deviceId = getAnonymousDeviceId();
    const voteRef = doc(db, COLLECTIONS.VOTES, deviceId);
    
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
      // Crear nuevo documento de voto anónimo
      const newDayVotes: UserDayVotes = {
        [category]: voteEntry,
        completedAt: null
      };
      
      const newVote: Partial<UserVote> = {
        userId: deviceId, // ID anónimo del dispositivo
        email: null, // Anónimo
        displayName: null, // Anónimo
        photoURL: null, // Anónimo
        votes: {
          [date]: newDayVotes
        },
        createdAt: Date.now(),
        lastVoteAt: Date.now()
      };
      
      await setDoc(voteRef, newVote);
    }
    
    // Actualizar estadísticas globales con datos del partido
    const partyInfo = findPartyInfo(category, voteData.partyName);
    await addVoteToGlobalStats(
      date,
      category,
      voteData.partyName, // Use party name as ID for consistency
      voteData.partyName,
      partyInfo?.partyColor,
      partyInfo?.partySymbolUrl
    );
    
    console.log(`✅ Voto guardado en Firebase: ${category} -> ${voteData.partyName}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error guardando voto en Firebase:', error.message);
    // Aún así retornar true porque se guardó en localStorage
    return true;
  }
}

/**
 * Verificar si este dispositivo ya votó hoy
 * Comprueba localStorage primero (rápido), luego Firebase
 */
export async function hasVotedToday(date: string = getTodayDate()): Promise<boolean> {
  // Check rápido en localStorage
  if (hasDeviceVotedToday(date)) {
    return true;
  }
  
  // Si Firebase está listo, verificar también ahí
  if (!isFirebaseReady) {
    return false;
  }
  
  try {
    const db = getDb();
    const deviceId = getAnonymousDeviceId();
    const voteRef = doc(db, COLLECTIONS.VOTES, deviceId);
    const docSnap = await getDoc(voteRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as UserVote;
      const todayVotes = data.votes?.[date];
      
      // Verificar si tiene al menos un voto hoy
      const hasVote = !!(
        todayVotes?.president ||
        todayVotes?.senatorsNational ||
        todayVotes?.senatorsRegional ||
        todayVotes?.deputies ||
        todayVotes?.andeanParliament
      );
      
      // Si tiene voto en Firebase pero no en localStorage, sincronizar
      if (hasVote) {
        markDeviceAsVoted(date);
      }
      
      return hasVote;
    }
    
    return false;
  } catch (error: any) {
    console.error('❌ Error verificando voto:', error.message);
    return false;
  }
}

/**
 * Marcar votación del día como completada (5 votos)
 */
export async function markVoteCompleted(date: string = getTodayDate()): Promise<boolean> {
  if (!isFirebaseReady) return true; // Ya se marcó en localStorage
  
  try {
    const db = getDb();
    const deviceId = getAnonymousDeviceId();
    const voteRef = doc(db, COLLECTIONS.VOTES, deviceId);
    
    await updateDoc(voteRef, {
      [`votes.${date}.completedAt`]: Date.now(),
      lastVoteAt: serverTimestamp()
    });
    
    console.log('✅ Votación completada registrada');
    return true;
  } catch (error: any) {
    console.error('❌ Error marcando completado:', error.message);
    return false;
  }
}

/**
 * Cargar votos del dispositivo desde Firestore
 */
export async function loadDeviceVotes(): Promise<UserVote | null> {
  if (!isFirebaseReady) {
    console.log('Firebase no disponible, usando solo localStorage');
    return null;
  }
  
  try {
    const db = getDb();
    const deviceId = getAnonymousDeviceId();
    const voteRef = doc(db, COLLECTIONS.VOTES, deviceId);
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
 * Obtener fecha de hoy en formato YYYY-MM-DD
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Sincronizar votos locales con Firebase al iniciar
 * Útil para migrar datos de localStorage a Firebase cuando se activa
 */
export async function syncLocalVotes(
  date: string,
  localVotes: Record<string, any>
): Promise<boolean> {
  if (!isFirebaseReady) return false;
  
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
