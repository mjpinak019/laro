import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile } from '../client/src/store.ts';
import { buySnack, SNACKS } from '../client/src/food.ts';
import { makeBackup, readBackup } from '../client/src/save-backup.ts';
import { TUTORIALS, tutorialIllustration } from '../client/src/tutorials.ts';
import { GAMES } from '../client/src/games/types.ts';
import { chessPiece } from '../client/src/games/chess-pieces.ts';
import { FOOD_CORNER, HUB_SITES, HUB_SIZE } from '../client/src/hub.ts';
import { HUB_OBSTACLES } from '../client/src/hub-obstacles.ts';
import { WORLD_PROPS, propFootprint, propGroundPoint } from '../client/src/world-props.ts';
import { overlaps } from '../client/src/rules.ts';

test('old profiles preserve their progress and get safe tutorial/audio defaults; explicit zero volumes survive backups', () => {
  const profile = normalizeProfile({ coins: 123, records: { dama: { wins: 2, played: 4, best: 15 } } });
  assert.equal(profile.coins, 123); assert.equal(profile.records.dama.wins, 2); assert.equal(profile.tutorialPrompts, true);
  profile.volume = 0; profile.musicVolume = 0; profile.musicEnabled = false; profile.tutorialPrompts = false; profile.snacksEaten = 5;
  assert.deepEqual(readBackup(JSON.stringify(makeBackup(profile))).profile, profile);
  const invalid = normalizeProfile({ volume: -2, musicVolume: Infinity }); assert.equal(invalid.volume, 0); assert.equal(invalid.musicVolume, .35);
});
test('snacks debit the exact price, reject invalid or unaffordable buys, and never change game records or clothing', () => {
  const profile = normalizeProfile({ coins: 8 }), records = structuredClone(profile.records), outfit = structuredClone(profile.wardrobe);
  assert.equal(buySnack(profile, 'fishball'), true); assert.equal(profile.coins, 5); assert.equal(profile.snacksEaten, 1);
  assert.equal(buySnack(profile, 'kwek-kwek'), true); assert.equal(profile.coins, 0); assert.equal(profile.snacksEaten, 2);
  const before = structuredClone(profile); assert.equal(buySnack(profile, 'fishball'), false); assert.equal(buySnack(profile, 'free-coins'), false); assert.deepEqual(profile, before);
  assert.deepEqual(profile.records, records); assert.deepEqual(profile.wardrobe, outfit); assert.ok(SNACKS.some(item => item.shop === 'store'));
});
test('every playable game has complete illustrated controls and all chess pieces have explicit contrasting SVG fills', () => {
  assert.deepEqual(Object.keys(TUTORIALS).sort(), Object.keys(GAMES).sort());
  for (const id of Object.keys(TUTORIALS) as (keyof typeof TUTORIALS)[]) {
    assert.ok(TUTORIALS[id].every(step => step.title && step.text && step.keys));
    TUTORIALS[id].forEach((_, step) => assert.ok(tutorialIllustration(id, step).includes('role="img"')));
  }
  for (const piece of ['p', 'n', 'b', 'r', 'q', 'k'] as const) {
    assert.ok(chessPiece(piece, 'w').includes('fill="#fff5db"')); assert.ok(chessPiece(piece, 'b').includes('fill="#17372f"'));
    assert.ok(chessPiece(piece, 'w').includes('<svg')); assert.equal(chessPiece(piece, 'w').includes('<text'), false);
  }
});
test('new houses, transport and food carts remain solid while every game and both food areas stay reachable', () => {
  const flag = WORLD_PROPS.hub.find(prop => prop.kind === 'flag')!; assert.ok(flag); assert.equal(flag.id, 'paaralan-philippine-flag');
  for (const kind of ['house', 'jeepney', 'tricycle', 'foodstall', 'flag']) {
    const prop = WORLD_PROPS.hub.find(prop => prop.kind === kind)!; assert.ok(prop); const rect = propFootprint(prop), feet = propGroundPoint(prop);
    assert.equal(rect.y + rect.height, feet.y); assert.ok(rect.width > 0 && rect.height > 0);
  }
  const queue = [{ x: 520, y: 420 }], seen = new Set(['520,420']);
  for (let head = 0; head < queue.length; head++) for (const [dx, dy] of [[20, 0], [-20, 0], [0, 20], [0, -20]]) {
    const at = { x: queue[head].x + dx, y: queue[head].y + dy }, key = `${at.x},${at.y}`;
    if (seen.has(key) || at.x < 30 || at.y < 50 || at.x > HUB_SIZE.width - 30 || at.y > HUB_SIZE.height - 30 || HUB_OBSTACLES.some(rect => overlaps(at, rect, 15))) continue;
    seen.add(key); queue.push(at);
  }
  for (const at of [...HUB_SITES.map(site => site.at), FOOD_CORNER, { x: 780, y: 1530 }]) assert.ok(queue.some(point => Math.hypot(point.x - at.x, point.y - at.y) < 35), `No walking route to ${JSON.stringify(at)}`);
});
