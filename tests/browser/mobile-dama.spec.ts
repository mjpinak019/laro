import { test, expect, type Page } from '@playwright/test';

test.use({ hasTouch: true });
const ready = async (page: Page) => { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); };
const chooseDama = async (page: Page) => { await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); };

test('Ferdie and Tatay Efren play offline, and saved matches keep their opponent', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await ready(page); await expect(page.locator('#player-name')).toHaveText('Ikaw');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })); });
  await context.setOffline(true); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await chooseDama(page); await expect(page.locator('#dama-difficulty option')).toHaveCount(5);
  await page.locator('#dama-difficulty').selectOption('expert'); await expect(page.locator('#dama-bot')).toHaveText('Play against Ferdie'); await page.locator('#dama-bot').click();
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-difficulty', 'expert');
  await page.locator('[data-square="40"]').click(); await page.locator('[data-square="33"]').click();
  await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '2');
  await page.locator('#settings-button').click(); await page.locator('#settings-dama-difficulty').selectOption('master'); await page.locator('#save-settings').click();
  await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await chooseDama(page); await page.locator('#resume-dama').click(); await expect(page.locator('.dama-heading')).toContainText('Ferdie'); await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '2');
  await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  await chooseDama(page); await expect(page.locator('#dama-difficulty')).toHaveValue('master'); await page.locator('#dama-bot').click();
  await expect(page.locator('.dama-heading')).toContainText('Tatay Efren');
  await page.locator('[data-square="40"]').click(); await page.locator('[data-square="33"]').click(); await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '2');
  await page.screenshot({ path: 'artifacts/laro-master-dama.png', fullPage: true }); expect(errors).toEqual([]);
});

test('circular pad is left of Takbo and supports two-finger diagonal sprinting', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
  const pad = (await page.locator('#touch-pad').boundingBox())!, run = (await page.locator('#touch-run').boundingBox())!;
  expect(pad.width).toBe(pad.height); expect(pad.x + pad.width).toBeLessThan(run.x);
  await expect(page.locator('[data-dir]')).toHaveCount(0); await expect(page.locator('#touch-run')).toHaveText('Takbo');
  const startX = Number(await page.locator('#game').getAttribute('data-x')), startY = Number(await page.locator('#game').getAttribute('data-y'));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: run.x + run.width / 2, y: run.y + run.height / 2, id: 1 }, { x: pad.x + pad.width * .75, y: pad.y + pad.height * .25, id: 2 }] });
  await page.waitForTimeout(450);
  expect(Number(await page.locator('#game').getAttribute('data-x'))).toBeGreaterThan(startX + 45);
  expect(Number(await page.locator('#game').getAttribute('data-y'))).toBeLessThan(startY - 45);
  expect(await page.locator('#stamina-fill').getAttribute('style')).not.toContain('100%');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await expect(page.locator('.held')).toHaveCount(0);
  await expect(page.locator('#touch-pad')).toHaveAttribute('data-moving', 'false');
  await page.screenshot({ path: 'artifacts/laro-circular-controls.png', fullPage: true });
});

test('native fullscreen includes navigation and dialogs and can be exited cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => { Object.defineProperty(screen.orientation, 'lock', { configurable: true, value: async (value: string) => { document.documentElement.dataset.orientationRequest = value; } }); });
  await ready(page); await page.locator('#fullscreen-button').click();
  await expect(page.locator('#game-display')).toHaveAttribute('data-display-mode', 'native');
  await expect(page.locator('html')).toHaveAttribute('data-orientation-request', 'landscape');
  expect(await page.evaluate(() => document.fullscreenElement?.contains(document.querySelector('#fullscreen-nav')))).toBe(true);
  await expect(page.locator('#touch-pad')).toBeVisible(); await expect(page.locator('#touch-run')).toBeVisible();
  await page.locator('[data-screen-nav="nav-play"]').click(); await page.locator('[data-menu-game="tinik"]').click(); await page.locator('#tinik-practice').click();
  await expect(page.locator('#game')).toHaveAttribute('data-mode', 'tinik');
  await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'run'); await page.locator('#activity-action').click(); await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'air');
  await page.locator('[data-screen-nav="guide-button"]').click(); await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement?.contains(document.querySelector('#modal')))).toBe(true);
  await page.locator('#close-modal').click(); await page.screenshot({ path: 'artifacts/laro-native-landscape.png' });
  await page.evaluate(() => document.exitFullscreen()); await expect(page.locator('#game-display')).not.toHaveClass(/play-fullscreen/);
  await expect(page.locator('#fullscreen-button')).toHaveAttribute('aria-label', 'Fullscreen game');
});

test('denied fullscreen and orientation still provide a working mobile landscape panel', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    HTMLElement.prototype.requestFullscreen = () => Promise.reject(new DOMException('Not available', 'NotSupportedError'));
    Object.defineProperty(screen.orientation, 'lock', { configurable: true, value: () => Promise.reject(new DOMException('Rotate device', 'NotSupportedError')) });
  });
  await ready(page); await page.locator('#fullscreen-button').click();
  await expect(page.locator('#game-display')).toHaveAttribute('data-display-mode', 'immersive'); await expect(page.locator('#rotate-hint')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 }); await expect(page.locator('#rotate-hint')).toBeHidden();
  await page.locator('[data-screen-nav="nav-play"]').click(); await page.locator('[data-menu-game="dama"]').click();
  await page.locator('#dama-difficulty').selectOption('master'); await page.locator('#dama-bot').click();
  const board = (await page.locator('.dama-board').boundingBox())!, nav = (await page.locator('#fullscreen-nav').boundingBox())!;
  expect(board.y).toBeGreaterThanOrEqual(44); expect(board.y + board.height).toBeLessThan(nav.y); expect(board.width).toBeGreaterThan(200);
  const heading = (await page.locator('.dama-heading').boundingBox())!, footer = (await page.locator('.dama-footer').boundingBox())!;
  expect(heading.y).toBeGreaterThanOrEqual(44); expect(heading.x + heading.width).toBeLessThan(board.x);
  expect(footer.x).toBeGreaterThan(board.x + board.width); expect(footer.y + footer.height).toBeLessThan(nav.y);
  await page.locator('[data-square="40"]').click(); await page.locator('[data-square="33"]').click(); await expect(page.locator('#dama-stage')).toHaveAttribute('data-ply', '2');
  await page.locator('[data-screen-nav="settings-button"]').click(); await expect(page.locator('#settings-dama-difficulty')).toHaveValue('master'); await page.locator('#save-settings').click();
  await page.screenshot({ path: 'artifacts/laro-fallback-landscape-dama.png' });
  await page.locator('#exit-play-screen').click(); await expect(page.locator('#game-display')).not.toHaveClass(/play-fullscreen/); expect(errors).toEqual([]);
});
