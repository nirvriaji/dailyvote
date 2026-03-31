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
import { getDb, isFirebaseReady, canStillSimulate } from './index';
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
        totalSimulations: 0, // Inicializar en 0, se incrementará con incrementSimulationCount
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
 * Incrementar contador de simulaciones completadas
 * Se llama una vez por cada simulación completa (no por cada voto)
 * Permite incrementar continuamente hasta el 12 de abril a las 07:00
 */
export async function incrementSimulationCount(date: string): Promise<boolean> {
  console.log(`🔢 incrementSimulationCount llamado para fecha: ${date}`);
  
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible para contador de simulaciones');
    return false;
  }
  
  // Verificar si aún se pueden hacer simulaciones (hasta el 12 de abril a las 07:00)
  if (!canStillSimulate()) {
    console.warn('🚫 Las simulaciones ya cerraron. Solo se pueden revisar resultados.');
    return false;
  }
  
  try {
    const db = getDb();
    const statsRef = doc(db, COLLECTIONS.GLOBAL_STATS, date);
    
    const docSnap = await getDoc(statsRef);
    
    if (docSnap.exists()) {
      const currentData = docSnap.data();
      
      // Si totalSimulations no existe, inicializarlo a 0 primero
      if (currentData.totalSimulations === undefined || currentData.totalSimulations === null) {
        console.log(`📊 Inicializando totalSimulations a 0 para ${date}`);
        await updateDoc(statsRef, {
          totalSimulations: 0,
          lastUpdated: serverTimestamp()
        });
      }
      
      const currentCount = currentData.totalSimulations || 0;
      console.log(`📊 Incrementando totalSimulations de ${currentCount} a ${currentCount + 1}`);
      
      await updateDoc(statsRef, {
        totalSimulations: increment(1),
        lastUpdated: serverTimestamp()
      });
      
      console.log(`✅ Contador incrementado exitosamente para ${date}`);
    } else {
      console.log(`📊 Creando nuevo documento con totalSimulations: 1`);
      const { setDoc } = await import('firebase/firestore');
      await setDoc(statsRef, {
        date,
        totalVotes: 0,
        totalSimulations: 1,
        lastUpdated: serverTimestamp(),
        categories: {
          president: {},
          senatorsNational: {},
          senatorsRegional: {},
          deputies: {},
          andeanParliament: {}
        },
        metadata: {}
      });
      console.log(`✅ Documento creado con totalSimulations: 1`);
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Error incrementando contador de simulaciones:', error.message);
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
 * Obtener resumen ACUMULADO histórico de todas las categorías con porcentajes
 * Usa datos de TODOS los días, no solo de uno
 */
export async function getAccumulatedResultsWithPercentages(): Promise<Record<string, Array<{ partyId: string; count: number; percentage: number }>> | null> {
  const accumulatedResults = await getAccumulatedResults();
  if (!accumulatedResults) return null;
  
  // Calculate percentages for each category
  const result: Record<string, Array<{ partyId: string; count: number; percentage: number }>> = {};
  
  Object.entries(accumulatedResults).forEach(([category, partyVotes]) => {
    result[category] = calculatePercentages(partyVotes);
  });
  
  return result;
}

/**
 * Guardar snapshot histórico a medianoche
 * Crea una copia del estado acumulado hasta ese momento para el historial
 * No reinicia ni borra el acumulado general
 */
export async function saveDailySnapshot(date: string): Promise<boolean> {
  if (!isFirebaseReady) {
    console.warn('Firebase no disponible para guardar snapshot');
    return false;
  }
  
  try {
    const db = getDb();
    const statsRef = doc(db, COLLECTIONS.GLOBAL_STATS, date);
    const snapshotRef = doc(db, 'daily_snapshots', date);
    
    const docSnap = await getDoc(statsRef);
    
    if (!docSnap.exists()) {
      console.log(`⚠️ No hay datos para guardar snapshot del ${date}`);
      return false;
    }
    
    const data = docSnap.data() as GlobalStats;
    const { setDoc } = await import('firebase/firestore');
    
    // Guardar snapshot con timestamp de cuándo se guardó
    await setDoc(snapshotRef, {
      date,
      snapshotSavedAt: serverTimestamp(),
      totalVotes: data.totalVotes,
      totalSimulations: data.totalSimulations,
      categories: data.categories,
      metadata: data.metadata
    });
    
    console.log(`📸 Snapshot guardado para ${date}`);
    return true;
  } catch (error: any) {
    console.error('❌ Error guardando snapshot:', error.message);
    return false;
  }
}

/**
 * Obtener historial de snapshots diarios
 */
export async function getDailySnapshots(days: number = 30): Promise<Array<{
  date: string;
  totalVotes: number;
  totalSimulations: number;
  snapshotSavedAt: any;
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
    const snapshotsCollection = collection(db, 'daily_snapshots');
    
    // Query last N days, ordered by date descending
    const q = query(snapshotsCollection, orderBy('date', 'desc'), limit(days));
    const querySnapshot = await getDocs(q);
    
    const snapshotData: Array<any> = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const winners: any = {};
      
      // Calculate winner for each category
      const categories = ['president', 'senatorsNational', 'senatorsRegional', 'deputies', 'andeanParliament'];
      categories.forEach(cat => {
        const catStats = data.categories?.[cat] || {};
        const catMetadata = data.metadata?.[cat] || {};
        
        if (Object.keys(catStats).length > 0) {
          // Find party with most votes
          const entries = Object.entries(catStats);
          entries.sort((a, b) => (b[1] as number) - (a[1] as number));
          const [winningPartyId, winningCount] = entries[0];
          const totalCatVotes = entries.reduce((sum, [, count]) => sum + (count as number), 0);
          
          const metadata = catMetadata[winningPartyId] || {};
          winners[cat] = {
            partyName: metadata.partyName || winningPartyId,
            partyColor: metadata.partyColor || '#666',
            partySymbolUrl: metadata.partySymbolUrl || '',
            percentage: totalCatVotes > 0 ? ((winningCount as number) / totalCatVotes) * 100 : 0
          };
        }
      });
      
      snapshotData.push({
        date: data.date,
        totalVotes: data.totalVotes,
        totalSimulations: data.totalSimulations,
        snapshotSavedAt: data.snapshotSavedAt,
        winners
      });
    });
    
    return snapshotData;
  } catch (error: any) {
    console.error('❌ Error cargando snapshots:', error.message);
    return null;
  }
}
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

/**
 * Obtener el total acumulado de simulaciones de todos los días
 * Usa totalVotes / 5 como métrica consistente con la página de historial
 */
export async function getAccumulatedSimulations(): Promise<number> {
  if (!isFirebaseReady) return 0;
  
  try {
    const db = getDb();
    const statsCollection = collection(db, COLLECTIONS.GLOBAL_STATS);
    
    // Query all documents (no limit)
    const q = query(statsCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    let totalSimulations = 0;
    let totalVotes = 0;
    let documentCount = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as GlobalStats;
      documentCount++;
      
      // Usar totalVotes / 5 (consistente con cómo Historial calcula)
      const dayVotes = data.totalVotes || 0;
      const daySims = data.totalSimulations || Math.floor(dayVotes / 5) || 0;
      
      totalVotes += dayVotes;
      totalSimulations += daySims;
      
      console.log(`📊 Día ${data.date}: ${dayVotes} votos = ${daySims} simulaciones`);
    });
    
    // Recalcular basado en totalVotes / 5 para consistencia con Historial
    const calculatedFromVotes = Math.floor(totalVotes / 5);
    
    console.log(`📊 Resumen: ${documentCount} días, ${totalVotes} votos totales`);
    console.log(`📊 Total acumulado (desde totalSimulations): ${totalSimulations}`);
    console.log(`📊 Total acumulado (desde totalVotes/5): ${calculatedFromVotes}`);
    
    // Retornar el mayor de ambos para no perder datos
    return Math.max(totalSimulations, calculatedFromVotes);
  } catch (error: any) {
    console.error('❌ Error calculando simulaciones acumuladas:', error.message);
    return 0;
  }
}

/**
 * Obtener estadísticas acumuladas de votos por categoría (histórico total)
 * Agrega los votos de todos los días para cada partido
 */
export async function getAccumulatedResults(): Promise<Record<string, Record<string, number>> | null> {
  if (!isFirebaseReady) return null;
  
  try {
    const db = getDb();
    const statsCollection = collection(db, COLLECTIONS.GLOBAL_STATS);
    
    // Query all documents
    const q = query(statsCollection, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const accumulatedResults: Record<string, Record<string, number>> = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as GlobalStats;
      console.log(`📄 Procesando documento: ${data.date}, categorías:`, Object.keys(data.categories || {}));
      
      // Accumulate votes per category
      const categories = ['president', 'senatorsNational', 'senatorsRegional', 'deputies', 'andeanParliament'];
      categories.forEach(cat => {
        const catStats = data.categories?.[cat as keyof typeof data.categories];
        console.log(`   Categoría ${cat}:`, catStats ? Object.keys(catStats).length : 0, 'partidos');
        
        if (catStats && typeof catStats === 'object') {
          if (!accumulatedResults[cat]) {
            accumulatedResults[cat] = {};
          }
          
          // Sum votes for each party
          Object.entries(catStats).forEach(([partyId, votes]) => {
            const voteCount = typeof votes === 'number' ? votes : 0;
            accumulatedResults[cat][partyId] = (accumulatedResults[cat][partyId] || 0) + voteCount;
          });
        }
      });
    });
    
    console.log('📊 Resultados acumulados:', accumulatedResults);
    return accumulatedResults;
  } catch (error: any) {
    console.error('❌ Error calculando resultados acumulados:', error.message);
    return null;
  }
}
