import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkpoint, direction, move, newMatch, overlaps, reward, segmentDistance, tag, tickMatch } from '../client/src/rules.ts';

test('diagonal movement has the same speed as cardinal movement', () => {
  assert.equal(Math.hypot(...Object.values(direction(1, 1))), 1);
  const bounds = { x: 0, y: 0, width: 1000, height: 1000 };
  const cardinal = move({ x: 100, y: 100 }, { x: 1, y: 0 }, 200, .02, [], bounds);
  const diagonal = move({ x: 100, y: 100 }, { x: 1, y: 1 }, 200, .02, [], bounds);
  assert.ok(Math.abs(Math.hypot(diagonal.x - 100, diagonal.y - 100) - (cardinal.x - 100)) < .0001);
});
test('player collision blocks entry, slides along walls, and clamps to boundaries', () => {
  const wall = { x: 120, y: 0, width: 30, height: 300 };
  assert.equal(overlaps({ x: 115, y: 100 }, wall), true);
  const next = move({ x: 109, y: 100 }, { x: 1, y: 1 }, 200, .03, [wall], { x: 0, y: 0, width: 500, height: 500 });
  assert.equal(next.x, 109); assert.ok(next.y > 100);
  assert.equal(move({ x: 499, y: 100 }, { x: 1, y: 0 }, 200, 5, [], { x: 0, y: 0, width: 500, height: 500 }).x, 500);
});
test('swept collision detects a tag even when a player crosses between frames', () => {
  assert.equal(segmentDistance({ x: 0, y: 0 }, { x: -30, y: 0 }, { x: 30, y: 0 }), 0);
  assert.equal(segmentDistance({ x: 0, y: 20 }, { x: -30, y: 0 }, { x: 30, y: 0 }), 20);
});
test('ready countdown does not consume round time', () => {
  const match = newMatch(); tickMatch(match, 2); assert.equal(match.phase, 'ready'); assert.equal(match.remaining, 90);
  tickMatch(match, 1); assert.equal(match.phase, 'playing'); tickMatch(match, 1); assert.equal(match.remaining, 89);
});
test('a valid win requires the far checkpoint before returning home', () => {
  const match = newMatch(); tickMatch(match, 3);
  assert.equal(checkpoint(match, { x: 300, y: 535 }), null);
  assert.equal(checkpoint(match, { x: 300, y: 100 }), 'turn');
  assert.equal(checkpoint(match, { x: 300, y: 535 }), 'win');
  assert.equal(match.phase, 'won'); assert.equal(reward(match), 80);
});
test('tags reset the route and grant immunity, and the third tag ends the match', () => {
  const match = newMatch(); tickMatch(match, 3); assert.equal(tag(match), false);
  tickMatch(match, 2); match.returning = true; assert.equal(tag(match), true);
  assert.equal(match.lives, 2); assert.equal(match.returning, false); assert.equal(tag(match), false);
  tickMatch(match, 2); tag(match); tickMatch(match, 2); tag(match);
  assert.equal(match.phase, 'lost'); assert.equal(match.lives, 0); assert.equal(reward(match), 10);
});
test('timeout loses the round; a completed match never changes or grants a new checkpoint', () => {
  const match = newMatch(); tickMatch(match, 3); tickMatch(match, 91);
  assert.equal(match.phase, 'lost'); assert.equal(match.remaining, 0);
  assert.equal(checkpoint(match, { x: 300, y: 100 }), null); assert.equal(tag(match), false);
  tickMatch(match, 5); assert.equal(match.remaining, 0);
});
test('unfinished rounds grant no reward', () => { assert.equal(reward(newMatch()), 0); });
