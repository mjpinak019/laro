import { overlaps, type Point, type Rect } from '../rules.ts';
import { propObstacles } from '../world-props.ts';
import { HIDE_OBJECTS } from './hide-objects.ts';
import type { Difficulty } from '../rules';

export const ALLEY_WALLS: Rect[] = [
  { x: 90, y: 105, width: 220, height: 145 },
  { x: 590, y: 90, width: 230, height: 150 },
  { x: 390, y: 170, width: 90, height: 85 },
  { x: 165, y: 345, width: 140, height: 70 },
  { x: 505, y: 335, width: 40, height: 120 },
  ...propObstacles('alley'),
  ...HIDE_OBJECTS.filter(object => object.solid).map(object => object.rect),
];
export const ALLEY_COVER: Rect[] = [
  { x: 75, y: 460, width: 170, height: 80 },
  { x: 690, y: 345, width: 145, height: 90 },
  { x: 360, y: 65, width: 130, height: 60 },
  ...HIDE_OBJECTS.filter(object => object.conceal).map(object => object.rect),
];
export const inCover = (point: Point) => ALLEY_COVER.some(rect => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height);

export function lineBlocked(from: Point, to: Point, walls: Rect[] = ALLEY_WALLS): boolean {
  return walls.some(rect => {
    let lo = 0, hi = 1;
    for (const axis of ['x', 'y'] as const) {
      const delta = to[axis] - from[axis], min = rect[axis], max = min + (axis === 'x' ? rect.width : rect.height);
      if (Math.abs(delta) < .00001) { if (from[axis] < min || from[axis] > max) return false; }
      else {
        const a = (min - from[axis]) / delta, b = (max - from[axis]) / delta;
        lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
        if (lo > hi) return false;
      }
    }
    return true;
  });
}

export function canSee(observer: Point, target: Point, facing: Point, crouched: boolean, range = 270): boolean {
  const dx = target.x - observer.x, dy = target.y - observer.y, distance = Math.hypot(dx, dy);
  if (distance > range || lineBlocked(observer, target)) return false;
  if (inCover(target) && distance > (crouched ? 60 : 105)) return false;
  if (distance < 45) return true;
  return (dx * facing.x + dy * facing.y) / (distance * (Math.hypot(facing.x, facing.y) || 1)) > Math.cos(Math.PI * .38);
}

export function alleyPath(from: Point, goal: Point): Point[] {
  const cols = 24, rows = 15;
  const point = (at: number) => ({ x: (at % cols) * 40 + 20, y: Math.floor(at / cols) * 40 + 20 });
  const free = (at: number) => {
    if (at < 0 || at >= cols * rows) return false;
    const p = point(at);
    return p.x >= 40 && p.x <= 920 && p.y >= 70 && p.y <= 550 && !ALLEY_WALLS.some(wall => overlaps(p, wall, 16));
  };
  const nearest = (target: Point) => {
    let best = -1, distance = Infinity;
    for (let at = 0; at < cols * rows; at++) if (free(at)) {
      const p = point(at), d = Math.hypot(p.x - target.x, p.y - target.y);
      if (d < distance) { best = at; distance = d; }
    }
    return best;
  };
  const start = nearest(from), end = nearest(goal);
  if (start < 0 || end < 0) return [];
  const previous = new Map<number, number>([[start, -1]]), queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current === end) break;
    for (const next of [current - cols, current + cols, current % cols ? current - 1 : -1, current % cols < cols - 1 ? current + 1 : -1]) {
      if (!previous.has(next) && free(next)) { previous.set(next, current); queue.push(next); }
    }
  }
  if (!previous.has(end)) return [];
  const path: Point[] = [];
  for (let at = end; at !== start; at = previous.get(at)!) path.unshift(point(at));
  return path;
}

export const JUMP = { speed: 210, velocity: 450, gravity: 900, obstacleX: 520, halfWidth: 24 };
export const tinikHeight = (level: number) => 24 + level * 10;
export function tinikStage(level: number, difficulty: Difficulty = 'easy') {
  const at = Math.max(0, Math.min(5, level - 1));
  const heights = { easy: [34,44,54,64,74,84], normal: [40,50,62,74,86,94], hard: [46,58,70,82,92,100] };
  const speeds = { easy: [210,220,205,230,215,240], normal: [215,230,225,245,235,255], hard: [230,260,240,280,255,290] };
  const obstacleX = [520,555,490,565,510,550][at], speed = speeds[difficulty][at], height = heights[difficulty][at];
  const root = Math.sqrt(JUMP.velocity ** 2 - 2 * JUMP.gravity * (height + 3));
  const early = (JUMP.velocity - root) / JUMP.gravity, late = (JUMP.velocity + root) / JUMP.gravity;
  return { height, speed, obstacleX, takeoffMin: obstacleX + JUMP.halfWidth + 9 - speed * late, takeoffMax: obstacleX - JUMP.halfWidth - 9 - speed * early };
}
export function touchesStage(x: number, z: number, stage: ReturnType<typeof tinikStage>) { return Math.abs(x - stage.obstacleX) < JUMP.halfWidth + 9 && z < stage.height + 3; }
export function jumpHeight(seconds: number): number { return Math.max(0, JUMP.velocity * seconds - .5 * JUMP.gravity * seconds * seconds); }
export function touchesTinik(x: number, z: number, level: number): boolean { return Math.abs(x - JUMP.obstacleX) < JUMP.halfWidth + 9 && z < tinikHeight(level) + 3; }
