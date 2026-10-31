import { expect, type Page } from '@playwright/test';
import { HUB_OBSTACLES } from '../../client/src/hub-obstacles.ts';
import { overlaps, type Point } from '../../client/src/rules.ts';
import { HUB_SIZE } from '../../client/src/hub.ts';

export function pathTo(from: Point, target: Point) {
  const start = { x: Math.round(from.x / 10) * 10, y: Math.round(from.y / 10) * 10 }, queue = [start], parents = new Map<string, Point | null>([[`${start.x},${start.y}`, null]]);
  let end: Point | undefined;
  for (let head = 0; head < queue.length && !end; head++) {
    const point = queue[head]; if (Math.hypot(point.x - target.x, point.y - target.y) < 22) { end = point; break; }
    for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const at = { x: point.x + dx, y: point.y + dy }, key = `${at.x},${at.y}`;
      if (at.x < 30 || at.x > HUB_SIZE.width - 50 || at.y < 50 || at.y > HUB_SIZE.height - 30 || parents.has(key) || HUB_OBSTACLES.some(rect => overlaps(at, rect, 15))) continue;
      parents.set(key, point); queue.push(at);
    }
  }
  if (!end) throw new Error('No physical walking path to phone');
  const path: Point[] = []; for (let p: Point | null = end; p; p = parents.get(`${p.x},${p.y}`)!) path.unshift(p);
  const smooth: Point[] = []; let index = 0;
  while (index < path.length - 1) {
    let next = index + 1;
    for (let candidate = index + 1; candidate < path.length; candidate++) {
      const a = path[index], b = path[candidate], distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance > 220) break;
      let clear = true; for (let n = 0; n <= Math.ceil(distance / 4); n++) { const t = n / Math.max(1, Math.ceil(distance / 4)), at = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; if (HUB_OBSTACLES.some(rect => overlaps(at, rect, 15))) { clear = false; break; } }
      if (clear) next = candidate;
    }
    smooth.push(path[next]); index = next;
  }
  return smooth;
}
export async function settleHubCamera(page: Page) {
  // Resolve the animated camera before translating a world waypoint into a click.
  const camera = () => page.locator('#game').evaluate(el => `${(el as HTMLElement).dataset.cameraX},${(el as HTMLElement).dataset.cameraY}`);
  await expect.poll(async () => { const before = await camera(); await page.waitForTimeout(100); return before === await camera(); }, { timeout: 3000, intervals: [50] }).toBe(true);
}
export async function findPhone(page: Page) {
  const game = page.locator('#game');
  const from = { x: Number(await game.getAttribute('data-x')), y: Number(await game.getAttribute('data-y')) }, target = { x: Number(await game.getAttribute('data-phone-x')), y: Number(await game.getAttribute('data-phone-y')) };
  for (const at of pathTo(from, target)) {
    await settleHubCamera(page);
    const box = (await page.locator('#game canvas').boundingBox())!, camera = { x: Number(await game.getAttribute('data-camera-x')), y: Number(await game.getAttribute('data-camera-y')) };
    await page.locator('#game canvas').click({ position: { x: (at.x - camera.x) / 960 * box.width, y: (at.y - camera.y) / 600 * box.height } });
    await expect.poll(async () => Math.hypot(Number(await game.getAttribute('data-x')) - at.x, Number(await game.getAttribute('data-y')) - at.y), { timeout: 9000, intervals: [50] }).toBeLessThan(8);
  }
  await expect(page.locator('#activity-action')).toHaveText('Pick up phone · E'); await page.screenshot({ path: 'artifacts/phone-found-in-barangay.png', fullPage: true });
  await page.keyboard.press('e'); await expect(page.getByRole('heading', { name: 'You found a pocket phone!' })).toBeVisible();
}
