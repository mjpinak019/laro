import type { Difficulty } from '../rules';
export const LUBID = { jumpDuration: .54, jumpHeight: 86, buffer: .075, clearance: 24, target: 30 };
export type LubidState = { time: number; nextPass: number; jumpAt: number | null; buffered: boolean; cleared: number; lives: number; jumps: number; phase: 'ready' | 'playing' | 'won' | 'lost'; ready: number; difficulty: Difficulty };
export const lubidPeriod = (cleared: number, difficulty: Difficulty) => Math.max(.66, (1.5 - cleared * .034) * (difficulty === 'hard' ? .8 : difficulty === 'normal' ? .9 : 1));
export function initialLubid(difficulty: Difficulty = 'easy'): LubidState { return { time: 0, nextPass: 1.2, jumpAt: null, buffered: false, cleared: 0, lives: 3, jumps: 0, phase: 'ready', ready: 2, difficulty }; }
export function lubidJumpHeight(state: LubidState, at = state.time): number {
  if (state.jumpAt === null) return 0; const t = (at - state.jumpAt) / LUBID.jumpDuration;
  return t > 0 && t < 1 ? Math.sin(t * Math.PI) * LUBID.jumpHeight : 0;
}
export function jumpLubid(state: LubidState): boolean {
  if (state.phase !== 'playing') return false;
  if (state.jumpAt !== null && state.time - state.jumpAt < LUBID.jumpDuration) {
    if (LUBID.jumpDuration - (state.time - state.jumpAt) <= LUBID.buffer) state.buffered = true;
    return false;
  }
  state.jumpAt = state.time; state.jumps++; return true;
}
export function tickLubid(state: LubidState, seconds: number): 'clear' | 'hit' | null {
  const dt = Math.max(0, Math.min(.05, seconds));
  if (state.phase === 'ready') { state.ready -= dt; if (state.ready <= 0) state.phase = 'playing'; return null; }
  if (state.phase !== 'playing') return null;
  state.time += dt;
  if (state.jumpAt !== null && state.time - state.jumpAt >= LUBID.jumpDuration && state.buffered) { state.buffered = false; state.jumpAt = state.time; state.jumps++; }
  if (state.time < state.nextPass) return null;
  const clear = lubidJumpHeight(state, state.nextPass) >= LUBID.clearance;
  if (clear) state.cleared++; else { state.lives--; state.jumpAt = null; state.buffered = false; }
  if (state.cleared >= LUBID.target) state.phase = 'won'; else if (!state.lives) state.phase = 'lost';
  state.nextPass += clear ? lubidPeriod(state.cleared, state.difficulty) : 1.2;
  return clear ? 'clear' : 'hit';
}
