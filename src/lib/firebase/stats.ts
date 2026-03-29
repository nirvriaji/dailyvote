import { 
  doc, 
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { getDb, isFirebaseReady } from './index';
import { COLLECTIONS, type GlobalStats } from './config';
import { BALLOT_COLUMNS } from '$lib/data/mock';

/**
 * Suscribirse a estadísticas globales en tiempo real
 * Llama al callback cada vez que cambian los datos
 */
export function subscribeToGlobalStats(
  date: string,
  callback: (stats: GlobalStats | null) => void
): Unsubscribe | null {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible para suscripción en tiempo real');
    callback(null);
    return null;
  }
  
  try {
    const db = getDb();
    const statsRef = doc(db, COLLECTIONS.GLOBAL_STATS, date);
    
    return onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as GlobalStats);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('❌ Error en suscripción:', error.message);
      callback(null);
    });
  } catch (error: any) {
    console.error('❌ Error iniciando suscripción:', error.message);
    return null;
  }
}

/**
 * Agregar voto a estadísticas globales
 * Se llama cada vez que un usuario vota
 */
export async function addVoteToGlobalStats(
  date: string,
  category: string,
  partyId: string,
  partyName?: string,
  partyColor?: string,
  partySymbolUrl?: string
): Promise<boolean> {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible para estadísticas globales');
    return false;
  }
  
  try {
    const db = getDb();
    const statsRef = doc(db, COLLECTIONS.GLOBAL_STATS, date);
    
    // First, try to get the current document
    const docSnap = await getDoc(statsRef);
    
    if (docSnap.exists()) {
      // Update existing document
      await updateDoc(statsRef, {
        [`categories.${category}.${partyId}`]: increment(1),
        totalVotes: increment(1),
        lastUpdated: serverTimestamp(),
        [`metadata.${category}.${partyId}`]: {
          partyName: partyName || partyId,
          partyColor: partyColor || '#666',
          partySymbolUrl: partySymbolUrl || ''
        }
      });
    } else {
      // Create new document with all required categories
      const { setDoc } = await import('firebase/firestore');
      await setDoc(statsRef, {
        date,
        totalVotes: 1,
        lastUpdated: serverTimestamp(),
        categories: {
          president: category === 'president' ? { [partyId]: 1 } : {},
          senatorsNational: category === 'senatorsNational' ? { [partyId]: 1 } : {},
          senatorsRegional: category === 'senatorsRegional' ? { [partyId]: 1 } : {},
          deputies: category === 'deputies' ? { [partyId]: 1 } : {},
          andeanParliament: category === 'andeanParliament' ? { [partyId]: 1 } : {}
        },
        metadata: {
          [category]: {
            [partyId]: {
              partyName: partyName || partyId,
              partyColor: partyColor || '#666',
              partySymbolUrl: partySymbolUrl || ''
            }
          }
        }
      });
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Error actualizando estadísticas:', error.message);
    return false;
  }
}

/**
 * Obtener estadísticas globales del día
 */
export async function getGlobalStats(date: string): Promise<GlobalStats | null> {
  if (!isFirebaseReady) return null;
  
  try {
    const db = getDb();
    const statsRef = doc(db, COLLECTIONS.GLOBAL_STATS, date);
    const docSnap = await getDoc(statsRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as GlobalStats;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error cargando estadísticas:', error.message);
    return null;
  }
}

/**
 * Calcular porcentajes para una categoría
 */
export function calculatePercentages(
  stats: Record<string, number>
): Array<{ partyId: string; count: number; percentage: number }> {
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
  
  if (total === 0) return [];
  
  return Object.entries(stats)
    .map(([partyId, count]) => ({
      partyId,
      count,
      percentage: (count / total) * 100
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Obtener resumen de todas las categorías con porcentajes
 */
export async function getGlobalResultsWithPercentages(
  date: string
): Promise<Record<string, Array<{ partyId: string; count: number; percentage: number }>> | null> {
  const stats = await getGlobalStats(date);
  if (!stats) return null;
  
  return {
    president: calculatePercentages(stats.categories.president || {}),
    senatorsNational: calculatePercentages(stats.categories.senatorsNational || {}),
    senatorsRegional: calculatePercentages(stats.categories.senatorsRegional || {}),
    deputies: calculatePercentages(stats.categories.deputies || {}),
    andeanParliament: calculatePercentages(stats.categories.andeanParliament || {})
  };
}

/**
 * Obtener historial de estadísticas de los últimos N días
 */
export async function getHistoricalStats(days: number = 30): Promise<Array<{
  date: string;
  totalVotes: number;
  winners: {
    president?: { partyName: string; partyColor: string; partySymbolUrl: string; percentage: number };
    senatorsNational?: { partyName: string; partyColor: string; partySymbolUrl: string; percentage: number };
    senatorsRegional?: { partyName: string; partyColor: string; partySymbolUrl: string; percentage: number };
    deputies?: { partyName: string; partyColor: string; partySymbolUrl: string; percentage: number };
    andeanParliament?: { partyName: string; partyColor: string; partySymbolUrl: string; percentage: number };
  };
}> | null> {
  if (!isFirebaseReady) return null;
  
  try {
    const db = getDb();
    const statsCollection = collection(db, COLLECTIONS.GLOBAL_STATS);
    
    // Query last N days, ordered by date descending
    const q = query(statsCollection, orderBy('date', 'desc'), limit(days));
    const querySnapshot = await getDocs(q);
    
    const historicalData: Array<{
      date: string;
      totalVotes: number;
      winners: any;
    }> = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as GlobalStats;
      const winners: any = {};
      
      // Calculate winner for each category
      const categories = ['president', 'senatorsNational', 'senatorsRegional', 'deputies', 'andeanParliament'];
      categories.forEach(cat => {
        const catStats = data.categories[cat as keyof typeof data.categories] || {};
        const catMetadata = data.metadata?.[cat] || {};
        
        if (Object.keys(catStats).length > 0) {
          // Find party with most votes
          const entries = Object.entries(catStats);
          entries.sort((a, b) => b[1] - a[1]);
          const [winningPartyId, winningCount] = entries[0];
          const totalCatVotes = entries.reduce((sum, [, count]) => sum + count, 0);
          
          const metadata = catMetadata[winningPartyId] || {};
          winners[cat] = {
            partyName: metadata.partyName || winningPartyId,
            partyColor: metadata.partyColor || '#666',
            partySymbolUrl: metadata.partySymbolUrl || '',
            percentage: totalCatVotes > 0 ? (winningCount / totalCatVotes) * 100 : 0
          };
        }
      });
      
      historicalData.push({
        date: data.date,
        totalVotes: data.totalVotes,
        winners
      });
    });
    
    return historicalData;
  } catch (error: any) {
    console.error('❌ Error cargando historial:', error.message);
    return null;
  }
}
