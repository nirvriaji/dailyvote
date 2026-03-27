import type { Action } from 'svelte/action';
import type { GestureCallbacks, GestureIntent } from '$lib/types';

const INTENT_THRESHOLD = 8; // px of movement before we decide H vs V
const MAX_HISTORY = 12;

interface Point { x: number; y: number; t: number }

function calcVelocity(history: Point[]): { vx: number; vy: number } {
  if (history.length < 2) return { vx: 0, vy: 0 };
  const window = history.slice(-5);
  const a = window[0];
  const b = window[window.length - 1];
  const dt = b.t - a.t;
  if (dt < 8) return { vx: 0, vy: 0 };
  return { vx: (b.x - a.x) / dt, vy: (b.y - a.y) / dt };
}

/**
 * Svelte action that handles pointer-based gesture detection.
 * Determines horizontal vs vertical intent, then locks the axis.
 * Calls provided callbacks with delta and intent info.
 *
 * Usage: <div use:gesture={callbacks}>
 */
export const gesture: Action<HTMLElement, GestureCallbacks> = (node, params) => {
  let cbs: GestureCallbacks = params ?? {};
  let active = false;
  let pid: number | null = null;
  let startX = 0, startY = 0;
  let lastX = 0, lastY = 0;
  let intent: GestureIntent = null;
  const history: Point[] = [];

  function onDown(e: PointerEvent) {
    if (pid !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    active = true;
    pid = e.pointerId;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    intent = null;
    history.length = 0;
    history.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    // No setPointerCapture: the viewport covers the full screen (position:fixed inset:0)
    // so pointermove/pointerup still reach us via bubbling, and click events fire
    // correctly on child elements (BallotRow) after a tap without dragging.
    cbs.onStart?.();
  }

  function onMove(e: PointerEvent) {
    if (!active || e.pointerId !== pid) return;

    history.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (history.length > MAX_HISTORY) history.shift();

    const totalDx = e.clientX - startX;
    const totalDy = e.clientY - startY;

    // Determine intent from first meaningful movement
    if (!intent && (Math.abs(totalDx) > INTENT_THRESHOLD || Math.abs(totalDy) > INTENT_THRESHOLD)) {
      intent = Math.abs(totalDx) >= Math.abs(totalDy) ? 'horizontal' : 'vertical';
    }

    // Block native scroll when moving horizontally
    if (intent === 'horizontal') e.preventDefault();

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Only notify once we know the intent — avoids jitter on pure taps
    if (intent) cbs.onMove?.(dx, dy, intent);
  }

  function onUp(e: PointerEvent) {
    if (!active || e.pointerId !== pid) return;
    active = false;
    pid = null;
    const { vx, vy } = calcVelocity(history);
    cbs.onEnd?.(intent, vx, vy);
    intent = null;
  }

  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointermove', onMove, { passive: false });
  node.addEventListener('pointerup', onUp);
  node.addEventListener('pointercancel', onUp);

  return {
    update(next: GestureCallbacks) {
      cbs = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', onDown);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      node.removeEventListener('pointercancel', onUp);
    },
  };
};
