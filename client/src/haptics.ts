import type { FailureKind } from './games/types';
/** Optional hardware feedback: unsupported/blocked browsers keep normal gameplay. */
export class FailureFeedback {
  private last = -Infinity;
  constructor(private enabled: () => boolean) {}
  trigger = (kind: FailureKind = 'hit') => {
    const now = performance.now();
    if (!this.enabled() || document.hidden || typeof navigator.vibrate !== 'function' || now - this.last < 180) return;
    this.last = now;
    try { navigator.vibrate(kind === 'mistake' ? 25 : kind === 'loss' ? [70, 40, 100] : [45, 30, 65]); } catch { /* Hardware feedback is never required to play. */ }
  };
}
