import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDama, chooseDamaMove, initialDama, legalMoves, moveBoard, positionKey, validDamaSave, type Board, type DamaState, type Piece } from '../client/src/games/dama-rules.ts';
import { DAMA_LEVELS, type DamaDifficulty } from '../client/src/games/dama-levels.ts';
import { loadProfile, STORAGE_KEY } from '../client/src/store.ts';
import { ALLEY_WALLS, ALLEY_COVER, alleyPath, canSee, inCover, JUMP, jumpHeight, lineBlocked, tinikHeight, touchesTinik, tinikStage, touchesStage } from '../client/src/games/arcade-rules.ts';
import { HUB_SITES, HUB_SIZE, nearbySite } from '../client/src/hub.ts';
import { move, overlaps, PLAYER_RADIUS } from '../client/src/rules.ts';
import { propFootprint, propGroundPoint, propObstacles, WORLD_PROPS } from '../client/src/world-props.ts';
import { padDirection } from '../client/src/touch-pad.ts';
import { botMoveFrame, BOT_MOVE_TIMING, damaSquareName } from '../client/src/games/dama-playback.ts';

function board(pieces: Record<number, Piece>): Board { const value: Board = Array<Piece>(64).fill(0); for (const [at, piece] of Object.entries(pieces)) value[Number(at)] = piece; return value; }
function state(value: Board): DamaState { return { ...initialDama(), board: value, history: [positionKey(value, 1)] }; }

test('Dama begins with twelve pieces each, seven legal moves, and Gold moving first', () => {
  const game = initialDama(); assert.equal(game.board.filter(piece => piece === 1).length, 12); assert.equal(game.board.filter(piece => piece === -1).length, 12);
  assert.equal(legalMoves(game.board, 1).length, 7); assert.equal(validDamaSave(game), true);
});
test('ordinary Dama pieces step only forward but capture backward', () => {
  const moves = legalMoves(board({ 35: 1, 44: -1 }), 1);
  assert.deepEqual(moves, [{ from: 35, path: [53], captures: [44] }]);
  assert.ok(legalMoves(board({ 35: 1 }), 1).every(move => move.path[0] < 35));
});
test('only complete longest capture chains are legal', () => {
  const value = board({ 42: 1, 35: -1, 21: -1, 33: -1 });
  const moves = legalMoves(value, 1); assert.deepEqual(moves, [{ from: 42, path: [28, 14], captures: [35, 21] }]);
  assert.throws(() => applyDama(state(value), { from: 42, path: [24], captures: [33] }), /legal/);
  const next = applyDama(state(value), moves[0]); assert.equal(next.board[14], 1); assert.equal(next.board[35], 0); assert.equal(next.board[21], 0); assert.equal(next.board[33], -1); assert.equal(next.turn, -1);
});
test('flying kings offer every empty landing beyond one opponent', () => {
  const moves = legalMoves(board({ 42: 2, 35: -1 }), 1);
  assert.deepEqual(moves.map(move => move.path[0]), [28, 21, 14, 7]);
});
test('a king cannot fly through its own pieces or two adjacent opponents', () => {
  const moves = legalMoves(board({ 42: 2, 35: -1, 28: -1 }), 1);
  assert.ok(moves.every(move => move.captures.length === 0));
  assert.ok(legalMoves(board({ 42: 2, 35: 1 }), 1).filter(move => move.from === 42).every(move => ![28, 21, 14, 7].includes(move.path[0])));
});
test('promotion happens at the end of a move and no-move opponents lose', () => {
  const game = state(board({ 10: 1, 62: -1 }));
  const next = applyDama(game, legalMoves(game.board, 1)[0]); assert.equal(Math.abs(next.board.find(piece => piece === 2)!), 2); assert.equal(next.outcome, 1);
});
test('passing through the far rank during a capture does not prematurely crown a piece', () => {
  const value = board({ 17: 1, 10: -1, 12: -1 });
  const moves = legalMoves(value, 1); assert.deepEqual(moves[0].path, [3, 21]);
  assert.equal(applyDama(state(value), moves[0]).board[21], 1);
});
test('capturing the last piece wins and a finished game cannot move again', () => {
  const game = state(board({ 26: 1, 17: -1 })); const next = applyDama(game, legalMoves(game.board, 1)[0]);
  assert.equal(next.outcome, 1); assert.throws(() => applyDama(next, { from: 8, path: [1], captures: [] }), /ended/);
});
test('threefold positions and eighty quiet plies produce draws', () => {
  const game = state(board({ 56: 2, 7: -2 })); const move = legalMoves(game.board, 1).find(move => move.path[0] === 49)!;
  const nextKey = positionKey(applyDama(game, move).board, -1);
  const repeated = { ...game, history: [nextKey, nextKey, positionKey(game.board, 1)] };
  assert.equal(applyDama(repeated, move).outcome, 0);
  assert.equal(applyDama({ ...game, quiet: 79 }, move).outcome, 0);
});
test('all five bot difficulties return a legal longest capture', () => {
  const value = board({ 42: 1, 35: -1, 21: -1, 33: -1 });
  for (const difficulty of Object.keys(DAMA_LEVELS) as DamaDifficulty[]) assert.deepEqual(chooseDamaMove(value, 1, difficulty), legalMoves(value, 1)[0]);
});
test('bot playback shows the origin, every capture hop, and a final landing without changing the move', () => {
  const move = { from: 21, path: [35, 49], captures: [28, 42] }, before = JSON.stringify(move);
  const hopTime = BOT_MOVE_TIMING.slide + BOT_MOVE_TIMING.land;
  assert.equal(botMoveFrame(move, 0).phase, 'focus');
  const first = botMoveFrame(move, BOT_MOVE_TIMING.focus + BOT_MOVE_TIMING.slide / 2);
  assert.equal(first.from, 21); assert.equal(first.to, 35); assert.ok(first.progress > 0 && first.progress < 1); assert.equal(first.landed, 0);
  assert.equal(botMoveFrame(move, BOT_MOVE_TIMING.focus + BOT_MOVE_TIMING.slide + 1).landed, 1);
  const second = botMoveFrame(move, BOT_MOVE_TIMING.focus + hopTime + 1); assert.equal(second.from, 35); assert.equal(second.to, 49); assert.equal(second.hop, 1);
  const end = botMoveFrame(move, BOT_MOVE_TIMING.focus + hopTime * 2); assert.equal(end.phase, 'done'); assert.equal(end.landed, 2); assert.equal(end.progress, 1);
  assert.equal(JSON.stringify(move), before); assert.equal(damaSquareName(21), 'f6'); assert.equal(damaSquareName(49), 'b2');
});
test('advanced Dama opponents keep the board unchanged and return legal moves within a tiny fallback budget', () => {
  const value = initialDama().board, before = [...value];
  for (const difficulty of ['expert', 'master'] as const) {
    const selected = chooseDamaMove(value, 1, difficulty, { nodes: 1, milliseconds: 1 });
    assert.ok(legalMoves(value, 1).some(move => JSON.stringify(move) === JSON.stringify(selected)));
    assert.deepEqual(value, before);
  }
});
test('Ferdie and Tatay Efren find a forced win that the greedy Easy opponent misses', () => {
  const value = board({ 23: -1, 33: 1, 35: -1, 51: 2 });
  function canForceWin(current: Board, turn: 1 | -1, remaining: number): boolean {
    const options = legalMoves(current, turn);
    if (!options.length) return turn === -1;
    if (!remaining) return false;
    const continues = (move: ReturnType<typeof legalMoves>[number]) => canForceWin(moveBoard(current, move), -turn as 1 | -1, remaining - 1);
    return turn === 1 ? options.some(continues) : options.every(continues);
  }
  assert.equal(canForceWin(moveBoard(value, chooseDamaMove(value, 1, 'easy')!), -1, 6), false);
  for (const difficulty of ['expert', 'master'] as const) {
    const selected = chooseDamaMove(value, 1, difficulty)!;
    assert.deepEqual(selected, { from: 51, path: [37], captures: [] });
    assert.equal(canForceWin(moveBoard(value, selected), -1, 6), true);
  }
});
test('Dama saves retain the selected opponent and still accept saves from before the five tiers', () => {
  const saved = applyDama(initialDama('bot', 'master'), legalMoves(initialDama().board, 1)[0]);
  assert.equal(saved.difficulty, 'master'); assert.equal(validDamaSave(saved), true);
  const legacy = { ...saved }; delete legacy.difficulty;
  assert.equal(validDamaSave(legacy), true);
  assert.equal(validDamaSave({ ...saved, difficulty: 'impossible' }), false);
});
test('profile migration renames the old default while preserving coins, records, custom names, and difficulty', () => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => storage.get(key) ?? null } });
  try {
    assert.equal(loadProfile().name, 'Ikaw'); assert.equal(loadProfile().gender, 'boy');
    storage.set(STORAGE_KEY, JSON.stringify({ name: 'Kaibigan', coins: 123, wins: 7, played: 9, best: 28, difficulty: 'hard', records: { dama: { wins: 2, played: 4, best: 37 } } }));
    const migrated = loadProfile(); assert.equal(migrated.name, 'Ikaw'); assert.equal(migrated.coins, 123); assert.equal(migrated.wins, 7); assert.equal(migrated.records.dama.wins, 2); assert.equal(migrated.damaDifficulty, 'hard');
    storage.set(STORAGE_KEY, JSON.stringify({ ...migrated, name: 'Juan', gender: 'girl', damaDifficulty: 'master' }));
    assert.equal(loadProfile().name, 'Juan'); assert.equal(loadProfile().gender, 'girl'); assert.equal(loadProfile().damaDifficulty, 'master');
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('the circular pad has a neutral centre and normalized cardinal and diagonal movement', () => {
  assert.deepEqual(padDirection(0, 0, 40), { x: 0, y: 0 }); assert.deepEqual(padDirection(3, 2, 40), { x: 0, y: 0 });
  for (const [x, y] of [[30, 0], [0, -30], [30, -30], [-50, 50]]) {
    const vector = padDirection(x, y, 40); assert.ok(Math.abs(Math.hypot(vector.x, vector.y) - 1) < 1e-9); assert.equal(Math.sign(vector.x), Math.sign(x)); assert.equal(Math.sign(vector.y), Math.sign(y));
  }
});

test('benches, vases, and fence sections use their actual feet for depth and block crossing from both sides', () => {
  for (const kind of ['bench', 'vase', 'fence'] as const) {
    const prop = WORLD_PROPS.hub.find(prop => prop.kind === kind)!, footprint = propFootprint(prop), ground = propGroundPoint(prop);
    assert.equal(footprint.y + footprint.height, ground.y); assert.ok(propObstacles('hub').some(rect => JSON.stringify(rect) === JSON.stringify(footprint)));
    for (const side of [-1, 1]) {
      let point = { x: footprint.x + footprint.width / 2, y: side < 0 ? footprint.y - 40 : footprint.y + footprint.height + 40 };
      for (let step = 0; step < 60; step++) point = move(point, { x: 0, y: -side }, 160, .02, [footprint], { x: 0, y: 0, ...HUB_SIZE });
      assert.equal(overlaps(point, footprint, PLAYER_RADIUS - .1), false);
      if (side < 0) assert.ok(point.y < footprint.y); else assert.ok(point.y > footprint.y + footprint.height);
    }
  }
});
test('invalid and terminal saved boards are rejected', () => {
  assert.equal(validDamaSave(null), false); assert.equal(validDamaSave({ ...initialDama(), board: [1] }), false);
  const invalid = initialDama(); invalid.board[0] = 1; assert.equal(validDamaSave(invalid), false);
  assert.equal(validDamaSave({ ...initialDama(), outcome: 1 }), false);
});
test('walls block sight in both directions, including a corner crossing', () => {
  assert.equal(lineBlocked({ x: 70, y: 150 }, { x: 330, y: 150 }), true);
  assert.equal(lineBlocked({ x: 330, y: 150 }, { x: 70, y: 150 }), true);
  assert.equal(lineBlocked({ x: 70, y: 300 }, { x: 350, y: 300 }), false);
});
test('the seeker cannot see through a building or behind its facing direction', () => {
  assert.equal(canSee({ x: 60, y: 160 }, { x: 330, y: 160 }, { x: 1, y: 0 }, false), false);
  assert.equal(canSee({ x: 400, y: 300 }, { x: 260, y: 300 }, { x: 1, y: 0 }, false), false);
  assert.equal(canSee({ x: 400, y: 300 }, { x: 560, y: 300 }, { x: 1, y: 0 }, false), true);
});
test('cover helps a crouching hider, but crouching in open ground is not invisibility', () => {
  assert.equal(inCover({ x: 180, y: 510 }), true);
  assert.equal(canSee({ x: 310, y: 510 }, { x: 180, y: 510 }, { x: -1, y: 0 }, true), false);
  assert.equal(canSee({ x: 400, y: 300 }, { x: 550, y: 300 }, { x: 1, y: 0 }, true), true);
});
test('seeker paths stay outside inflated obstacles and reach both sides of the map', () => {
  const path = alleyPath({ x: 480, y: 300 }, { x: 100, y: 500 }); assert.ok(path.length > 0);
  for (const point of path) assert.equal(ALLEY_WALLS.some(wall => overlaps(point, wall, 16)), false);
  assert.ok(Math.hypot(path.at(-1)!.x - 100, path.at(-1)!.y - 500) < 40);
});
test('all six tinik heights are clearable with the fixed jump arc', () => {
  for (let level = 1; level <= 6; level++) {
    assert.ok(tinikHeight(level) < jumpHeight(.5));
    for (let time = 0; time <= 1; time += 1 / 120) assert.equal(touchesTinik(412 + time * JUMP.speed, jumpHeight(time), level), false);
  }
});
test('late jumps and no jumps hit the tinik, and jump height never goes negative', () => {
  assert.equal(touchesTinik(500, 0, 1), true); assert.equal(touchesTinik(500, 40, 6), true);
  assert.equal(touchesTinik(700, 0, 6), false); assert.equal(jumpHeight(2), 0);
});

test('all difficulty levels have varied, physically clearable jumping stages', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const stages = Array.from({ length: 6 }, (_, i) => tinikStage(i + 1, difficulty));
    assert.ok(new Set(stages.map(stage => stage.speed)).size > 3);
    assert.ok(new Set(stages.map(stage => stage.obstacleX)).size > 3);
    for (const stage of stages) {
      assert.ok(stage.takeoffMax > stage.takeoffMin);
      const takeoff = (stage.takeoffMax + stage.takeoffMin) / 2;
      for (let time = 0; time <= 1; time += 1 / 240) assert.equal(touchesStage(takeoff + stage.speed * time, jumpHeight(time), stage), false);
    }
  }
  const normal = tinikStage(6, 'normal'), hard = tinikStage(6, 'hard');
  assert.ok(hard.height > normal.height); assert.ok(hard.takeoffMax - hard.takeoffMin < normal.takeoffMax - normal.takeoffMin);
});
test('new hiding props provide more cover while keeping cross-map paths connected', () => {
  assert.ok(ALLEY_COVER.length >= 7);
  for (const target of [{ x: 100, y: 300 }, { x: 180, y: 500 }, { x: 420, y: 100 }, { x: 880, y: 140 }, { x: 820, y: 500 }]) assert.ok(alleyPath({ x: 480, y: 300 }, target).length > 0);
  assert.equal(inCover({ x: 390, y: 440 }), true);
});
test('the expanded barangay has a distinct, reachable interaction point for each game', () => {
  assert.ok(HUB_SIZE.width > 960 && HUB_SIZE.height > 600);
  assert.equal(new Set(HUB_SITES.map(site => site.game)).size, 8);
  for (const site of HUB_SITES) {
    assert.equal(nearbySite(site.at)?.game, site.game);
    assert.ok(site.at.x > 0 && site.at.x < HUB_SIZE.width && site.at.y > 0 && site.at.y < HUB_SIZE.height);
  }
});
