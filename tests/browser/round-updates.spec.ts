import { test, expect } from '@playwright/test';
import { findPhone } from '../helpers/hub-walk';
test.use({ hasTouch: true });
async function ready(page: import('@playwright/test').Page) { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); }

test('rotation hint expires after three seconds and browser-bar resizes do not bring it back', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Fallback')); Object.defineProperty(screen.orientation, 'lock', { value: () => Promise.reject(new Error('Rotate manually')), configurable: true }); });
  await ready(page); await page.locator('#fullscreen-button').click(); await expect(page.locator('#rotate-hint')).toBeVisible();
  await expect(page.locator('#rotate-hint')).toBeHidden({ timeout: 3600 });
  await page.setViewportSize({ width: 390, height: 800 }); await expect(page.locator('#rotate-hint')).toBeHidden();
  await page.setViewportSize({ width: 932, height: 430 }); await page.setViewportSize({ width: 390, height: 844 }); await expect(page.locator('#rotate-hint')).toBeVisible();
});

test('landscape canvas fills the stage, keeps pointer coordinates correct, and pauses behind the Menu drawer', async ({ page }) => {
  await page.setViewportSize({ width: 932, height: 430 }); await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Fallback')); });
  await ready(page); await page.locator('#fullscreen-button').click(); await expect(page.locator('#fullscreen-nav')).toBeHidden();
  const shell = (await page.locator('#game-shell').boundingBox())!;
  await expect.poll(async () => (await page.locator('#game canvas').boundingBox())!.width).toBeGreaterThan(shell.width - 2);
  const canvas = (await page.locator('#game canvas').boundingBox())!; expect(canvas.height).toBeGreaterThan(shell.height - 2); expect(shell.height).toBeGreaterThan(380);
  const logical = await page.locator('#game canvas').evaluate(canvas => ({ width: (canvas as HTMLCanvasElement).width, height: (canvas as HTMLCanvasElement).height }));
  const startX = Number(await page.locator('#game').getAttribute('data-x')), y = Number(await page.locator('#game').getAttribute('data-y')), cameraX = Number(await page.locator('#game').getAttribute('data-camera-x'));
  await page.locator('#game canvas').click({ position: { x: (startX + 80 - cameraX) / logical.width * canvas.width, y: y / logical.height * canvas.height } });
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-x'))).toBeGreaterThan(startX + 60);
  await page.locator('#play-menu').click(); await expect(page.locator('#fullscreen-nav')).toBeVisible(); const frozen = await page.locator('#game').getAttribute('data-x'); await page.waitForTimeout(250); expect(await page.locator('#game').getAttribute('data-x')).toBe(frozen);
  await page.screenshot({ path: 'artifacts/landscape-menu-drawer.png' }); await page.locator('#play-menu').click(); await page.screenshot({ path: 'artifacts/landscape-full-width-world.png' });
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect.poll(async () => { const shell = (await page.locator('#game-shell').boundingBox())!, canvas = (await page.locator('#game canvas').boundingBox())!; return Math.max(Math.abs(shell.width - canvas.width), Math.abs(shell.height - canvas.height)); }).toBeLessThan(2);
});

test('phone relocates once after a finished game and again after leaving a second game early', async ({ page }) => {
  test.setTimeout(75000); await ready(page); const game = page.locator('#game'); await findPhone(page); const first = await game.getAttribute('data-phone-spot');
  await page.locator('#phone-snake').click(); await page.locator('#retro-start').click(); await expect(page.getByRole('heading', { name: 'Game over. One more?' })).toBeVisible();
  const second = await game.getAttribute('data-phone-spot'); expect(second).not.toBe(first); await expect(page.locator('#pocket-phone')).toBeHidden();
  await page.locator('#return-button').click(); expect(await game.getAttribute('data-phone-spot')).toBe(second); await expect(game).toHaveAttribute('data-phone-found', 'false');
  await findPhone(page); await page.locator('#phone-impact').click(); await page.locator('#retro-start').click(); await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  expect(await game.getAttribute('data-phone-spot')).not.toBe(second); await expect(game).toHaveAttribute('data-phone-found', 'false');
});

test('invalid Dama moves and rope failures vibrate even when muted; the vibration setting persists', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { buzzes: unknown[] }).buzzes = [];
    Object.defineProperty(navigator, 'vibrate', { configurable: true, writable: true, value: (pattern: unknown) => { (window as unknown as { buzzes: unknown[] }).buzzes.push(pattern); return true; } });
    localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ muted: true }));
  });
  await ready(page); await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('#dama-local').click();
  await page.locator('[data-square="24"]').click(); await expect.poll(() => page.evaluate(() => (window as unknown as { buzzes: unknown[] }).buzzes.length)).toBe(1);
  await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); await page.locator('[data-game="lubid"]').click(); await page.locator('#play-button').click(); await page.locator('#lubid-start').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { buzzes: unknown[] }).buzzes.length)).toBeGreaterThan(1);
  await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); await page.locator('#settings-button').click(); await page.locator('#vibration-enabled').uncheck(); await page.locator('#save-settings').click();
  await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('#dama-local').click(); const count = await page.evaluate(() => (window as unknown as { buzzes: unknown[] }).buzzes.length); await page.locator('[data-square="24"]').click(); expect(await page.evaluate(() => (window as unknown as { buzzes: unknown[] }).buzzes.length)).toBe(count);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!).vibration)).toBe(false);
});
