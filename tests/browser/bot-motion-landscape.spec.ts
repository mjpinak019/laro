import { test, expect, type Page } from '@playwright/test';
import { initialDama, positionKey, type Piece } from '../../client/src/games/dama-rules';

test.use({ hasTouch: true });
async function seedBot(page: Page, pieces: Record<number, Piece>) {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  const state = initialDama('bot'); state.board.fill(0); for (const [at, piece] of Object.entries(pieces)) state.board[Number(at)] = piece;
  state.turn = -1; state.history = [positionKey(state.board, -1)];
  await page.evaluate(state => localStorage.setItem('laro.dama.match.v1', JSON.stringify(state)), state);
  await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('#resume-dama').click();
}

test('a bot capture chain visibly moves, pauses, and resumes from a complete saved turn after reload', async ({ page }) => {
  await seedBot(page, { 21: -1, 28: 1, 42: 1, 30: 1 });
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-bot-phase', 'slide');
  const first = await page.locator('.dama-moving-piece').getAttribute('style'); await page.waitForTimeout(100); const second = await page.locator('.dama-moving-piece').getAttribute('style'); expect(first).not.toBe(second);
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '0');
  await page.locator('#pause-button').click(); const frozen = await page.locator('.dama-moving-piece').getAttribute('style'); await page.waitForTimeout(350); expect(await page.locator('.dama-moving-piece').getAttribute('style')).toBe(frozen);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.dama.match.v1')!)); expect(saved.board[21]).toBe(-1); expect(saved.board[28]).toBe(1); expect(saved.board[42]).toBe(1); expect(saved.turn).toBe(-1);
  await page.locator('#resume-button').click(); await expect(page.locator('#dama-stage')).toHaveAttribute('data-bot-hop', '2');
  await page.locator('#pause-button').click(); await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '0');
  await page.screenshot({ path: 'artifacts/laro-bot-capture-hop.png', fullPage: true });
  await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('#resume-dama').click();
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '1'); await expect(page.locator('#dama-stage')).toHaveAttribute('data-bot-moving', 'false');
  const complete = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.dama.match.v1')!)); expect(complete.board[49]).toBe(-1); expect(complete.board[28]).toBe(0); expect(complete.board[42]).toBe(0); expect(complete.board[30]).toBe(1);
  await expect(page.locator('#dama-move-note')).toContainText('f6 → d4 → b2'); await expect(page.locator('.dama-moving-piece')).toHaveCount(0);
});

test('a winning bot jump promotes and awards the result only after its animation', async ({ page }) => {
  await seedBot(page, { 42: -1, 51: 1 });
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-bot-moving', 'true'); await expect(page.locator('#coins')).toHaveText('0'); await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Mama Shoni takes this one.' })).toBeVisible();
  await expect(page.locator('[data-square="60"]')).toHaveAttribute('aria-label', /Teal king/); await expect(page.locator('[data-square="60"] .dama-piece > span')).toHaveText('♛'); await expect(page.locator('#coins')).toHaveText('10');
  expect(await page.evaluate(() => localStorage.getItem('laro.dama.match.v1'))).toBeNull();
  await page.locator('#return-button').click(); await page.reload(); await expect(page.locator('#coins')).toHaveText('10');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).records.dama.played)).toBe(1);
});

test('leaving while the bot moves cancels playback and retains the original board', async ({ page }) => {
  await seedBot(page, { 21: -1, 28: 1, 42: 1, 30: 1 }); await expect(page.locator('#dama-stage')).toHaveAttribute('data-bot-moving', 'true');
  await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); await page.waitForTimeout(1600);
  await expect(page.locator('#dama-stage')).toHaveCount(0); await expect(page.locator('#coins')).toHaveText('0');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.dama.match.v1')!)); expect(saved.ply).toBe(0); expect(saved.board[21]).toBe(-1); expect(saved.board[28]).toBe(1);
});

test('landscape fallback anchors the joystick low left and Takbo low right with readable text', async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Mobile fallback')); });
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await page.locator('#fullscreen-button').click();
  await page.locator('#game-display').evaluate(element => { element.style.padding = '0px 44px 21px'; });
  const shell = (await page.locator('#game-shell').boundingBox())!, pad = (await page.locator('#touch-pad').boundingBox())!, run = (await page.locator('#touch-run').boundingBox())!;
  expect(pad.x + pad.width).toBeLessThan(shell.x + shell.width / 3); expect(run.x).toBeGreaterThan(shell.x + shell.width * 2 / 3);
  expect(pad.y).toBeGreaterThan(shell.y + 20); expect(run.y).toBeGreaterThan(shell.y + 20); expect(pad.y + pad.height).toBeLessThanOrEqual(shell.y + shell.height); expect(run.y + run.height).toBeLessThanOrEqual(shell.y + shell.height);
  expect(Math.abs(pad.y + pad.height / 2 - run.y - run.height / 2)).toBeLessThan(2);
  expect(await page.locator('#touch-run').evaluate(element => getComputedStyle(element).color)).toBe('rgb(242, 228, 185)');
  await page.mouse.move(run.x + run.width / 2, run.y + run.height / 2); await page.mouse.down();
  expect(await page.locator('#touch-run').evaluate(element => getComputedStyle(element).color)).toBe('rgb(33, 61, 42)'); await page.mouse.up();
  await page.screenshot({ path: 'artifacts/laro-landscape-controls-fixed.png' });
});

test('the mobile panel follows the visible viewport when browser bars change its height', async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await page.addInitScript(() => {
    HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Mobile fallback'));
    const viewport = Object.assign(new EventTarget(), { width: 932, height: 330, offsetTop: 28, offsetLeft: 0 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  });
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await page.locator('#fullscreen-button').click();
  const panel = (await page.locator('#game-display').boundingBox())!; expect(panel.y).toBe(28); expect(panel.height).toBe(330);
  const nav = (await page.locator('#fullscreen-nav').boundingBox())!; expect(nav.y + nav.height).toBeLessThanOrEqual(358);
  await page.evaluate(() => { Object.assign(window.visualViewport!, { height: 360, offsetTop: 0 }); window.visualViewport!.dispatchEvent(new Event('resize')); });
  await expect.poll(async () => (await page.locator('#game-display').boundingBox())!.height).toBe(360);
  await page.locator('[data-screen-nav="nav-play"]').click(); await page.locator('[data-menu-game="dama"]').click(); await page.locator('#dama-bot').click();
  const board = (await page.locator('.dama-table').boundingBox())!, stage = (await page.locator('#game-shell').boundingBox())!; expect(board.y).toBeGreaterThanOrEqual(stage.y); expect(board.y + board.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
});
