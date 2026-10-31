import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { chooseChessMove } from '../client/src/games/chess-rules.ts';
import { judgePikoHop, pikoCenter, pikoInside, pikoLanding, pikoPower, pikoRoute, PIKO_LEVELS } from '../client/src/games/piko-rules.ts';
import { initialTumbang, launchTumbang, nextTumbangTurn, stepTumbang, tumbangPower, TUMBANG_LINE } from '../client/src/games/tumbang-rules.ts';
import { normalizeProfile } from '../client/src/store.ts';
import { makeBackup, readBackup } from '../client/src/save-backup.ts';
import { HUB_SITES, HUB_SIZE } from '../client/src/hub.ts';
import { HUB_OBSTACLES } from '../client/src/hub-obstacles.ts';
import { CHARACTERS, BOT_APPEARANCES } from '../client/src/characters.ts';
import { overlaps } from '../client/src/rules.ts';

test('chess bots play legal moves, preserve history and position, and honor tiny budgets', () => {
  for (const level of ['easy', 'normal', 'hard'] as const) {
    const game = new Chess(); game.move('e4'); const before = game.fen(), history = game.history();
    const move = chooseChessMove(game, level, { nodes: 1000, milliseconds: 100 });
    assert.ok(move); assert.ok(game.moves().includes(move.san)); assert.equal(game.fen(), before); assert.deepEqual(game.history(), history);
    assert.ok(chooseChessMove(game, level, { nodes: 1, milliseconds: 1 })); assert.equal(game.fen(), before);
  }
});
test('chess bot takes immediate mate, and finished positions have no bot move', () => {
  const game = new Chess(); for (const move of ['f3', 'e5', 'g4']) game.move(move);
  const choice = chooseChessMove(game, 'hard', { nodes: 10000, milliseconds: 500 }); assert.ok(choice); game.move(choice);
  assert.equal(game.isCheckmate(), true); assert.equal(chooseChessMove(game, 'easy'), null);
  assert.equal(chooseChessMove(new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'), 'hard'), null);
});
test('Piko routes skip the marker in both directions and paired marker rows become one-foot landings', () => {
  for (let marker = 1; marker <= 8; marker++) {
    const route = pikoRoute(marker); assert.ok(route.length >= 11);
    assert.ok(route.every(hop => !hop.squares.includes(marker) && hop.feet === hop.squares.length));
    assert.ok(route.some(hop => hop.returning)); assert.equal(route.filter(hop => hop.squares.includes(9)).length, 1);
    if ([4, 5, 7, 8].includes(marker)) { const partner = marker % 2 === 0 ? marker === 4 ? 5 : 7 : marker === 5 ? 4 : 8; assert.ok(route.some(hop => hop.squares.includes(partner) && hop.feet === 1)); }
  }
});
test('Piko has guaranteed successful tosses and hops on every course and difficulty, with explicit early/late/feet failures', () => {
  for (const level of ['easy', 'normal', 'hard'] as const) for (let marker = 1; marker <= 8; marker++) {
    assert.equal(pikoInside(marker, pikoLanding(pikoCenter(marker), .65), level), true);
    assert.equal(pikoInside(marker, pikoLanding(pikoCenter(marker), 0), level), false);
    for (const hop of pikoRoute(marker, level)) {
      const time = PIKO_LEVELS[level].period * .65;
      assert.equal(judgePikoHop(time, hop.feet, hop, level), 'clear');
      assert.equal(judgePikoHop(0, hop.feet, hop, level), 'early');
      assert.equal(judgePikoHop(time + .3, hop.feet, hop, level), 'late');
      assert.equal(judgePikoHop(time, hop.feet === 1 ? 2 : 1, hop, level), 'feet');
    }
  }
  assert.ok(PIKO_LEVELS.hard.window < PIKO_LEVELS.normal.window && PIKO_LEVELS.normal.window < PIKO_LEVELS.easy.window);
  assert.equal(pikoRoute(5, 'hard').length, pikoRoute(5, 'normal').length * 2);
  for (let t = 0; t < 6; t += .01) { assert.ok(pikoPower(t) >= 0 && pikoPower(t) <= 1); assert.ok(tumbangPower(t) >= 0 && tumbangPower(t) <= 1); }
});
const tick = (state: ReturnType<typeof initialTumbang>, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 120) stepTumbang(state, 1 / 120); };
test('a tsinelas physically hits, spins and rolls the tin can; misses leave it upright', () => {
  const state = initialTumbang(); launchTumbang(state, -Math.PI / 2, .6); tick(state, .75);
  assert.equal(state.hit, true); assert.equal(state.can.down, true); tick(state, .2); assert.notEqual(state.can.angle, 0); assert.ok(state.can.y < 200);
  const miss = initialTumbang(); launchTumbang(miss, -Math.PI / 4, .6); tick(miss, .85); assert.equal(miss.hit, false); assert.equal(miss.can.down, false);
});
test('a fallen can and the safety line each prevent tags; resetting requires reaching the settled can', () => {
  const state = initialTumbang('hard'); state.turn = 1; state.phase = 'retrieve'; state.can.down = true;
  state.players = [{ x: 300, y: 300 }, { x: 300, y: 300 }]; state.slipper = { x: 700, y: 300 }; stepTumbang(state, .01); assert.equal(state.phase, 'retrieve');
  state.can.down = false; state.players = [{ x: 300, y: TUMBANG_LINE + 5 }, { x: 300, y: TUMBANG_LINE + 5 }]; stepTumbang(state, .01); assert.equal(state.phase, 'retrieve');
  state.players = [{ x: 300, y: 300 }, { x: 300, y: 300 }]; stepTumbang(state, .01); assert.equal(state.phase, 'feedback'); assert.equal(state.scores[0], 1);
  const reset = initialTumbang(); reset.turn = 1; reset.phase = 'retrieve'; reset.can.down = true; reset.players[0] = { x: 100, y: 100 }; reset.players[1] = { x: 100, y: 100 }; reset.slipper = { x: 700, y: 100 }; reset.landing = { ...reset.slipper }; tick(reset, 2); assert.equal(reset.can.down, true);
  reset.players[0] = { x: reset.can.x, y: reset.can.y }; tick(reset, 1.6); assert.equal(reset.can.down, false);
});
test('all difficulties allow a clean throw-and-retrieve; roles rotate six times and completed results freeze', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const state = initialTumbang(difficulty); launchTumbang(state, -Math.PI / 2, .55); state.autoRetrieve = true; tick(state, 10);
    assert.equal(state.phase, 'feedback'); assert.equal(state.hit, true); assert.equal(state.scores[0], 1);
  }
  const state = initialTumbang();
  for (let turn = 0; turn < 6; turn++) {
    assert.equal(state.turn, turn); launchTumbang(state, -Math.PI / 2, .55); state.autoRetrieve = true; tick(state, 23); assert.equal(state.phase, 'feedback'); nextTumbangTurn(state);
  }
  assert.equal(state.phase, 'finished'); const saved = JSON.stringify(state); tick(state, 2); nextTumbangTurn(state); assert.equal(JSON.stringify(state), saved);
});
test('legacy saves retain coins and Dama records while new games get independent records and backup round trips', () => {
  const p = normalizeProfile({ coins: 777, records: { dama: { played: 3, wins: 2, best: 40 } } });
  assert.equal(p.coins, 777); assert.equal(p.records.dama.wins, 2);
  for (const id of ['chess', 'piko', 'tumbang'] as const) assert.deepEqual(p.records[id], { played: 0, wins: 0, best: 0 });
  p.records.chess.played = 2; p.records.piko.best = 7; p.records.tumbang.best = 5; p.chessDifficulty = 'hard';
  assert.deepEqual(readBackup(JSON.stringify(makeBackup(p))).profile, p);
  assert.equal(CHARACTERS.wendy, 'Wendy'); assert.equal(BOT_APPEARANCES.wendy.gender, 'girl'); assert.equal(BOT_APPEARANCES.eric.gender, 'boy');
});
test('both eastern game areas have walking paths from the old plaza and share no chess map area', () => {
  assert.equal(HUB_SITES.some(site => site.game === 'chess'), false);
  const queue = [{ x: 520, y: 420 }], seen = new Set(['520,420']);
  for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[20, 0], [-20, 0], [0, 20], [0, -20]]) {
    const at = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${at.x},${at.y}`;
    if (seen.has(key) || at.x < 30 || at.y < 50 || at.x > HUB_SIZE.width - 30 || at.y > HUB_SIZE.height - 30 || HUB_OBSTACLES.some(rect => overlaps(at, rect, 15))) continue;
    seen.add(key); queue.push(at);
  }
  for (const id of ['piko', 'tumbang']) { const site = HUB_SITES.find(site => site.game === id)!; assert.ok(queue.some(at => Math.hypot(at.x - site.at.x, at.y - site.at.y) < 35)); }
});
