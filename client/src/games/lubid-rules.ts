import type { Difficulty } from '../rules';
export const LUBID = { jumpDuration: .54, jumpHeight: 86, buffer: .075, clearance: 24, milestone: 100, coinCap: 100, variationAt: 50 };
export type LubidState = { time: number; nextPass: number; rotation: number; rate: number; recovery: number; jumpAt: number | null; buffered: boolean; cleared: number; lives: number; jumps: number; phase: 'ready' | 'playing' | 'finished'; ready: number; difficulty: Difficulty };
export const lubidCapPeriod = (difficulty: Difficulty) => difficulty === 'hard' ? .60 : difficulty === 'normal' ? .62 : .64;
/** Targets change at pass boundaries; actual angular speed eases toward them continuously. */
export function lubidPeriod(cleared: number, difficulty: Difficulty): number {
  const cap = lubidCapPeriod(difficulty), start = difficulty === 'hard' ? 1.2 : difficulty === 'normal' ? 1.35 : 1.5;
  if (cleared < LUBID.variationAt) return Math.max(cap, start - cleared * .024);
  return cap * [1, 1.65, 1.08, 1.42, 1][Math.floor((cleared - LUBID.variationAt) / 5) % 5];
}
export const lubidCoins = (cleared: number) => Math.min(LUBID.coinCap, Math.floor(Math.max(0, cleared) / 2));
export function initialLubid(difficulty: Difficulty = 'easy'): LubidState {
  const period = lubidPeriod(0, difficulty);
  return { time: 0, nextPass: 1.2, rotation: 1 - 1.2 / period, rate: 1 / period, recovery: 0, jumpAt: null, buffered: false, cleared: 0, lives: 3, jumps: 0, phase: 'ready', ready: 2, difficulty };
}
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
export function finishLubid(state: LubidState): boolean {
  if (state.phase !== 'playing') return false;
  state.phase = 'finished'; state.buffered = false; return true;
}
export function tickLubid(state: LubidState, seconds: number): 'clear' | 'hit' | null {
  const dt = Math.max(0, Math.min(.05, seconds));
  if (state.phase === 'ready') { state.ready -= dt; if (state.ready <= 0) state.phase = 'playing'; return null; }
  if (state.phase !== 'playing') return null;
  const previousTime = state.time; state.time += dt;
  if (state.jumpAt !== null && state.time - state.jumpAt >= LUBID.jumpDuration && state.buffered) { state.buffered = false; state.jumpAt += LUBID.jumpDuration; state.jumps++; }
  if (state.recovery > 0) { state.recovery = Math.max(0, state.recovery - dt); state.nextPass = state.time + state.recovery + (1 - state.rotation) / state.rate; return null; }
  const previousRate = state.rate, targetRate = 1 / lubidPeriod(state.cleared, state.difficulty);
  state.rate += (targetRate - state.rate) * (1 - Math.exp(-dt * 3.5));
  state.rate = Math.min(1 / lubidCapPeriod(state.difficulty), state.rate);
  const advance = (previousRate + state.rate) * .5 * dt, before = state.rotation;
  state.rotation += advance;
  let event: 'clear' | 'hit' | null = null;
  if (state.rotation >= 1) {
    const passAt = previousTime + dt * (1 - before) / Math.max(advance, .000001);
    const clear = lubidJumpHeight(state, passAt) >= LUBID.clearance;
    state.rotation -= 1;
    if (clear) { state.cleared++; event = 'clear'; }
    else { state.lives--; state.jumpAt = null; state.buffered = false; state.recovery = .75; event = 'hit'; }
    if (!state.lives) state.phase = 'finished';
  }
  state.nextPass = state.time + state.recovery + (1 - state.rotation) / state.rate;
  return event;
}
