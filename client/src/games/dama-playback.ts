import type { DamaMove } from './dama-rules';

export const BOT_MOVE_TIMING = { focus: 280, slide: 440, land: 220 };
export const damaSquareName = (at: number) => `${String.fromCharCode(97 + at % 8)}${8 - Math.floor(at / 8)}`;
export function botMoveFrame(move: DamaMove, elapsed: number) {
  const duration = BOT_MOVE_TIMING.slide + BOT_MOVE_TIMING.land;
  const time = Math.max(0, elapsed - BOT_MOVE_TIMING.focus);
  const hop = Math.min(move.path.length - 1, Math.floor(time / duration));
  const local = time - hop * duration;
  const phase = elapsed < BOT_MOVE_TIMING.focus ? 'focus' : time >= duration * move.path.length ? 'done' : local < BOT_MOVE_TIMING.slide ? 'slide' : 'land';
  const linear = phase === 'focus' ? 0 : phase === 'slide' ? local / BOT_MOVE_TIMING.slide : 1;
  return { phase, hop, from: hop ? move.path[hop - 1] : move.from, to: move.path[hop], progress: linear * linear * (3 - 2 * linear), landed: hop + (phase === 'land' || phase === 'done' ? 1 : 0) };
}
