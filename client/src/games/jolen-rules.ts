/** Fixed-step circle-marble physics, shared by live play, bot planning, and tests. */
export const COURT = { width: 900, height: 560, left: 35, right: 865, top: 40, bottom: 520, x: 450, y: 280, radius: 157 };
export type Marble = { id: number; x: number; y: number; vx: number; vy: number; radius: number; owner: 0 | 1 | null; collected: boolean };
export type JolenState = { marbles: Marble[]; scores: [number, number]; turn: 0 | 1; shots: number };
export const JOLEN_STEP = 1 / 120;
export const POWER_RISE_MS = 600;
export function powerAt(milliseconds: number) {
  const phase = ((milliseconds % (POWER_RISE_MS * 2)) + POWER_RISE_MS * 2) % (POWER_RISE_MS * 2) / POWER_RISE_MS;
  return .08 + .92 * (phase <= 1 ? phase : 2 - phase);
}
export function initialJolen(): JolenState {
  const marbles: Marble[] = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col <= row; col++) {
    marbles.push({ id: marbles.length, x: 450 + (col - row / 2) * 22, y: 237 + row * 21, vx: 0, vy: 0, radius: 8, owner: null, collected: false });
  }
  for (const [owner, x, y] of [[0, 380, 465], [1, 520, 95]] as const) marbles.push({ id: 15 + owner, x, y, vx: 0, vy: 0, radius: 11, owner, collected: false });
  return { marbles, scores: [0, 0], turn: 0, shots: 0 };
}
export const shooter = (state: JolenState, owner = state.turn) => state.marbles.find(m => m.owner === owner)!;
export const marblesMoving = (state: JolenState) => state.marbles.some(m => !m.collected && Math.hypot(m.vx, m.vy) > 0);
export function shootJolen(state: JolenState, angle: number, power: number) {
  if (marblesMoving(state) || jolenFinished(state) || !Number.isFinite(angle) || !Number.isFinite(power)) return false;
  const marble = shooter(state), speed = 100 + Math.max(0, Math.min(1, power)) * 780;
  marble.vx = Math.cos(angle) * speed; marble.vy = Math.sin(angle) * speed; state.shots++;
  return true;
}
export const jolenFinished = (state: JolenState) => state.scores[0] + state.scores[1] === 15;
export function stepJolen(state: JolenState, dt = JOLEN_STEP): number {
  let collected = 0;
  for (const m of state.marbles) {
    if (m.collected) continue;
    m.x += m.vx * dt; m.y += m.vy * dt;
    const speed = Math.hypot(m.vx, m.vy), next = Math.max(0, speed - 125 * dt);
    if (speed) { m.vx *= next / speed; m.vy *= next / speed; }
    // Collection requires the ENTIRE target to cross the chalk line. Shooters never score.
    if (m.owner === null && Math.hypot(m.x - COURT.x, m.y - COURT.y) > COURT.radius + m.radius) {
      m.collected = true; m.vx = m.vy = 0; state.scores[state.turn]++; collected++; continue;
    }
    // The dirt court edge is separate from the chalk circle. Re-spot at the edge, no points lost.
    const x = Math.max(COURT.left + m.radius, Math.min(COURT.right - m.radius, m.x));
    const y = Math.max(COURT.top + m.radius, Math.min(COURT.bottom - m.radius, m.y));
    if (x !== m.x || y !== m.y) { m.x = x; m.y = y; m.vx = m.vy = 0; }
  }
  const active = state.marbles.filter(m => !m.collected);
  for (let a = 0; a < active.length; a++) for (let b = a + 1; b < active.length; b++) {
    const one = active[a], two = active[b], dx = two.x - one.x, dy = two.y - one.y, distance = Math.hypot(dx, dy), sum = one.radius + two.radius;
    if (distance >= sum) continue;
    const nx = distance > .001 ? dx / distance : 1, ny = distance > .001 ? dy / distance : 0;
    const massA = one.owner === null ? 1 : 1.8, massB = two.owner === null ? 1 : 1.8;
    const invA = 1 / massA, invB = 1 / massB, penetration = sum - distance + .01;
    one.x -= nx * penetration * invA / (invA + invB); one.y -= ny * penetration * invA / (invA + invB);
    two.x += nx * penetration * invB / (invA + invB); two.y += ny * penetration * invB / (invA + invB);
    const closing = (two.vx - one.vx) * nx + (two.vy - one.vy) * ny;
    if (closing < 0) {
      const impulse = -(1 + .88) * closing / (invA + invB);
      one.vx -= impulse * nx * invA; one.vy -= impulse * ny * invA; two.vx += impulse * nx * invB; two.vy += impulse * ny * invB;
    }
  }
  return collected;
}
export function nextJolenTurn(state: JolenState): boolean {
  if (marblesMoving(state) || jolenFinished(state)) return false;
  state.turn = state.turn === 0 ? 1 : 0; return true;
}
export function chooseJolenShot(state: JolenState, level: number, random = Math.random) {
  const from = shooter(state), targets = state.marbles.filter(m => m.owner === null && !m.collected);
  let best = { angle: Math.atan2(COURT.y - from.y, COURT.x - from.x), power: .85 }, bestScore = -Infinity;
  const options = targets.map(target => ({ target, angle: Math.atan2(target.y - from.y, target.x - from.x) }));
  for (const { target, angle } of options) {
    // All candidates use the exact live physics. Higher levels consider more shot strengths.
    for (const power of level < 2 ? [.82] : level < 4 ? [.65, 1] : [.48, .72, 1]) {
      const copy: JolenState = { ...state, scores: [...state.scores], marbles: state.marbles.map(m => ({ ...m })) };
      shootJolen(copy, angle, power);
      for (let step = 0; step < 850 && marblesMoving(copy); step++) stepJolen(copy);
      const after = shooter(copy), remaining = copy.marbles.filter(m => m.owner === null && !m.collected);
      const nearest = Math.min(800, ...remaining.map(m => Math.hypot(m.x - after.x, m.y - after.y)));
      const score = (copy.scores[state.turn] - state.scores[state.turn]) * 1000 - nearest * .12 - Math.hypot(target.x - from.x, target.y - from.y) * .015;
      if (score > bestScore) { bestScore = score; best = { angle, power }; }
    }
  }
  const error = [.12, .065, .032, .015, .005][Math.max(0, Math.min(4, level))];
  return { angle: best.angle + (random() - .5) * error * 2, power: Math.max(.15, Math.min(1, best.power + (random() - .5) * error)) };
}
