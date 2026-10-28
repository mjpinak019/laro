import { test, expect } from '@playwright/test';

test('Tagu-taguan completes a real search and saves exactly one finished result', async ({ page }) => {
  test.setTimeout(115000);
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Choose Tagu-taguan', exact: true }).click(); await page.locator('#play-button').click();
  await page.locator('#activity-action').click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 100000 });
  await expect(page.locator('#modal-title')).toHaveText('Huli ka!');
  const coins = await page.locator('#coins').textContent(); expect(Number(coins)).toBe(10);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!));
  expect(profile.records.taguan.played).toBe(1); expect(profile.records.taguan.best).toBeGreaterThan(0);
  await page.screenshot({ path: 'artifacts/laro-taguan-result.png', fullPage: true });
  await page.getByRole('button', { name: 'Back to the barangay' }).click();
  await page.reload(); await expect(page.locator('#coins')).toHaveText(coins!);
});

test('Luksong-tinik challenge ends after three misses with one participation reward', async ({ page }) => {
  test.setTimeout(35000);
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Choose Luksong-tinik', exact: true }).click(); await page.locator('#play-button').click();
  await page.getByRole('button', { name: 'Challenge · three chances' }).click();
  await expect(page.getByRole('heading', { name: 'One more brave jump?' })).toBeVisible({ timeout: 25000 });
  await expect(page.locator('#coins')).toHaveText('10');
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!));
  expect(profile.records.tinik.played).toBe(1); expect(profile.records.tinik.best).toBe(0);
});

test('arrow keys move the avatar and Games navigation opens a usable game menu', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('#game')).toHaveAttribute('data-mode', 'hub');
  const y = Number(await page.locator('#game').getAttribute('data-y'));
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(320); await page.keyboard.up('ArrowUp');
  await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-y'))).toBeLessThan(y - 25);
  await page.getByRole('button', { name: 'Games', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'An afternoon of play.' })).toBeVisible();
  await page.locator('[data-menu-game="dama"]').click(); await page.getByRole('button', { name: 'Play against Aling Nena' }).click();
  await expect(page.locator('#dama-stage')).toBeVisible();
});
