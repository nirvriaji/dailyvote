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
