import { 
  doc, 
  getDoc, 
  updateDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { getDb, isFirebaseReady } from './index';
import { COLLECTIONS, type GlobalStats } from './config';

/**
 * Agregar voto a estadísticas globales
 * Se llama cada vez que un usuario vota
 */
export async function addVoteToGlobalStats(
  date: string,
  category: string,
  partyId: string
): Promise<boolean> {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible para estadísticas globales');
    return false;
  }
  
  try {
    const db = getDb();
    const statsRef = doc(db, COLLECTIONS.GLOBAL_STATS, date);
    
    // Intentar actualizar documento existente
    try {
      await updateDoc(statsRef, {
        [`categories.${category}.${partyId}`]: increment(1),
        totalVotes: increment(1),
        lastUpdated: serverTimestamp()
      });
    } catch (error: any) {
      // Si el documento no existe, crearlo
      if (error.code === 'not-found') {
        await updateDoc(statsRef, {
          date,
          totalVotes: 1,
          lastUpdated: serverTimestamp(),
          categories: {
            [category]: { [partyId]: 1 }
          }
        });
      } else {
        throw error;
      }
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
