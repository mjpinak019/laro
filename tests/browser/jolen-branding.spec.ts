import { screenNav } from '../helpers/screen-nav';
import { test, expect, type Page } from '@playwright/test';
import { GAME_VERSION } from '../../client/src/version';
import { initialJolen, chooseJolenShot } from '../../client/src/games/jolen-rules';
test.use({ hasTouch: true });

async function openJolen(page: Page, difficulty = 'easy') {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-game="jolen"]').click(); await page.locator('#play-button').click();
  await page.locator('#jolen-difficulty').selectOption(difficulty); await page.locator('#jolen-start').click();
  await expect(page.locator('#jolen-stage')).toHaveAttribute('data-phase', 'aim');
}
test('the Jolen court has a reachable barangay entrance and returns to the same location', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.keyboard.down('d');
  try { await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-x')), { timeout: 12000, intervals: [35] }).toBeGreaterThan(975); }
  finally { await page.keyboard.up('d'); }
  await expect(page.locator('#game')).toHaveAttribute('data-nearby', 'jolen');
  await expect(page.locator('#activity-action')).toHaveText('Play Jolen · E');
  await page.screenshot({ path: 'artifacts/jolen-barangay-court.png', fullPage: true });
  await page.keyboard.press('e'); await expect(page.getByRole('heading', { name: 'Tara, Jolen tayo.' })).toBeVisible();
  await page.locator('#jolen-start').click(); await expect(page.locator('#jolen-stage')).toBeVisible();
  await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  await expect(page.locator('#game')).toHaveAttribute('data-mode', 'hub'); expect(Number(await page.locator('#game').getAttribute('data-x'))).toBeGreaterThan(950);
  expect(errors).toEqual([]);
});
test('the themed loading screen appears before the game and About has the credits and version', async ({ page }) => {
  let release!: () => void;
  await page.route('**/assets/*.js', async route => { await new Promise<void>(resolve => { release = resolve; }); await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' }); await expect(page.locator('#boot-screen')).toBeVisible();
  await expect(page.locator('.tphilo-wordmark')).toContainText('tphilo'); await expect(page.locator('.boot-credit')).toContainText('developed by Sab');
  await expect.poll(() => typeof release).toBe('function');
  await page.screenshot({ path: 'artifacts/tphilo-loading-screen.png' }); release();
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await expect(page.locator('#boot-screen')).toBeHidden();
  await page.unroute('**/assets/*.js');
  await page.locator('#about-button').click(); await expect(page.getByRole('heading', { name: 'About LARO' })).toBeVisible();
  await expect(page.locator('.about-credits')).toContainText('tphilo games'); await expect(page.locator('.about-credits')).toContainText('developed by Sab');
  await expect(page.locator('#about-version')).toHaveText(`Version ${GAME_VERSION}`); await page.locator('#about-close').click();
  await expect(page.locator('#hub-map')).toContainText('8 PLACES'); await expect(page.locator('[data-game]')).toHaveCount(8);
});
test('Jolen has fast timed power, persistent shooters, visible bot motion, and no early-leave rewards', async ({ page }) => {
  await openJolen(page);
  const stage = page.locator('#jolen-stage'), initial = JSON.parse((await stage.getAttribute('data-shooters'))!);
  await expect(page.locator('#jolen-bot')).toContainText('Pom'); await expect(page.locator('.touch-controls')).toBeHidden();
  await page.locator('#jolen-angle').fill('180'); await page.locator('#jolen-shoot').click();
  await expect(stage).toHaveAttribute('data-phase', 'power'); await expect.poll(async () => Number(await page.locator('#jolen-power').getAttribute('aria-valuenow'))).toBeGreaterThan(50);
  await page.locator('#pause-button').click(); const frozen = await page.locator('#jolen-power').getAttribute('aria-valuenow');
  await page.waitForTimeout(250); expect(await page.locator('#jolen-power').getAttribute('aria-valuenow')).toBe(frozen);
  await page.locator('#resume-button').click(); await page.locator('#jolen-cancel').click(); await expect(stage).toHaveAttribute('data-phase', 'aim');
  await page.locator('#jolen-shoot').click(); await expect.poll(async () => Number(await page.locator('#jolen-power').getAttribute('aria-valuenow')), { intervals: [20] }).toBeGreaterThan(65);
  await page.locator('#jolen-shoot').click(); await expect(stage).toHaveAttribute('data-phase', 'rolling');
  await expect.poll(async () => JSON.parse((await stage.getAttribute('data-shooters'))!)[0].x).toBeLessThan(initial[0].x - 25);
  await expect(stage).toHaveAttribute('data-turn', '1', { timeout: 15000 });
  const landed = JSON.parse((await stage.getAttribute('data-shooters'))!)[0];
  await expect(stage).toHaveAttribute('data-phase', 'power'); await expect(page.locator('#jolen-shoot')).toBeDisabled();
  await page.screenshot({ path: 'artifacts/jolen-bot-aim.png', fullPage: true });
  await expect(stage).toHaveAttribute('data-shots', '2', { timeout: 15000 });
  await expect.poll(async () => JSON.parse((await stage.getAttribute('data-shooters'))!)[1].y).not.toBe(initial[1].y);
  await expect(stage).toHaveAttribute('data-turn', '0', { timeout: 15000 }); await expect(stage).toHaveAttribute('data-phase', 'aim');
  expect(JSON.parse((await stage.getAttribute('data-shooters'))!)[0]).toEqual(landed);
  await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); await expect(stage).toHaveCount(0); await expect(page.locator('#coins')).toHaveText('0');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).records.jolen.played)).toBe(0);
});
test('Jolen landscape fallback keeps court, aiming controls, and About inside the visible panel', async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 });
  await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Mobile fallback')); });
  await openJolen(page, 'master'); await expect(page.locator('#jolen-bot')).toContainText('Tatay Efren');
  await page.locator('#fullscreen-button').click(); await expect(page.locator('#game-display')).toHaveClass(/play-fullscreen/);
  for (const selector of ['#jolen-canvas', '#jolen-angle', '#jolen-shoot']) {
    const box = (await page.locator(selector).boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(933); expect(box.y + box.height).toBeLessThanOrEqual(431); expect(box.height).toBeGreaterThan(10);
  }
  await expect(page.locator('.touch-controls')).toBeHidden(); await page.screenshot({ path: 'artifacts/jolen-mobile-landscape.png' });
  await screenNav(page, 'about-button'); await expect(page.locator('#about-version')).toBeVisible(); await page.locator('#about-close').click();
  await page.locator('#fullscreen-button').click(); await page.setViewportSize({ width: 390, height: 844 });
  const shell = (await page.locator('#game-shell').boundingBox())!, content = (await page.locator('#jolen-stage').boundingBox())!; expect(content.y - shell.y).toBeLessThan(5);
  await page.screenshot({ path: 'artifacts/jolen-mobile-portrait.png', fullPage: true });
  await expect(page.locator('#about-button')).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth); expect(width).toBeLessThanOrEqual(390);
});
test('Jolen reloads offline and its separate difficulty survives without changing Dama', async ({ page, context }) => {
  await openJolen(page, 'expert');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-game="jolen"]').click(); await page.locator('#play-button').click(); await expect(page.locator('#jolen-difficulty')).toHaveValue('expert');
  await page.locator('#jolen-start').click(); await expect(page.locator('#jolen-stage')).toHaveAttribute('data-phase', 'aim'); await expect(page.locator('#jolen-bot')).toContainText('Ferdie');
  await page.locator('#about-button').click(); await expect(page.locator('.about-logo img')).toBeVisible(); expect(await page.locator('.about-logo img').evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).damaDifficulty)).toBe('easy');
  await context.setOffline(false);
});
test('a complete Jolen match awards one result and preserves its collection record after reload', async ({ page }) => {
  test.setTimeout(120000);
  await openJolen(page, 'master'); await page.evaluate(() => { Math.random = () => .5; });
  const stage = page.locator('#jolen-stage');
  for (let turn = 0; turn < 12; turn++) {
    if (await stage.getAttribute('data-phase') === 'finished') break;
    await expect(stage).toHaveAttribute('data-turn', '0'); await expect(stage).toHaveAttribute('data-phase', 'aim');
    const board = initialJolen(4); board.hole = JSON.parse((await stage.getAttribute('data-hole'))!); board.marbles = JSON.parse((await stage.getAttribute('data-marbles'))!); board.scores = JSON.parse((await stage.getAttribute('data-scores'))!);
    const shot = chooseJolenShot(board, 4, () => .5), degrees = (Math.round(shot.angle * 180 / Math.PI) + 360) % 360;
    await page.locator('#jolen-angle').fill(String(degrees)); await page.locator('#jolen-shoot').click();
    await page.waitForTimeout(Math.round(600 * (shot.power - .08) / .92)); await page.locator('#jolen-shoot').click();
    await expect.poll(async () => {
      const phase = await stage.getAttribute('data-phase');
      return phase === 'finished' || phase === 'aim' && await stage.getAttribute('data-turn') === '0';
    }, { timeout: 25000, intervals: [100] }).toBe(true);
  }
  await expect(page.locator('#jolen-stage')).toHaveAttribute('data-phase', 'finished');
  const scores = JSON.parse((await page.locator('#jolen-stage').getAttribute('data-scores'))!) as number[]; const pocket = await page.locator('#jolen-stage').getAttribute('data-pocket-winner'); if (pocket === 'null') expect(scores[0] + scores[1]).toBe(15); else expect(scores[0] + scores[1]).toBeLessThanOrEqual(15);
  const won = pocket !== 'null' ? pocket === '0' : scores[0] > scores[1]; await expect(page.locator('#coins')).toHaveText(won ? '100' : '10');
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).records.jolen);
  expect(record).toEqual({ wins: won ? 1 : 0, played: 1, best: scores[0] });
  await page.screenshot({ path: 'artifacts/jolen-finished-match.png', fullPage: true });
  await page.locator('#return-button').click(); await page.reload(); await expect(page.locator('#coins')).toHaveText(won ? '100' : '10');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).records.jolen.played)).toBe(1);
});
