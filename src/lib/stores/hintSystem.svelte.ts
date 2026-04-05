// Contextual hint system for the ballot simulator.
// Shows each hint at most once per column/target type.

type HintState = { text: string; anchorEl: HTMLElement } | null;

// ─── Shown-hints registry ────────────────────────────────────────────────────
// Keyed by section name (matching data-demo section values).
const shownHints = $state<Record<string, Record<string, boolean>>>({
  'presidente':         { simbolo: false, foto: false },
  'senadores-nacional': { simbolo: false, pref1: false, pref2: false },
  'senadores-regional': { simbolo: false, pref1: false },
  'diputados':          { simbolo: false, pref1: false, pref2: false },
  'parlamento-andino':  { simbolo: false, pref1: false, pref2: false },
});

// ─── Preferential interaction tracker ────────────────────────────────────────
// Becomes true after the first real tap/click on any pref slot in that column.
// Drives the "un candidato" vs "otro candidato" copy rule.
const prefInteracted = $state<Record<string, boolean>>({
  'senadores-nacional': false,
  'senadores-regional': false,
  'diputados':          false,
  'parlamento-andino':  false,
});

// ─── Active hint ─────────────────────────────────────────────────────────────
let activeHint = $state<HintState>(null);
let _timer: ReturnType<typeof setTimeout> | null = null;

export function getActiveHint(): HintState {
  return activeHint;
}

export function dismissHint() {
  if (_timer) { clearTimeout(_timer); _timer = null; }
  activeHint = null;
}

function show(text: string, el: HTMLElement) {
  if (_timer) clearTimeout(_timer);
  activeHint = { text, anchorEl: el };
  _timer = setTimeout(dismissHint, 3500);
}

// ─── Main click handler (attach via event delegation on .ballot-area) ────────
export function handleBallotClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const demoEl = target.closest<HTMLElement>('[data-demo]');
  if (!demoEl) return;

  const demo = demoEl.getAttribute('data-demo');
  if (!demo) return;

  const parts = demo.split('-');
  const prefix = parts[0];

  // ── simbolo-{section}-{rowIndex} ──────────────────────────────────────────
  if (prefix === 'simbolo') {
    const section = parts.slice(1, -1).join('-');
    const hints = shownHints[section];
    if (!hints || hints['simbolo']) return;
    hints['simbolo'] = true;
    show('Puedes marcar una cruz (+) o aspa (×) en el símbolo del partido.', demoEl);

  // ── foto-{section}-{rowIndex} ─────────────────────────────────────────────
  } else if (prefix === 'foto') {
    const section = parts.slice(1, -1).join('-');
    if (section !== 'presidente') return;
    const hints = shownHints['presidente'];
    if (hints['foto']) return;
    hints['foto'] = true;
    show('Puedes marcar una cruz (+) o aspa (×) en la fotografía.', demoEl);

  // ── preferencial-{section}-{rowIndex}-{slotIndex} ─────────────────────────
  } else if (prefix === 'preferencial') {
    const slotIndex = parseInt(parts[parts.length - 1], 10);
    const section = parts.slice(1, -2).join('-');
    const hints = shownHints[section];
    if (!hints) return;

    const prefKey = slotIndex === 0 ? 'pref1' : 'pref2';
    if (hints[prefKey]) return; // already shown for this slot

    // Copy rule: "otro candidato" only if a pref was already interacted with in
    // this same column — regardless of which slot was clicked first.
    const alreadyInteracted = prefInteracted[section] ?? false;
    const text = alreadyInteracted
      ? 'Puedes seleccionar el nro. de otro candidato.'
      : 'Puedes seleccionar el nro. de un candidato.';

    // Mark column as having had at least one pref interaction
    if (!alreadyInteracted) prefInteracted[section] = true;

    hints[prefKey] = true;
    show(text, demoEl);
  }
}
