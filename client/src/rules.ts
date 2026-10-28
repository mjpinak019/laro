export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Match = {
  phase: 'ready' | 'playing' | 'won' | 'lost';
  lives: number;
  remaining: number;
  returning: boolean;
  grace: number;
  countdown: number;
  tags: number;
};

export const FIELD = { left: 200, right: 760, top: 120, bottom: 480 };
export const SPAWN: Point = { x: 480, y: 535 };
export const PLAYER_RADIUS = 11;

export function direction(x: number, y: number): Point {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

export function overlaps(point: Point, rect: Rect, radius = PLAYER_RADIUS): boolean {
  const x = Math.max(rect.x, Math.min(point.x, rect.x + rect.width));
  const y = Math.max(rect.y, Math.min(point.y, rect.y + rect.height));
  return Math.hypot(point.x - x, point.y - y) < radius;
}

export function move(point: Point, input: Point, speed: number, delta: number, obstacles: Rect[], bounds: Rect): Point {
  const vector = direction(input.x, input.y);
  const step = speed * Math.min(Math.max(delta, 0), 0.04);
  const next = { ...point };
  const x = Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x + vector.x * step));
  if (!obstacles.some(rect => overlaps({ x, y: next.y }, rect))) next.x = x;
  const y = Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y + vector.y * step));
  if (!obstacles.some(rect => overlaps({ x: next.x, y }, rect))) next.y = y;
  return next;
}

export function segmentDistance(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const denominator = dx * dx + dy * dy;
  const t = denominator ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / denominator)) : 0;
  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
}

export function newMatch(): Match {
  return { phase: 'ready', lives: 3, remaining: 90, returning: false, grace: 1.5, countdown: 3, tags: 0 };
}

export function tickMatch(match: Match, delta: number): void {
  if (match.phase === 'ready') {
    match.countdown = Math.max(0, match.countdown - delta);
    if (match.countdown === 0) match.phase = 'playing';
    return;
  }
  if (match.phase !== 'playing') return;
  match.remaining = Math.max(0, match.remaining - delta);
  match.grace = Math.max(0, match.grace - delta);
  if (match.remaining === 0) match.phase = 'lost';
}

export function checkpoint(match: Match, point: Point): 'turn' | 'win' | null {
  if (match.phase !== 'playing') return null;
  if (!match.returning && point.y < FIELD.top - 12) {
    match.returning = true;
    return 'turn';
  }
  if (match.returning && point.y > FIELD.bottom + 22) {
    match.phase = 'won';
    return 'win';
  }
  return null;
}

export function tag(match: Match): boolean {
  if (match.phase !== 'playing' || match.grace > 0) return false;
  match.tags++;
  match.lives--;
  match.returning = false;
  match.grace = 1.8;
  if (match.lives === 0) match.phase = 'lost';
  return true;
}

export function reward(match: Match): number {
  if (match.phase === 'won') return 50 + match.lives * 10;
  return match.phase === 'lost' ? 10 : 0;
}
