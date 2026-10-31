import type { Difficulty, Point } from '../rules.ts';

export const TUMBANG_LINE = 440;
export const TUMBANG_LEVELS = {
  easy: { guardSpeed: 138, runnerSpeed: 170, reset: 1.5, error: .14, guide: true },
  normal: { guardSpeed: 175, runnerSpeed: 190, reset: 1, error: .075, guide: true },
  hard: { guardSpeed: 210, runnerSpeed: 205, reset: .65, error: .025, guide: false },
} as const;
export type TumbangPhase = 'aim' | 'power' | 'bot-aim' | 'flight' | 'retrieve' | 'feedback' | 'finished';
export type TumbangState = {
  difficulty: Difficulty; turn: number; phase: TumbangPhase; clock: number; elapsed: number;
  scores: [number, number]; players: [Point, Point]; target?: Point; autoRetrieve: boolean;
  can: Point & { vx: number; vy: number; angle: number; spin: number; down: boolean; reset: number };
  slipper: Point; origin: Point; landing: Point; flightTime: number; hit: boolean; carrying: boolean;
  angle: number; power: number; message: string; tagged: boolean;
};
export const tumbangPower = (time: number) => { const t = time % 1.3 / .65; return t <= 1 ? t : 2 - t; };
export function initialTumbang(difficulty: Difficulty = 'easy'): TumbangState {
  return { difficulty, turn: 0, phase: 'aim', clock: 0, elapsed: 0, scores: [0, 0], players: [{ x: 450, y: 480 }, { x: 555, y: 220 }],
    autoRetrieve: false, can: { x: 450, y: 200, vx: 0, vy: 0, angle: 0, spin: 0, down: false, reset: 0 }, slipper: { x: 450, y: 480 }, origin: { x: 450, y: 480 }, landing: { x: 450, y: 200 }, flightTime: 0, hit: false, carrying: false, angle: -Math.PI / 2, power: .55, message: 'Aim at the tin can. Start the meter, then tap again to throw.', tagged: false };
}
export function launchTumbang(state: TumbangState, angle: number, power: number) {
  if (!['aim', 'power', 'bot-aim'].includes(state.phase)) return false;
  const from = state.players[state.turn % 2], distance = 100 + Math.max(0, Math.min(1, power)) * 360;
  state.origin = { ...from }; state.slipper = { ...from }; state.landing = { x: Math.max(60, Math.min(840, from.x + Math.cos(angle) * distance)), y: Math.max(75, Math.min(515, from.y + Math.sin(angle) * distance)) };
  state.angle = angle; state.power = power; state.phase = 'flight'; state.clock = 0; state.elapsed = 0; state.flightTime = 0; state.message = 'Tsinelas in flight!'; return true;
}
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function move(at: Point, target: Point, speed: number, dt: number) {
  const d = distance(at, target), step = Math.min(d, speed * dt); if (d) { at.x += (target.x - at.x) / d * step; at.y += (target.y - at.y) / d * step; }
  at.x = Math.max(65, Math.min(835, at.x)); at.y = Math.max(85, Math.min(515, at.y));
}
function hitsCan(a: Point, b: Point, can: Point) {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((can.x - a.x) * dx + (can.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(a.x + dx * t - can.x, a.y + dy * t - can.y) <= 20;
}
function finishTurn(state: TumbangState, tagged: boolean) {
  const thrower = state.turn % 2, guard = 1 - thrower; state.tagged = tagged;
  if (tagged) { state.scores[guard]++; state.message = `${guard === 0 ? 'You' : 'Eric'} tagged the thrower after resetting the can. Guard scores!`; }
  else if (state.carrying && state.hit) { state.scores[thrower]++; state.message = `${thrower === 0 ? 'You' : 'Eric'} knocked the can down and brought the tsinelas home. One point!`; }
  else state.message = 'No point this throw. Knock the can down and retrieve the tsinelas safely.';
  state.phase = 'feedback'; state.target = undefined;
}
export function nextTumbangTurn(state: TumbangState) {
  if (state.phase !== 'feedback') return;
  if (state.turn === 5) { state.phase = 'finished'; return; }
  const next = initialTumbang(state.difficulty), turn = state.turn + 1, scores = state.scores;
  Object.assign(state, next, { turn, scores, phase: turn % 2 ? 'bot-aim' : 'aim' });
  if (turn % 2) { state.players = [{ x: 555, y: 220 }, { x: 450, y: 480 }]; state.message = 'Your turn to guard. Eric will throw. Reset the fallen can before you chase him!'; }
}
/** Fixed-step court: a guard may tag only while the can is upright, and only
 * outside the safety line. Both actors must physically reach/reset the can. */
export function stepTumbang(state: TumbangState, dt: number) {
  if (['feedback', 'finished', 'aim'].includes(state.phase) || dt <= 0) return;
  const level = TUMBANG_LEVELS[state.difficulty], thrower = state.turn % 2, guard = 1 - thrower;
  state.clock += dt; state.elapsed += dt;
  if (state.phase === 'power') { state.power = tumbangPower(state.clock); return; }
  if (state.phase === 'bot-aim') {
    if (state.clock >= 1.2) launchTumbang(state, -Math.PI / 2 + Math.sin(state.turn * 2.17) * level.error, .61 + Math.cos(state.turn * 1.4) * .07);
    return;
  }
  const can = state.can;
  can.x = Math.max(85, Math.min(815, can.x + can.vx * dt)); can.y = Math.max(85, Math.min(410, can.y + can.vy * dt));
  can.angle += can.spin * dt; can.vx *= Math.exp(-3 * dt); can.vy *= Math.exp(-3 * dt); can.spin *= Math.exp(-2.3 * dt);
  if (state.phase === 'flight') {
    const previous = { ...state.slipper }; state.flightTime = Math.min(1, state.flightTime + dt / .8);
    state.slipper = { x: state.origin.x + (state.landing.x - state.origin.x) * state.flightTime, y: state.origin.y + (state.landing.y - state.origin.y) * state.flightTime };
    if (!state.hit && hitsCan(previous, state.slipper, can)) {
      state.hit = true; can.down = true; can.vx = Math.cos(state.angle) * (75 + state.power * 100); can.vy = Math.sin(state.angle) * (75 + state.power * 100);
      can.spin = (state.slipper.x < can.x ? -1 : 1) * (6 + state.power * 8); state.message = 'The can is down! Retrieve your tsinelas and get behind the line.';
    }
    if (state.flightTime >= 1) { state.phase = 'retrieve'; state.clock = 0; state.message = state.hit ? 'Can down! Retrieve the tsinelas before the guard resets and catches you.' : 'Missed! The can is still upright. Retrieve carefully.'; }
  }
  if (state.phase === 'retrieve' || state.phase === 'flight') {
    if (thrower === 1 || state.autoRetrieve) move(state.players[thrower], state.carrying ? { x: state.players[thrower].x, y: 485 } : state.landing, thrower === 0 ? 205 : level.runnerSpeed, dt);
    else if (state.target) move(state.players[0], state.target, 205, dt);
  }
  if (state.phase === 'retrieve') {
    if (!state.carrying && distance(state.players[thrower], state.slipper) < 20) { state.carrying = true; state.message = 'Tsinelas retrieved! Return behind the safety line.'; }
    if (state.carrying && state.players[thrower].y >= TUMBANG_LINE + 12) { finishTurn(state, false); return; }
  }
  if (guard === 1) {
    const target = can.down ? can : state.players[thrower].y < TUMBANG_LINE ? state.players[thrower] : { x: 555, y: 220 };
    move(state.players[guard], target, level.guardSpeed, dt);
  } else if (state.target) move(state.players[0], state.target, 205, dt);
  if (can.down && distance(state.players[guard], can) < 27 && Math.hypot(can.vx, can.vy) < 25) {
    can.reset += dt;
    if (can.reset >= level.reset) { can.down = false; can.angle = 0; can.spin = 0; can.vx = 0; can.vy = 0; state.message = 'Can upright! Guard can tag outside the safety line.'; }
  } else can.reset = 0;
  if (state.phase === 'retrieve' && !can.down && state.players[thrower].y < TUMBANG_LINE && distance(state.players[thrower], state.players[guard]) < 27) { finishTurn(state, true); return; }
  if (state.elapsed > 22) finishTurn(state, false);
}
