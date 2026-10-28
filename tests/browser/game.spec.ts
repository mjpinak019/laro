import { expect, test } from '@playwright/test';

test('hub renders, player walks, avatar persists, and menus remain accessible', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('canvas')).toBeVisible();
  const startX = Number(await page.locator('#game').getAttribute('data-x'));
  await page.keyboard.down('d'); await page.waitForTimeout(450); await page.keyboard.up('d');
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-x'))).toBeGreaterThan(startX + 30);
  await page.getByRole('button', { name: 'My avatar' }).click();
  await page.getByLabel('YOUR NICKNAME').fill('');
  await page.getByLabel('YOUR NICKNAME').pressSequentially('Juan Dela Cruz');
  await page.getByRole('button', { name: 'Ocean shirt' }).click();
  await page.getByRole('button', { name: 'Save my avatar' }).click();
  await expect(page.locator('#player-name')).toHaveText('Juan Dela Cruz');
  await page.reload(); await expect(page.locator('#player-name')).toHaveText('Juan Dela Cruz');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: 'artifacts/laro-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('round counts down, pauses without losing time, and confirms leaving', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.locator('#play-button').click();
  await expect(page.locator('#location-title')).toHaveText('Patintero Court');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'playing');
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  const clock = await page.locator('#timer').textContent();
  await page.waitForTimeout(1250); await expect(page.locator('#timer')).toHaveText(clock!);
  await page.getByRole('button', { name: 'Back to playing' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.screenshot({ path: 'artifacts/laro-patintero.png', fullPage: true });
  await page.locator('#nav-hub').click(); await page.getByRole('button', { name: 'Keep playing' }).click();
  await expect(page.locator('#location-title')).toHaveText('Patintero Court');
  await page.locator('#nav-hub').click(); await page.getByRole('button', { name: 'Return to the barangay' }).click();
  await expect(page.locator('#location-title')).toHaveText('Barangay Maligaya');
  await expect(page.locator('#coins')).toHaveText('0');
});

test('production reloads with the network disconnected and no external asset requests', async ({ page, context }) => {
  const external: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('data:')) external.push(request.url()); });
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })); });
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.locator('#play-button').click(); await expect(page.locator('#location-title')).toHaveText('Patintero Court');
  expect(external).toEqual([]);
});

test('mobile layout fits, touch movement works, and rulebook opens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('button', { name: 'Move right', exact: true })).toBeVisible();
  const startX = Number(await page.locator('#game').getAttribute('data-x'));
  const button = await page.getByRole('button', { name: 'Move right', exact: true }).boundingBox();
  await page.mouse.move(button!.x + button!.width / 2, button!.y + button!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-x'))).toBeGreaterThan(startX + 20);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/laro-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('heading', { name: 'Tara, Patintero!' })).toBeVisible();
});

test('corrupt saved data does not prevent playing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('laro.offline.profile.v1', '{broken'));
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#player-name')).toHaveText('Kaibigan');
  await page.locator('#play-button').click(); await expect(page.locator('#location-title')).toHaveText('Patintero Court');
});

test('a full crossing and return wins, awards coins once, and persists the result', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.locator('#play-button').click(); await expect(page.locator('#game')).toHaveAttribute('data-phase', 'playing');
  async function walk(key: string, axis: string, target: number) {
    const start = Number(await page.locator('#game').getAttribute(`data-${axis}`));
    await page.keyboard.down(key);
    try {
      await expect.poll(async () => {
        if (await page.getByRole('dialog').isVisible()) return true;
        const current = Number(await page.locator('#game').getAttribute(`data-${axis}`));
        return target < start ? current <= target : current >= target;
      }, { timeout: 8000, intervals: [35] }).toBe(true);
    } finally { await page.keyboard.up(key); }
  }
  await page.keyboard.down('Shift'); await walk('a', 'x', 218); await walk('w', 'y', 91);
  await page.keyboard.up('Shift'); await walk('d', 'x', 738);
  await page.keyboard.down('Shift'); await walk('s', 'y', 525); await page.keyboard.up('Shift');
  await expect(page.getByRole('heading', { name: 'You made it home.' })).toBeVisible();
  await expect(page.locator('#wins')).toHaveText('1');
  const coins = await page.locator('#coins').textContent();
  expect(Number(coins)).toBeGreaterThanOrEqual(60);
  await page.screenshot({ path: 'artifacts/laro-round-result.png', fullPage: true });
  await page.getByRole('button', { name: 'One more round' }).click();
  await expect(page.locator('#coins')).toHaveText(coins!);
  await page.reload(); await expect(page.locator('#wins')).toHaveText('1');
  await expect(page.locator('#coins')).toHaveText(coins!);
});
