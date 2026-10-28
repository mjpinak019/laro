import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURT, chooseJolenShot, initialJolen, jolenFinished, marblesMoving, nextJolenTurn, powerAt, shooter, shootJolen, stepJolen, type JolenState } from '../client/src/games/jolen-rules.ts';
import { loadProfile, STORAGE_KEY } from '../client/src/store.ts';
import { BOT_APPEARANCES, CHARACTERS } from '../client/src/characters.ts';

function settle(state: JolenState) { for (let n = 0; n < 2000 && marblesMoving(state); n++) stepJolen(state); assert.equal(marblesMoving(state), false); }
test('Jolen power peaks in 0.6 seconds, bounces back, and never exceeds its limits', () => {
  assert.equal(powerAt(0), .08); assert.equal(powerAt(600), 1); assert.equal(powerAt(1200), .08);
  assert.ok(Math.abs(powerAt(300) - powerAt(900)) < 1e-9);
  for (let n = -100; n < 5000; n += 7) assert.ok(powerAt(n) >= .08 && powerAt(n) <= 1);
});
test('each shooter persists where it stops and turn changes cannot happen while rolling', () => {
  const state = initialJolen(), original = { ...shooter(state) };
  assert.equal(shootJolen(state, Math.PI, .3), true); assert.equal(nextJolenTurn(state), false); assert.equal(shootJolen(state, 0, .5), false);
  settle(state); const landed = { ...shooter(state) }; assert.notEqual(landed.x, original.x); assert.equal(landed.y, original.y);
  assert.equal(nextJolenTurn(state), true); assert.equal(state.turn, 1); assert.equal(nextJolenTurn(state), true);
  assert.deepEqual(shooter(state), landed); assert.equal(state.shots, 1);
});
test('a target only scores once when its whole body crosses the circle; a shooter never scores', () => {
  const state = initialJolen(), m = state.marbles[0];
  m.x = COURT.x + COURT.radius + m.radius - 1; m.y = COURT.y; stepJolen(state); assert.deepEqual(state.scores, [0, 0]);
  m.x += 2; stepJolen(state); assert.deepEqual(state.scores, [1, 0]); assert.equal(m.collected, true);
  shooter(state).x = 800; stepJolen(state); stepJolen(state); assert.deepEqual(state.scores, [1, 0]); assert.equal(shooter(state).collected, false);
  state.turn = 1; const second = state.marbles[1]; second.x = 800; stepJolen(state); assert.deepEqual(state.scores, [1, 1]);
});
test('shooter collisions transfer motion and off-court shooters re-spot at the playable edge', () => {
  const state = initialJolen(), one = shooter(state, 0), two = shooter(state, 1);
  one.x = 100; one.y = 450; two.x = 150; two.y = 450;
  shootJolen(state, 0, .2); for (let n = 0; n < 50; n++) stepJolen(state);
  assert.ok(two.x > 150); assert.equal(two.collected, false);
  settle(state); one.x = COURT.right - one.radius - 1; one.vx = 880; stepJolen(state);
  assert.equal(one.x, COURT.right - one.radius); assert.equal(one.vx, 0); assert.equal(one.vy, 0);
});
test('bot plans preserve the board and a full match collects exactly fifteen marbles', () => {
  const state = initialJolen();
  for (let turn = 0; turn < 100 && !jolenFinished(state); turn++) {
    const snapshot = structuredClone(state), shot = chooseJolenShot(state, 4, () => .5);
    assert.deepEqual(state, snapshot); assert.equal(shootJolen(state, shot.angle, shot.power), true); settle(state);
    if (!jolenFinished(state)) assert.equal(nextJolenTurn(state), true);
  }
  assert.equal(jolenFinished(state), true); assert.equal(state.scores[0] + state.scores[1], 15);
  assert.equal(state.marbles.filter(m => m.collected).length, 15); assert.equal(nextJolenTurn(state), false); assert.equal(shootJolen(state, 0, 1), false);
});
test('invalid shots do not poison physics with nonfinite values', () => {
  const state = initialJolen(); assert.equal(shootJolen(state, NaN, .5), false); assert.equal(shootJolen(state, 0, Infinity), false);
  assert.equal(state.shots, 0); assert.ok(state.marbles.every(m => Number.isFinite(m.x + m.y + m.vx + m.vy)));
});
test('legacy profiles keep progress and get separate empty Jolen records and difficulty', () => {
  const old = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: (key: string) => key === STORAGE_KEY ? JSON.stringify({ name: 'Sab', coins: 456, wins: 8, damaDifficulty: 'master', records: { dama: { wins: 3, played: 6, best: 10 } } }) : null } as Storage;
    const profile = loadProfile(); assert.equal(profile.coins, 456); assert.equal(profile.wins, 8); assert.equal(profile.damaDifficulty, 'master'); assert.equal(profile.jolenDifficulty, 'easy');
    assert.deepEqual(profile.records.dama, { wins: 3, played: 6, best: 10 }); assert.deepEqual(profile.records.jolen, { wins: 0, played: 0, best: 0 });
  } finally { globalThis.localStorage = old; }
});
test('Amor and Weng are separate girl characters with different appearances', () => {
  assert.equal(CHARACTERS.amor, 'Amor'); assert.equal(CHARACTERS.weng, 'Weng'); assert.equal(BOT_APPEARANCES.weng.gender, 'girl'); assert.notEqual(BOT_APPEARANCES.amor.look, BOT_APPEARANCES.weng.look);
});
