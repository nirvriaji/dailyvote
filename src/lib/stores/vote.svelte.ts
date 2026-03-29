import type { VoteSelection } from '$lib/types';
import { saveVote, markVoteCompleted } from '$lib/firebase/votes';
import { getAnonymousDeviceId } from '$lib/firebase/device';

class VoteStore {
  votes = $state(new Map<string, VoteSelection>());
  deviceId = $state<string>('');

  constructor() {
    // Generar/obtener ID del dispositivo al iniciar
    if (typeof window !== 'undefined') {
      this.deviceId = getAnonymousDeviceId();
    }
  }

  get count(): number {
    return this.votes.size;
  }

  get total(): number {
    return 5;
  }

  hasVoted(columnId: string): boolean {
    return this.votes.has(columnId);
  }

  getVote(columnId: string): VoteSelection | undefined {
    return this.votes.get(columnId);
  }

  // Actualizar números de voto preferencial para un voto existente
  updatePreferenceNumbers(columnId: string, preferenceNumbers: (number | null)[]) {
    const existingVote = this.votes.get(columnId);
    if (existingVote) {
      const updatedVote = {
        ...existingVote,
        preferenceNumbers
      };
      const next = new Map(this.votes);
      next.set(columnId, updatedVote);
      this.votes = next;
      
      // Guardar en localStorage para persistencia
      this.persistToLocalStorage();
    }
  }

  // Verificar si tiene números de preferencia
  hasPreferenceNumbers(columnId: string): boolean {
    const vote = this.votes.get(columnId);
    return vote?.preferenceNumbers !== undefined && 
           vote.preferenceNumbers.some(n => n !== null);
  }

  // Obtener números de preferencia
  getPreferenceNumbers(columnId: string): (number | null)[] | undefined {
    return this.votes.get(columnId)?.preferenceNumbers;
  }

  // Persistir a localStorage
  private persistToLocalStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dailyvote_preferences', JSON.stringify({
        votes: Array.from(this.votes.entries())
      }));
    }
  }

  async cast(selection: VoteSelection) {
    const next = new Map(this.votes);
    next.set(selection.columnId, selection);
    this.votes = next;
    
    // Guardar automáticamente en Firebase (anónimo)
    const date = new Date().toISOString().split('T')[0];
    const categoryMap: Record<string, string> = {
      'col0': 'president',
      'col1': 'senatorsNational',
      'col2': 'senatorsRegional',
      'col3': 'deputies',
      'col4': 'andeanParliament'
    };
    
    const category = categoryMap[selection.columnId] || selection.columnId;
    
    try {
      await saveVote(date, category, {
        partyId: selection.partyName, // Usar nombre del partido como ID consistente
        partyName: selection.partyName
      });
    } catch (err) {
      console.error('Error saving to Firebase:', err);
    }
    
    // Si completó los 5, marcar como completado
    if (this.count === this.total) {
      try {
        await markVoteCompleted(date);
      } catch (err) {
        console.error('Error marking completed:', err);
      }
    }
  }

  remove(columnId: string) {
    const next = new Map(this.votes);
    next.delete(columnId);
    this.votes = next;
  }

  reset() {
    this.votes = new Map();
  }

  // Limpiar todo y preparar para nueva simulación
  resetForNewSimulation() {
    this.votes = new Map();
    this.clearLocalStorage();
  }

  private clearLocalStorage() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dailyvote_preferences');
      localStorage.removeItem('dailyvote_selected_rows');
      localStorage.removeItem('dailyvote_president_selections');
      localStorage.removeItem('dailyvote_president_row');
      // NO eliminar dailyvote_device_id ni dailyvote_seen_tour
    }
  }

  serialize(): string {
    return JSON.stringify({
      deviceId: this.deviceId,
      votes: Array.from(this.votes.entries())
    });
  }

  hydrate(raw: string) {
    try {
      const data = JSON.parse(raw);
      if (data.votes) {
        this.votes = new Map(data.votes);
      }
    } catch {
      // ignore malformed session data
    }
  }
}

export const vote = new VoteStore();
