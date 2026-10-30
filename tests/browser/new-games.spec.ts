import { expect, test, type Page } from '@playwright/test';
import { initialDama, positionKey, type Piece } from '../../client/src/games/dama-rules';
import { tinikStage } from '../../client/src/games/arcade-rules';

async function ready(page: Page) { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); }
async function choose(page: Page, name: string) { await page.getByRole('button', { name: `Choose ${name}`, exact: true }).click(); await page.locator('#play-button').click(); }
async function seed(page: Page, pieces: Record<number, Piece>, legacy = false) {
  const state = initialDama(); state.board.fill(0); for (const [at, piece] of Object.entries(pieces)) state.board[Number(at)] = piece;
  state.history = [positionKey(state.board, 1)];
  await page.evaluate(({ state, legacy }) => {
    localStorage.setItem('laro.dama.match.v1', JSON.stringify(state));
    if (legacy) localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ name: 'Old Friend', color: 2, coins: 123, wins: 7, played: 10, best: 22, difficulty: 'easy', muted: true }));
  }, { state, legacy });
  await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
}

test('Dama supports a full two-player turn cycle and resumes the saved board', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page); await choose(page, 'Dama'); await page.getByRole('button', { name: 'Two players · pass-and-play' }).click();
  await expect(page.locator('.dama-piece')).toHaveCount(24);
  await page.locator('[data-square="40"]').click(); await expect(page.locator('[data-square="33"]')).toHaveClass(/legal/); await page.locator('[data-square="33"]').click();
  await expect(page.locator('#dama-turn')).toHaveText('Teal to move');
  await page.locator('[data-square="17"]').click(); await page.locator('[data-square="24"]').click();
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '2');
  await page.screenshot({ path: 'artifacts/laro-dama.png', fullPage: true });
  await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await choose(page, 'Dama'); await page.getByRole('button', { name: 'Resume saved match' }).click();
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '2');
  await expect(page.locator('#coins')).toHaveText('0'); expect(errors).toEqual([]);
});

test('Dama enforces a complete longest capture chain in the board UI', async ({ page }) => {
  await ready(page); await seed(page, { 42: 1, 35: -1, 21: -1, 33: -1 });
  await choose(page, 'Dama'); await page.getByRole('button', { name: 'Resume saved match' }).click();
  await page.locator('[data-square="42"]').click();
  await expect(page.locator('[data-square="24"]')).not.toHaveClass(/legal/);
  await page.locator('[data-square="28"]').click(); await expect(page.locator('[data-square="14"]')).toHaveClass(/legal/);
  await page.locator('[data-square="14"]').click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('laro.dama.match.v1')!).board[14])).toBe(1);
  const board = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.dama.match.v1')!).board);
  expect(board[35]).toBe(0); expect(board[21]).toBe(0); expect(board[33]).toBe(-1);
});

test('Dama terminal capture pays once and preserves legacy Patintero records', async ({ page }) => {
  await ready(page); await seed(page, { 26: 1, 17: -1 }, true);
  await expect(page.locator('#coins')).toHaveText('123'); await expect(page.locator('#wins')).toHaveText('7');
  await choose(page, 'Dama'); await page.getByRole('button', { name: 'Resume saved match' }).click();
  await page.locator('[data-square="26"]').click(); await page.locator('[data-square="8"]').click();
  await expect(page.getByRole('heading', { name: 'A clever finish!' })).toBeVisible(); await expect(page.locator('#coins')).toHaveText('183');
  await page.getByRole('button', { name: 'Back to the barangay' }).click();
  await page.getByRole('button', { name: 'Choose Patintero', exact: true }).click();
  await expect(page.locator('#wins')).toHaveText('7'); await expect(page.locator('#best')).toHaveText('22s');
  await page.reload(); await expect(page.locator('#coins')).toHaveText('183');
  expect(await page.evaluate(() => localStorage.getItem('laro.dama.match.v1'))).toBeNull();
});

test('Dama bot and all new games load after a disconnected reload', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })); });
  await context.setOffline(true); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await choose(page, 'Dama'); await page.getByRole('button', { name: 'Play against Mama Shoni' }).click();
  await page.locator('[data-square="40"]').click(); await page.locator('[data-square="33"]').click();
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '2');
  await page.locator('#nav-hub').click(); await page.getByRole('button', { name: 'Return to the barangay' }).click();
  await choose(page, 'Tagu-taguan'); await expect(page.locator('#game')).toHaveAttribute('data-mode', 'taguan');
  await page.locator('#nav-hub').click(); await page.getByRole('button', { name: 'Return to the barangay' }).click();
  await choose(page, 'Luksong-tinik'); await page.getByRole('button', { name: 'Practice · unlimited retries' }).click();
  await expect(page.locator('#game')).toHaveAttribute('data-mode', 'tinik'); expect(errors).toEqual([]);
});

test('Tagu-taguan has hiding, crouch, a real search, and a paused search timer', async ({ page }) => {
  await ready(page); await choose(page, 'Tagu-taguan');
  await expect(page.locator('#game')).toHaveAttribute('data-hidden', 'true');
  await page.locator('#activity-action').click(); await expect(page.locator('#game')).toHaveAttribute('data-crouched', 'true');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'playing', { timeout: 15000 });
  await expect(page.locator('#game')).not.toHaveAttribute('data-seeker', 'COUNTING');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  const remaining = await page.locator('#game').getAttribute('data-remaining'); await page.waitForTimeout(1000);
  await expect(page.locator('#game')).toHaveAttribute('data-remaining', remaining!);
  await page.getByRole('button', { name: 'Back to playing' }).click();
  await page.screenshot({ path: 'artifacts/laro-taguan.png', fullPage: true });
});

test('Luksong-tinik is winnable through six timed keyboard jumps and saves its record', async ({ page }) => {
  test.setTimeout(80000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page); await choose(page, 'Luksong-tinik'); await page.getByRole('button', { name: 'Challenge · three chances' }).click();
  for (let level = 1; level <= 6; level++) {
    await expect(page.locator('#game')).toHaveAttribute('data-level', String(level), { timeout: 10000 });
    await expect(page.locator('#game')).toHaveAttribute('data-tinik-hands', String(Math.min(4, level)));
    await expect(page.locator('#game')).toHaveAttribute('data-tinik-art', 'pixel-png');
    await expect(page.locator('#game')).toHaveAttribute('data-tinik-feet', String(Math.max(0, level - 4)));
    await page.screenshot({ path: `artifacts/tinik-height-${level}.png` });
    await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'run');
    const stage = tinikStage(level, 'easy'), takeoff = (stage.takeoffMin + stage.takeoffMax) / 2 - 4;
    await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-x')), { intervals: [15] }).toBeGreaterThanOrEqual(takeoff);
    await page.keyboard.press('Space');
    await expect(page.locator('#game')).toHaveAttribute('data-cleared', String(level), { timeout: 5000 });
  }
  await expect(page.getByRole('heading', { name: 'Ang taas ng talon mo!' })).toBeVisible();
  await expect(page.locator('#coins')).toHaveText('90'); await expect(page.locator('#best')).toHaveText('6/6');
  await page.screenshot({ path: 'artifacts/laro-tinik-win.png', fullPage: true });
  await page.reload(); await page.getByRole('button', { name: 'Choose Luksong-tinik', exact: true }).click();
  await expect(page.locator('#best')).toHaveText('6/6'); await expect(page.locator('#coins')).toHaveText('90'); expect(errors).toEqual([]);
});

test('Luksong-tinik practice retries missed jumps without awarding coins', async ({ page }) => {
  await ready(page); await choose(page, 'Luksong-tinik'); await page.getByRole('button', { name: 'Practice · unlimited retries' }).click();
  await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'stumble');
  await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'ready');
  await expect(page.locator('#lives')).toHaveText('PRACTICE ∞'); await expect(page.locator('#coins')).toHaveText('0');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('new games fit on mobile and use touch buttons', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
  await choose(page, 'Dama'); await page.getByRole('button', { name: 'Two players · pass-and-play' }).click();
  const box = await page.locator('.dama-board').boundingBox(); expect(box!.width).toBeGreaterThan(250); expect(box!.width).toBeLessThan(360);
  await page.locator('[data-square="40"]').click(); await page.locator('[data-square="33"]').click();
  await page.screenshot({ path: 'artifacts/laro-dama-mobile.png', fullPage: true });
  await page.locator('#nav-hub').click(); await page.getByRole('button', { name: 'Return to the barangay' }).click();
  await choose(page, 'Luksong-tinik'); await page.getByRole('button', { name: 'Challenge · three chances' }).click();
  await expect(page.locator('#activity-action')).toBeVisible();
  await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'run'); await page.locator('#activity-action').click();
  await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'air');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
});
