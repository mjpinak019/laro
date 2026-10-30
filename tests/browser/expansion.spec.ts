import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { findPhone } from '../helpers/hub-walk';

test.use({ hasTouch: true });
const profileKey = 'laro.offline.profile.v1';
async function ready(page: Page, coins?: number) {
  if (coins !== undefined) await page.addInitScript(coins => { if (!localStorage.getItem('test-seeded')) { localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ coins, name: 'Sab', gender: 'girl' })); localStorage.setItem('test-seeded', 'true'); } }, coins);
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
}
async function lubid(page: Page) { await page.locator('[data-game="lubid"]').click(); await page.locator('#play-button').click(); await page.locator('#lubid-start').click(); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'playing'); }

test('free basics and paid accessories save, preview without spending, and never charge twice', async ({ page }) => {
  await ready(page, 250); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.locator('#avatar-button').click(); await page.locator('[data-shop-category="skin"]').click(); await page.locator('[data-equip-item="skin-morena"]').click();
  await expect(page.locator('#shop-coins')).toHaveText('250 coins');
  await page.locator('[data-shop-category="hat"]').click(); const original = await page.locator('#wardrobe-preview').evaluate(c => (c as HTMLCanvasElement).toDataURL()); await page.locator('[data-preview-item="hat-cap"]').click();
  expect(await page.locator('#wardrobe-preview').evaluate(c => (c as HTMLCanvasElement).toDataURL())).not.toBe(original); await expect(page.locator('#shop-coins')).toHaveText('250 coins');
  await page.locator('[data-equip-item="hat-cap"]').click(); await expect(page.locator('#shop-coins')).toHaveText('205 coins'); await expect(page.locator('[data-equip-item="hat-cap"]')).toBeDisabled();
  await page.locator('[data-shop-category="top"]').click(); await page.locator('[data-equip-item="top-varsity"]').click(); await expect(page.locator('#shop-coins')).toHaveText('55 coins');
  await page.locator('[data-shop-category="beard"]').click(); await page.locator('[data-equip-item="beard-mustache"]').click(); await expect(page.locator('#shop-coins')).toHaveText('0 coins');
  await page.locator('[data-shop-category="costume"]').click(); await expect(page.locator('[data-equip-item="costume-ranger"]')).toBeDisabled();
  await page.screenshot({ path: 'artifacts/wardrobe-and-coin-shop.png', fullPage: true }); await page.locator('#close-modal').click(); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), profileKey); expect(saved.coins).toBe(0); expect(saved.wardrobe.owned).toHaveLength(3); expect(saved.wardrobe.equipped.hat).toBe('hat-cap'); expect(saved.wardrobe.equipped.skin).toBe('skin-morena');
  await expect(page.locator('#game')).toHaveAttribute('data-avatar-outfit', JSON.stringify(saved.wardrobe.equipped));
  await page.locator('#play-button').click(); await expect(page.locator('#game')).toHaveAttribute('data-mode', 'match'); expect(errors).toEqual([]);
});
test('save files export real purchases and restore them after clearing the isolated browser profile', async ({ page }) => {
  await ready(page, 1000); await page.locator('#avatar-button').click(); await page.locator('[data-shop-category="costume"]').click(); await page.locator('[data-equip-item="costume-ranger"]').click(); await page.locator('#close-modal').click();
  await page.locator('#settings-button').click(); const download = page.waitForEvent('download'); await page.locator('#export-save').click(); const file = await download, text = await readFile((await file.path())!, 'utf8');
  const data = JSON.parse(text); expect(data.profile.coins).toBe(480); expect(data.profile.wardrobe.equipped.costume).toBe('costume-ranger');
  await page.locator('#import-save').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') }); await expect(page.locator('#backup-status')).toContainText('valid LARO'); await expect(page.locator('#coins')).toHaveText('480');
  await page.evaluate(() => { localStorage.removeItem('laro.offline.profile.v1'); }); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await expect(page.locator('#coins')).toHaveText('0');
  await page.locator('#settings-button').click(); await page.locator('#import-save').setInputFiles({ name: 'laro-save.json', mimeType: 'application/json', buffer: Buffer.from(text) }); await expect(page.locator('#backup-preview-text')).toContainText('480 coins'); await expect(page.locator('#coins')).toHaveText('0');
  await page.locator('#confirm-import').click(); await expect(page.locator('#coins')).toHaveText('480'); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).wardrobe.equipped.costume, profileKey)).toBe('costume-ranger');
});
test('a browser that blocks saving cannot consume coins for a wardrobe purchase', async ({ page }) => {
  await ready(page, 100); await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'laro.offline.profile.v1') throw new DOMException('Blocked', 'QuotaExceededError'); return original.call(this, key, value); }; });
  await page.locator('#avatar-button').click(); await page.locator('[data-equip-item="hat-cap"]').click();
  await expect(page.locator('#shop-coins')).toHaveText('100 coins'); await expect(page.locator('#shop-status')).toContainText('No coins were charged');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), profileKey); expect(saved.coins).toBe(100); expect(saved.wardrobe?.owned ?? []).toHaveLength(0);
});
test('rope taps react on pointer down, holding does not repeat, and pause freezes the rope', async ({ page }) => {
  await ready(page); await lubid(page); const game = page.locator('#game');
  const box = (await page.locator('#activity-action').boundingBox())!; await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await expect(game).toHaveAttribute('data-jumps', '1'); await expect.poll(async () => Number(await game.getAttribute('data-jump-height'))).toBeGreaterThan(20); await page.waitForTimeout(600); await expect(game).toHaveAttribute('data-jumps', '1'); await page.mouse.up();
  await page.locator('#pause-button').click(); const frozen = await game.getAttribute('data-rope-in'); await page.waitForTimeout(250); expect(await game.getAttribute('data-rope-in')).toBe(frozen); await page.locator('#resume-button').click();
  await page.locator('#game canvas').click({ position: { x: 100, y: 120 } }); await expect(game).toHaveAttribute('data-jumps', '2');
  await page.screenshot({ path: 'artifacts/luksong-lubid.png', fullPage: true });
});
test('thirty timed rope jumps win once, increase speed, and save coins and the clearance record', async ({ page }) => {
  test.setTimeout(120000); await ready(page); await lubid(page); const game = page.locator('#game');
  const initial = Number(await game.getAttribute('data-rope-period'));
  for (let cleared = 1; cleared <= 30; cleared++) {
    await expect.poll(async () => Number(await game.getAttribute('data-rope-in')), { intervals: [15] }).toBeLessThan(.26);
    await page.locator('#activity-action').click(); await expect(game).toHaveAttribute('data-cleared', String(cleared));
  }
  await expect(page.getByRole('heading', { name: 'Thirty jumps. Ang galing!' })).toBeVisible(); expect(Number(await game.getAttribute('data-rope-period'))).toBeLessThan(initial); await expect(page.locator('#coins')).toHaveText('90');
  const record = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records.lubid, profileKey); expect(record).toEqual({ wins: 1, played: 1, best: 30 });
  await page.locator('#return-button').click(); await page.reload(); await expect(page.locator('#coins')).toHaveText('90');
});
test('the phone re-rolls on reload, can be found by walking, and both retro games work in its simulator', async ({ page }) => {
  test.setTimeout(100000); await ready(page); const game = page.locator('#game'), originalSpot = await game.getAttribute('data-phone-spot'); await page.reload(); await expect(game).toHaveAttribute('data-ready', 'true');
  expect(await game.getAttribute('data-phone-spot')).not.toBe(originalSpot); await expect(page.locator('[data-menu-game="snake"]')).toHaveCount(0); await findPhone(page);
  await page.locator('#phone-snake').click(); await expect(page.locator('#retro-stage')).toHaveAttribute('data-game', 'snake'); await expect(page.locator('.retro-brand')).toHaveText('TALA 01'); await page.locator('#retro-start').click();
  await page.locator('.retro-keypad [data-retro-input="up"]').click();
  await page.keyboard.press('ArrowDown'); // Cannot reverse immediately from the queued up turn.
  await page.screenshot({ path: 'artifacts/secret-phone-snake.png', fullPage: true });
  await expect(page.getByRole('heading', { name: 'Game over. One more?' })).toBeVisible({ timeout: 10000 });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).records.snake.played, profileKey)).toBe(1);
  await page.locator('#return-button').click(); await page.locator('#pocket-phone').click(); await page.locator('#phone-impact').click(); await page.locator('#retro-start').click();
  await page.keyboard.down('Space'); await expect.poll(async () => Number(await page.locator('#retro-stage').getAttribute('data-bullets'))).toBeGreaterThan(0); await page.keyboard.up('Space');
  await page.locator('#retro-help').click(); const helpFrozen = await page.locator('#retro-stage').getAttribute('data-time'); await page.waitForTimeout(200); expect(await page.locator('#retro-stage').getAttribute('data-time')).toBe(helpFrozen); await expect(page.locator('#retro-status')).toContainText('Paused'); await page.keyboard.press('Escape'); await expect(page.locator('#retro-help')).toHaveText('Controls');
  await page.locator('#pause-button').click(); const frozen = await page.locator('#retro-stage').getAttribute('data-time'); await page.waitForTimeout(200); expect(await page.locator('#retro-stage').getAttribute('data-time')).toBe(frozen); await page.locator('#resume-button').click();
  await page.screenshot({ path: 'artifacts/secret-phone-orbit.png', fullPage: true });
});
test('mobile wardrobe and backups stay usable offline and fit the portrait viewport', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page, 700); await page.locator('#avatar-button').click();
  await page.locator('[data-shop-category="costume"]').click(); await page.locator('[data-equip-item="costume-clockwork"]').click(); await expect(page.locator('#shop-coins')).toHaveText('50 coins');
  await page.screenshot({ path: 'artifacts/wardrobe-mobile.png' }); await page.locator('#close-modal').click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true); await context.setOffline(true); await page.reload();
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await expect(page.locator('#coins')).toHaveText('50');
  await page.locator('#avatar-button').click(); await page.locator('[data-shop-category="costume"]').click(); await expect(page.locator('[data-equip-item="costume-clockwork"]')).toHaveText('Wearing');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390); await page.locator('#close-modal').click();
  await page.locator('#settings-button').click(); const download = page.waitForEvent('download'); await page.locator('#export-save').click(); expect((await download).suggestedFilename()).toMatch(/^laro-save.*json$/); await page.locator('#close-modal').click();
  await lubid(page); await expect(page.locator('#game')).toHaveAttribute('data-mode', 'lubid'); await context.setOffline(false);
});
test('the retro phone works offline with two touch controls and fits short landscape browser windows', async ({ page, context }) => {
  test.setTimeout(70000); await ready(page); await findPhone(page); await page.locator('#phone-impact').click();
  await page.setViewportSize({ width: 932, height: 430 }); await page.evaluate(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Mobile fallback')); }); await page.locator('#fullscreen-button').click();
  await page.locator('#retro-start').click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true); await context.setOffline(true);
  const right = (await page.locator('.retro-dpad [data-retro-input="right"]').boundingBox())!, fire = (await page.locator('#retro-fire').boundingBox())!, client = await context.newCDPSession(page);
  const touchPoints = [{ x: right.x + right.width / 2, y: right.y + right.height / 2, id: 1 }, { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 2 }];
  const initial = JSON.parse((await page.locator('#retro-stage').getAttribute('data-player'))!);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
  await expect.poll(async () => JSON.parse((await page.locator('#retro-stage').getAttribute('data-player'))!).x).toBeGreaterThan(initial.x + 5); await expect.poll(async () => Number(await page.locator('#retro-stage').getAttribute('data-bullets'))).toBeGreaterThan(0);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.locator('#pause-button').click(); const frozen = await page.locator('#retro-stage').getAttribute('data-player'); await page.waitForTimeout(150); expect(await page.locator('#retro-stage').getAttribute('data-player')).toBe(frozen); await page.locator('#resume-button').click();
  await page.locator('#pause-button').click(); await page.setViewportSize({ width: 932, height: 330 }); await page.locator('#resume-button').click();
  for (const selector of ['#retro-canvas', '#retro-start', '.retro-controller', '#fullscreen-nav']) {
    const box = (await page.locator(selector).boundingBox())!; expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(331); expect(box.height).toBeGreaterThan(15);
  }
  await page.screenshot({ path: 'artifacts/secret-phone-landscape.png' }); await page.locator('#exit-play-screen').click();
  await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); await page.locator('#pocket-phone').click(); await page.locator('#phone-snake').click(); await expect(page.locator('#retro-stage')).toHaveAttribute('data-game', 'snake'); await context.setOffline(false);
});
