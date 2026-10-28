import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDama, chooseDamaMove, initialDama, legalMoves, positionKey, validDamaSave, type Board, type DamaState, type Piece } from '../client/src/games/dama-rules.ts';
import { ALLEY_WALLS, ALLEY_COVER, alleyPath, canSee, inCover, JUMP, jumpHeight, lineBlocked, tinikHeight, touchesTinik, tinikStage, touchesStage } from '../client/src/games/arcade-rules.ts';
import { HUB_SITES, HUB_SIZE, nearbySite } from '../client/src/hub.ts';
import { overlaps } from '../client/src/rules.ts';

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
test('all three bot difficulties return a legal longest capture', () => {
  const value = board({ 42: 1, 35: -1, 21: -1, 33: -1 });
  for (const difficulty of ['easy', 'normal', 'hard'] as const) assert.deepEqual(chooseDamaMove(value, 1, difficulty), legalMoves(value, 1)[0]);
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
  assert.equal(new Set(HUB_SITES.map(site => site.game)).size, 4);
  for (const site of HUB_SITES) {
    assert.equal(nearbySite(site.at)?.game, site.game);
    assert.ok(site.at.x > 0 && site.at.x < HUB_SIZE.width && site.at.y > 0 && site.at.y < HUB_SIZE.height);
  }
});
