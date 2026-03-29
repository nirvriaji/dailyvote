import type { VoteSelection } from '$lib/types';
import { saveVote, markVoteCompleted } from '$lib/firebase/votes';
import { getAnonymousDeviceId } from '$lib/firebase/device';

class VoteStore {
  votes = $state(new Map<string, VoteSelection>());
  deviceId = $state<string>('');
  isSubmitting = $state(false);

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

  // Guardar voto localmente (sin enviar a Firebase aún)
  cast(selection: VoteSelection) {
    const next = new Map(this.votes);
    next.set(selection.columnId, selection);
    this.votes = next;
    
    // Solo guardar en localStorage, NO en Firebase
    // Firebase se usará solo al hacer submit
    this.persistToLocalStorage();
  }

  // Enviar TODOS los votos acumulados a Firebase (llamado al hacer "Entregar cédula")
  async submitVotes(): Promise<boolean> {
    if (this.votes.size === 0) return false;
    
    this.isSubmitting = true;
    const date = new Date().toISOString().split('T')[0];
    const categoryMap: Record<string, string> = {
      'col0': 'president',
      'col1': 'senatorsNational',
      'col2': 'senatorsRegional',
      'col3': 'deputies',
      'col4': 'andeanParliament'
    };

    try {
      // Enviar cada voto acumulado a Firebase
      for (const [columnId, voteData] of this.votes) {
        const category = categoryMap[columnId] || columnId;
        await saveVote(date, category, {
          partyId: voteData.partyName,
          partyName: voteData.partyName
        });
      }
      
      // Marcar como completado si hay 5 votos
      if (this.count === this.total) {
        await markVoteCompleted(date);
      }
      
      this.isSubmitting = false;
      return true;
    } catch (err) {
      console.error('Error submitting votes to Firebase:', err);
      this.isSubmitting = false;
      return false;
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
      // Limpiar también sessionStorage para la sesión actual
      sessionStorage.removeItem('dailyvote');
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
