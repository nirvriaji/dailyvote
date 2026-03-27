import type { BallotRow } from '$lib/types';

class UIStore {
  onboardingDone = $state(false);
  activeRow = $state<BallotRow | null>(null);
  showSummary = $state(false);

  selectRow(row: BallotRow) {
    this.activeRow = row;
    this.showSummary = false;
  }

  closeOverlay() {
    this.activeRow = null;
  }

  skipOnboarding() {
    this.onboardingDone = true;
  }

  toggleSummary() {
    this.showSummary = !this.showSummary;
    if (this.showSummary) this.activeRow = null;
  }

  closeSummary() {
    this.showSummary = false;
  }
}

export const ui = new UIStore();
