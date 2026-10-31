import { test, expect, type Page } from '@playwright/test';
import { pikoRoute, PIKO_LEVELS } from '../../client/src/games/piko-rules';
import { initialDama } from '../../client/src/games/dama-rules';
import { pathTo, settleHubCamera } from '../helpers/hub-walk';

async function ready(page: Page) { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); }
async function street(page: Page, id: 'piko' | 'tumbang') {
  await page.locator(`[data-game="${id}"]`).click(); await page.locator('#play-button').click(); await page.locator('#street-start').click();
  await expect(page.locator(`#${id}-stage`)).toBeVisible();
}
async function chess(page: Page, mode = 'local') { await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('[data-table-game="chess"]').click(); await page.locator(`#chess-${mode}`).click(); }
async function home(page: Page) { await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); }

test('Chess is an option at the Dama table, plays a legal local checkmate, and keeps the Dama save', async ({ page }) => {
  const saved = initialDama();
  await page.addInitScript(saved => { localStorage.setItem('laro.dama.match.v1', JSON.stringify(saved)); }, saved);
  await ready(page); expect(await page.locator('[data-game="chess"]').count()).toBe(0); await chess(page);
  const move = async (from: string, to: string) => { await page.locator(`[data-chess-square="${from}"]`).click(); await expect(page.locator(`[data-chess-square="${to}"]`)).toHaveClass(/legal/); await page.locator(`[data-chess-square="${to}"]`).click(); };
  await move('f2', 'f3'); await move('e7', 'e5'); await move('g2', 'g4'); await move('d8', 'h4');
  await expect(page.locator('#modal-title')).toHaveText('Black wins at the table.'); await expect(page.locator('#result-summary')).toContainText('Checkmate');
  await expect(page.locator('#coins')).toHaveText('0'); expect(JSON.parse((await page.evaluate(() => localStorage.getItem('laro.dama.match.v1')))!)).toEqual(saved);
  await page.screenshot({ path: 'artifacts/chess-checkmate.png', fullPage: true }); await page.locator('#return-button').click();
  await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await expect(page.locator('#resume-dama')).toBeVisible();
});
test('Chess bot pauses before replying, rejects illegal moves, and records a finished match only once', async ({ page }) => {
  await ready(page); await chess(page, 'bot');
  await page.locator('[data-chess-square="e2"]').click(); await page.locator('[data-chess-square="e5"]').click(); await expect(page.locator('#chess-stage')).toHaveAttribute('data-ply', '0');
  await page.locator('[data-chess-square="e4"]').click(); await page.locator('#pause-button').click(); await page.waitForTimeout(850); await expect(page.locator('#chess-stage')).toHaveAttribute('data-ply', '1');
  await page.locator('#resume-button').click(); await expect(page.locator('#chess-stage')).toHaveAttribute('data-ply', '2');
  await page.locator('#chess-resign').click(); await page.locator('#chess-resign').click(); await expect(page.locator('#coins')).toHaveText('10');
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!)); expect(profile.records.chess.played).toBe(1); expect(profile.records.dama.played).toBe(0);
});
test('Piko completes an outbound and return course, pauses its timing, and saves finished progress', async ({ page }) => {
  test.setTimeout(70000); await ready(page); await street(page, 'piko'); const stage = page.locator('#piko-stage');
  await page.locator('#piko-action').click();
  await expect.poll(async () => Number(await page.locator('#piko-meter').getAttribute('aria-valuenow')), { intervals: [20] }).toBeGreaterThan(58); await page.locator('#piko-action').click();
  await expect(stage).toHaveAttribute('data-phase', 'hop-ready'); await page.screenshot({ path: 'artifacts/piko-court.png', fullPage: true });
  await page.locator('#pause-button').click(); const frozen = await stage.getAttribute('data-time'); await page.waitForTimeout(200); expect(await stage.getAttribute('data-time')).toBe(frozen); await page.locator('#resume-button').click();
  await page.locator('#piko-action').click(); const route = pikoRoute(1);
  for (let hop = 0; hop < route.length; hop++) {
    await expect(stage).toHaveAttribute('data-hop', String(hop)); await expect(stage).toHaveAttribute('data-phase', 'hop');
    await expect.poll(async () => Number(await stage.getAttribute('data-time')), { intervals: [20] }).toBeGreaterThan(PIKO_LEVELS.easy.period * .59);
    await page.locator(route[hop].feet === 1 ? '#piko-action' : '#piko-two').click(); await expect(stage).toHaveAttribute('data-phase', 'jump');
  }
  await expect(stage).toHaveAttribute('data-course', '2'); await expect(stage).toHaveAttribute('data-phase', 'feedback');
  for (let miss = 0; miss < 3; miss++) {
    await page.locator('#piko-action').click(); await page.locator('#piko-action').click(); await page.locator('#piko-action').click();
    if (miss < 2) await expect(stage).toHaveAttribute('data-phase', 'feedback');
  }
  await expect(page.locator('#modal-title')).toContainText('Wendy'); await expect(page.locator('#coins')).toHaveText('10');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!)); expect(saved.records.piko.best).toBe(1); expect(saved.records.piko.played).toBe(1);
});
test('Tumbang Preso visibly rotates the hit can, alternates thrower and guard, and finishes six turns', async ({ page }) => {
  test.setTimeout(100000); await ready(page); await street(page, 'tumbang'); const stage = page.locator('#tumbang-stage');
  for (let turn = 0; turn < 6; turn++) {
    await expect(stage).toHaveAttribute('data-turn', String(turn));
    if (turn % 2 === 0) {
      await page.locator('#tumbang-action').click(); await expect.poll(async () => Number(await page.locator('#tumbang-meter').getAttribute('aria-valuenow')), { intervals: [10] }).toBeGreaterThan(53); await page.locator('#tumbang-action').click(); await page.locator('#tumbang-action').click();
      await expect(stage).toHaveAttribute('data-hit', 'true'); await expect(stage).toHaveAttribute('data-can-down', 'true');
      expect(Number(await stage.getAttribute('data-can-angle'))).not.toBe(0);
      if (!turn) { await page.locator('#pause-button').click(); const frozen = await stage.getAttribute('data-time'); await page.waitForTimeout(200); expect(await stage.getAttribute('data-time')).toBe(frozen); await page.locator('#resume-button').click(); await page.screenshot({ path: 'artifacts/tumbang-hit.png', fullPage: true }); }
    } else await page.locator('#tumbang-action').click();
    await expect(stage).toHaveAttribute('data-phase', 'feedback', { timeout: 25000 }); await page.locator('#tumbang-action').click();
  }
  await expect(page.locator('#result-summary')).toContainText('Three throws and three turns as guard each');
  const p = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!)); expect(p.records.tumbang.played).toBe(1); expect(p.coins).toBeGreaterThanOrEqual(10);
});
test('new games fit portrait and short landscape fullscreen and reload offline', async ({ page, context }) => {
  await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Fallback')); }); await ready(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true); await context.setOffline(true); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  for (const id of ['piko', 'tumbang', 'chess']) {
    if (id === 'chess') await chess(page); else await street(page, id as 'piko' | 'tumbang');
    await page.locator('#fullscreen-button').click();
    for (const [width, height] of [[390, 844], [932, 330]]) {
      await page.setViewportSize({ width, height }); await expect.poll(async () => (await page.locator('#game-display').boundingBox())!.height).toBe(height);
      for (const selector of id === 'chess' ? ['.chess-board', '#chess-resign'] : [`#${id}-stage canvas`, `#${id}-action`]) {
        const box = (await page.locator(selector).boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width + 1); expect(box.y + box.height).toBeLessThanOrEqual(height + 1); expect(box.height).toBeGreaterThan(30);
      }
      await page.screenshot({ path: `artifacts/${id}-${width}x${height}.png` });
    }
    await page.locator('#fullscreen-button').click(); await page.setViewportSize({ width: 1440, height: 1000 }); await home(page);
  }
  await context.setOffline(false);
});
test('the expanded map has reachable Wendy and Eric game entrances', async ({ page }) => {
  test.setTimeout(100000); await ready(page); const game = page.locator('#game');
  await expect(page.locator('#hub-map')).toContainText('8 PLACES');
  for (const [id, target] of [['piko', { x: 1900, y: 520 }], ['tumbang', { x: 1900, y: 1160 }]] as const) {
    const from = { x: Number(await game.getAttribute('data-x')), y: Number(await game.getAttribute('data-y')) };
    for (const at of pathTo(from, target)) {
      await settleHubCamera(page);
      const box = (await page.locator('#game canvas').boundingBox())!, camera = { x: Number(await game.getAttribute('data-camera-x')), y: Number(await game.getAttribute('data-camera-y')) };
      await page.locator('#game canvas').click({ position: { x: (at.x - camera.x) / 960 * box.width, y: (at.y - camera.y) / 600 * box.height } });
      await expect.poll(async () => Math.hypot(Number(await game.getAttribute('data-x')) - at.x, Number(await game.getAttribute('data-y')) - at.y), { intervals: [40], timeout: 9000 }).toBeLessThan(8);
    }
    await expect(game).toHaveAttribute('data-nearby', id); await page.screenshot({ path: `artifacts/map-${id}.png`, fullPage: true }); await page.keyboard.press('e'); await expect(page.locator('#modal-title')).toHaveText(id === 'piko' ? 'Tara, Piko tayo!' : 'Tumbang Preso!'); await page.locator('#close-modal').click();
  }
});
