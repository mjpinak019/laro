export type GridPoint = { x: number; y: number };
export type Direction = 'up' | 'down' | 'left' | 'right';
export const SNAKE_SIZE = { width: 21, height: 10 };
const vectors: Record<Direction, GridPoint> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
export type SnakeState = { body: GridPoint[]; direction: Direction; queue: Direction[]; food: GridPoint; score: number; over: boolean; won: boolean };
function snakeFood(body: GridPoint[], random: () => number): GridPoint {
  const free: GridPoint[] = [];
  for (let y = 0; y < SNAKE_SIZE.height; y++) for (let x = 0; x < SNAKE_SIZE.width; x++) if (!body.some(p => p.x === x && p.y === y)) free.push({ x, y });
  return free[Math.min(free.length - 1, Math.max(0, Math.floor(random() * free.length)))] ?? { x: -1, y: -1 };
}
export function initialSnake(random = Math.random): SnakeState { const body = [{ x: 8, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 5 }]; return { body, direction: 'right', queue: [], food: snakeFood(body, random), score: 0, over: false, won: false }; }
export function steerSnake(state: SnakeState, direction: Direction) {
  const current = state.queue.at(-1) ?? state.direction, a = vectors[current], b = vectors[direction];
  if (state.over || state.queue.length >= 2 || current === direction || a.x + b.x === 0 && a.y + b.y === 0) return false;
  state.queue.push(direction); return true;
}
export const snakeInterval = (score: number) => Math.max(.075, .19 - score / 10 * .005);
export function stepSnake(state: SnakeState, random = Math.random) {
  if (state.over) return;
  state.direction = state.queue.shift() ?? state.direction; const vector = vectors[state.direction], head = { x: state.body[0].x + vector.x, y: state.body[0].y + vector.y };
  const eats = head.x === state.food.x && head.y === state.food.y, body = eats ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.x >= SNAKE_SIZE.width || head.y < 0 || head.y >= SNAKE_SIZE.height || body.some(p => p.x === head.x && p.y === head.y)) { state.over = true; return; }
  state.body.unshift(head); if (eats) { state.score += 10; state.food = snakeFood(state.body, random); if (state.food.x < 0) { state.won = true; state.over = true; } } else state.body.pop();
}

export type OrbitEnemy = { id: number; x: number; y: number; baseY: number; age: number; hp: number };
export type OrbitState = { time: number; player: GridPoint; lives: number; score: number; bullets: GridPoint[]; enemies: OrbitEnemy[]; nextEnemy: number; nextShot: number; invulnerable: number; serial: number; over: boolean; won: boolean };
export function initialOrbit(): OrbitState { return { time: 0, player: { x: 20, y: 52 }, lives: 3, score: 0, bullets: [], enemies: [], nextEnemy: .7, nextShot: 0, invulnerable: 0, serial: 0, over: false, won: false }; }
export function tickOrbit(state: OrbitState, seconds: number, input: { x: number; y: number; firing: boolean }, random = Math.random) {
  if (state.over) return;
  const dt = Math.max(0, Math.min(1 / 30, seconds)); state.time += dt; state.invulnerable = Math.max(0, state.invulnerable - dt);
  const length = Math.max(1, Math.hypot(input.x, input.y));
  state.player.x = Math.max(7, Math.min(82, state.player.x + input.x / length * dt * 70)); state.player.y = Math.max(19, Math.min(88, state.player.y + input.y / length * dt * 70));
  if (input.firing && state.time >= state.nextShot) { state.bullets.push({ x: state.player.x + 7, y: state.player.y }); state.nextShot = state.time + .17; }
  if (state.time >= state.nextEnemy) {
    const y = 22 + random() * 61; state.enemies.push({ id: state.serial++, x: 176, y, baseY: y, age: 0, hp: state.time > 35 ? 2 : 1 }); state.nextEnemy = state.time + Math.max(.38, 1.1 - state.time * .009);
  }
  for (const bullet of state.bullets) bullet.x += 150 * dt;
  for (const enemy of state.enemies) {
    enemy.age += dt; enemy.x -= (31 + state.time * .7) * dt; enemy.y = Math.max(19, Math.min(89, enemy.baseY + Math.sin(enemy.age * 3 + enemy.id) * 9));
    for (const bullet of state.bullets) if (bullet.x > 0 && enemy.hp > 0 && Math.abs(bullet.x - enemy.x) < 7 && Math.abs(bullet.y - enemy.y) < 5) { bullet.x = -100; enemy.hp--; if (!enemy.hp) state.score += 20; }
    if (enemy.hp > 0 && Math.abs(enemy.x - state.player.x) < 9 && Math.abs(enemy.y - state.player.y) < 7) {
      enemy.hp = 0; if (!state.invulnerable) { state.lives--; state.invulnerable = 1.2; }
    } else if (enemy.hp > 0 && enemy.x < -8) { enemy.hp = 0; state.lives--; }
  }
  state.enemies = state.enemies.filter(enemy => enemy.hp > 0); state.bullets = state.bullets.filter(b => b.x > 0 && b.x < 180);
  if (state.lives <= 0) { state.lives = 0; state.over = true; }
  else if (state.time >= 60) { state.won = true; state.over = true; state.score += 100; }
}
