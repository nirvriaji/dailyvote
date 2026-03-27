import type { VoteSelection } from '$lib/types';

class VoteStore {
  votes = $state(new Map<string, VoteSelection>());

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

  cast(selection: VoteSelection) {
    const next = new Map(this.votes);
    next.set(selection.columnId, selection);
    this.votes = next;
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
    return JSON.stringify(Array.from(this.votes.entries()));
  }

  hydrate(raw: string) {
    try {
      const entries = JSON.parse(raw) as [string, VoteSelection][];
      this.votes = new Map(entries);
    } catch {
      // ignore malformed session data
    }
  }
}

export const vote = new VoteStore();
