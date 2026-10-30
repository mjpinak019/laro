import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COSMETICS, buyCosmetic, equipCosmetic, freshWardrobe, normalizeWardrobe } from '../client/src/wardrobe.ts';
import { normalizeProfile } from '../client/src/store.ts';
import { makeBackup, readBackup } from '../client/src/save-backup.ts';
import { initialDama } from '../client/src/games/dama-rules.ts';
import { initialLubid, jumpLubid, LUBID, lubidJumpHeight, lubidPeriod, lubidCapPeriod, lubidCoins, finishLubid, tickLubid } from '../client/src/games/lubid-rules.ts';
import { initialSnake, steerSnake, stepSnake, initialOrbit, tickOrbit } from '../client/src/games/retro-rules.ts';
import { PHONE_SPOTS, choosePhoneSpot } from '../client/src/phone-spots.ts';
import { HUB_OBSTACLES } from '../client/src/hub-obstacles.ts';
import { overlaps } from '../client/src/rules.ts';

test('cosmetic purchases debit exactly once, reject insufficient funds, and equip owned items freely', () => {
  const player = { coins: 100, wardrobe: freshWardrobe() }; assert.equal(buyCosmetic(player, 'hat-cap'), true); assert.equal(player.coins, 55);
  assert.equal(buyCosmetic(player, 'hat-cap'), false); assert.equal(player.coins, 55); assert.equal(player.wardrobe.owned.length, 1);
  assert.equal(buyCosmetic(player, 'costume-clockwork'), false); assert.equal(player.coins, 55); assert.equal(equipCosmetic(player.wardrobe, 'hat-none'), true); assert.equal(equipCosmetic(player.wardrobe, 'hat-cap'), true);
  assert.equal(equipCosmetic(player.wardrobe, 'hat-astral'), false); assert.equal(buyCosmetic(player, 'missing'), false);
  assert.ok(COSMETICS.filter(item => item.slot === 'skin').every(item => item.price === 0)); assert.equal(equipCosmetic(player.wardrobe, 'bottom-shorts'), true);
  assert.ok(Math.min(...COSMETICS.filter(i => i.slot === 'costume' && i.price > 0).map(i => i.price)) > Math.max(...COSMETICS.filter(i => i.slot === 'hat').map(i => i.price)));
});
test('wardrobe normalization removes unknown and unowned gear, duplicates, and incorrect slot assignments', () => {
  const wardrobe = normalizeWardrobe({ owned: ['hat-cap', 'hat-cap', 'free-money', 'skin-deep'], equipped: { skin: 'skin-deep', hat: 'hat-astral', beard: 'hat-cap', costume: 'costume-clockwork' } });
  assert.deepEqual(wardrobe.owned, ['hat-cap']); assert.equal(wardrobe.equipped.skin, 'skin-deep'); assert.equal(wardrobe.equipped.hat, 'hat-none'); assert.equal(wardrobe.equipped.beard, 'beard-none'); assert.equal(wardrobe.equipped.costume, 'costume-none');
});
test('old and corrupted profiles migrate without losing coins, records, or sharing wardrobe defaults', () => {
  const one = normalizeProfile({ coins: 999, gender: 'girl', records: { dama: { wins: 2, played: 5, best: 10 } } }), two = normalizeProfile(null);
  one.wardrobe.owned.push('hat-cap'); assert.equal(two.wardrobe.owned.length, 0); assert.equal(one.coins, 999); assert.equal(one.gender, 'girl'); assert.equal(one.records.dama.wins, 2); assert.equal(one.records.lubid.best, 0); assert.equal(one.records.snake.best, 0);
});
test('save files round-trip coins, purchases, clothes, records and an unfinished Dama match', () => {
  const profile = normalizeProfile({ coins: 1000, name: 'Sab' }); buyCosmetic(profile, 'costume-ranger'); profile.records.lubid.best = 17;
  const dama = initialDama(), saved = readBackup(JSON.stringify(makeBackup(profile, dama)));
  assert.equal(saved.profile.coins, 480); assert.deepEqual(saved.profile.wardrobe, profile.wardrobe); assert.equal(saved.profile.records.lubid.best, 17); assert.deepEqual(saved.dama, dama);
  assert.throws(() => readBackup('{')); assert.throws(() => readBackup(JSON.stringify({ format: 'other', profile }))); assert.throws(() => readBackup(JSON.stringify({ ...makeBackup(profile), version: 9 }))); assert.throws(() => readBackup(JSON.stringify({ ...makeBackup(profile), dama: {} }))); assert.throws(() => readBackup(' '.repeat(100001)));
});
test('rope jumps start on input, ignore midair spam, and buffer a tap just before landing', () => {
  const state = initialLubid(); state.phase = 'playing'; assert.equal(jumpLubid(state), true); assert.equal(state.jumpAt, 0); state.time = .1; assert.equal(jumpLubid(state), false); assert.equal(state.buffered, false);
  assert.ok(lubidJumpHeight(state) > 30); state.time = LUBID.jumpDuration - .04; assert.equal(jumpLubid(state), false); assert.equal(state.buffered, true);
  tickLubid(state, .05); assert.equal(state.jumps, 2); assert.equal(state.buffered, false); assert.equal(state.jumpAt, LUBID.jumpDuration);
});
test('all rope difficulties remain clearable beyond 100 with capped, smoothly varying speed', () => {
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const state = initialLubid(difficulty); state.phase = 'playing';
    let minimum = Infinity, maximum = 0;
    for (let frame = 0; frame < 100000 && state.cleared < 500 && state.phase === 'playing'; frame++) {
      if (state.nextPass - state.time <= .24 && (state.jumpAt === null || state.time - state.jumpAt >= LUBID.jumpDuration)) jumpLubid(state);
      const rate = state.rate;
      tickLubid(state, 1 / 120);
      assert.ok(state.rate <= 1 / lubidCapPeriod(difficulty) + .000001); assert.ok(Math.abs(state.rate - rate) < .03);
      if (state.cleared > 60) { minimum = Math.min(minimum, state.rate); maximum = Math.max(maximum, state.rate); }
    }
    assert.equal(state.phase, 'playing'); assert.equal(state.cleared, 500); assert.equal(state.lives, 3); assert.ok(maximum - minimum > .25); assert.ok(lubidCapPeriod(difficulty) > LUBID.jumpDuration);
    assert.equal(finishLubid(state), true); const ended = structuredClone(state); tickLubid(state, .05); assert.deepEqual(state, ended); assert.equal(finishLubid(state), false);
  }
});
test('no jumps loses three chances and finished rope results cannot advance again', () => {
  const state = initialLubid(); for (let n = 0; n < 1500; n++) tickLubid(state, 1 / 120);
  assert.equal(state.phase, 'finished'); assert.equal(state.lives, 0); assert.equal(state.cleared, 0); const done = structuredClone(state); for (let n = 0; n < 200; n++) tickLubid(state, 1 / 120); assert.deepEqual(state, done); assert.equal(jumpLubid(state), false);
});
test('rope rewards cap at 100 coins and extended records survive profile and backup normalization', () => {
  assert.equal(lubidCoins(0), 0); assert.equal(lubidCoins(100), 50); assert.equal(lubidCoins(200), 100); assert.equal(lubidCoins(10000), 100);
  const profile = normalizeProfile({ records: { lubid: { wins: 2, played: 3, best: 12345 } } });
  assert.equal(profile.records.lubid.best, 12345); assert.equal(readBackup(JSON.stringify(makeBackup(profile))).profile.records.lubid.best, 12345);
  assert.equal(profile.vibration, true); assert.equal(normalizeProfile({ vibration: false }).vibration, false);
});
test('Snake handles queued corner turns, food growth, no reversing, and terminal wall collisions', () => {
  const game = initialSnake(() => 0); game.food = { x: 9, y: 5 }; assert.equal(steerSnake(game, 'left'), false); stepSnake(game, () => 0); assert.equal(game.score, 10); assert.equal(game.body.length, 4);
  assert.equal(steerSnake(game, 'up'), true); assert.equal(steerSnake(game, 'left'), true); stepSnake(game); assert.deepEqual(game.body[0], { x: 9, y: 4 }); stepSnake(game); assert.deepEqual(game.body[0], { x: 8, y: 4 });
  for (let n = 0; n < 30; n++) stepSnake(game); assert.equal(game.over, true); const final = structuredClone(game); stepSnake(game); assert.deepEqual(game, final);
});
test('Snake permits moving into its vacated tail and wins when the board is filled', () => {
  const game = initialSnake(); game.body = [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 }]; game.direction = 'left'; game.food = { x: 10, y: 5 }; stepSnake(game); assert.equal(game.over, false); assert.deepEqual(game.body[0], { x: 0, y: 1 });
  game.body = []; for (let y = 0; y < 10; y++) for (let n = 0; n < 21; n++) { const x = y % 2 ? 20 - n : n; if (x || y) game.body.push({ x, y }); }
  game.food = { x: 0, y: 0 }; game.direction = 'left'; game.queue = []; stepSnake(game); assert.equal(game.won, true); assert.equal(game.over, true); assert.equal(game.body.length, 210);
});
test('Orbit controls move immediately, held fire has a cadence, hits score, and escapes cost lives', () => {
  const game = initialOrbit(); tickOrbit(game, 1 / 120, { x: 1, y: -1, firing: true }, () => .5); assert.ok(game.player.x > 20 && game.player.y < 52); assert.equal(game.bullets.length, 1);
  for (let n = 0; n < 4; n++) tickOrbit(game, 1 / 120, { x: 0, y: 0, firing: true }); assert.equal(game.bullets.length, 1);
  game.nextEnemy = 100; game.enemies = [{ id: 0, x: 50, y: 50, baseY: 50, age: 0, hp: 1 }]; game.bullets = [{ x: 48, y: 50 }]; tickOrbit(game, 1 / 120, { x: 0, y: 0, firing: false }); assert.equal(game.score, 20);
  game.enemies = [0, 1, 2].map(id => ({ id, x: -10, y: 40, baseY: 40, age: 0, hp: 1 })); tickOrbit(game, 1 / 120, { x: 0, y: 0, firing: false }); assert.equal(game.over, true); assert.equal(game.lives, 0); const done = structuredClone(game); tickOrbit(game, .03, { x: 1, y: 0, firing: true }); assert.deepEqual(game, done);
});
test('Orbit survivors win at sixty seconds exactly once', () => {
  const game = initialOrbit(); game.nextEnemy = 1000; for (let n = 0; n < 7300; n++) tickOrbit(game, 1 / 120, { x: 0, y: 0, firing: false });
  assert.equal(game.won, true); assert.equal(game.over, true); assert.equal(game.score, 100);
});
test('phone re-rolls exclude the previous spot and all possible spots are reachable through the actual village geometry', () => {
  for (const spot of PHONE_SPOTS) { assert.notEqual(choosePhoneSpot(() => .5, spot.id).id, spot.id); assert.equal(HUB_OBSTACLES.some(rect => overlaps(spot, rect, 13)), false, spot.id); }
  const queue = [{ x: 510, y: 420 }], seen = new Set(['510,420']);
  for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
    const at = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${at.x},${at.y}`;
    if (at.x < 30 || at.x > 1550 || at.y < 50 || at.y > 970 || seen.has(key) || HUB_OBSTACLES.some(rect => overlaps(at, rect, 13))) continue;
    seen.add(key); queue.push(at);
  }
  for (const spot of PHONE_SPOTS) assert.ok(queue.some(at => Math.hypot(at.x - spot.x, at.y - spot.y) < 30), spot.id);
});
