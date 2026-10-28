import { test, expect, type Page } from '@playwright/test';

async function walk(page: Page, x: number, y: number) {
  const canvas = page.locator('#game canvas'), box = (await canvas.boundingBox())!;
  await page.waitForTimeout(180);
  const camera = await page.locator('#game').evaluate(element => ({ x: Number((element as HTMLElement).dataset.cameraX || 0), y: Number((element as HTMLElement).dataset.cameraY || 0) }));
  await canvas.click({ position: { x: (x - camera.x) / 960 * box.width, y: (y - camera.y) / 600 * box.height } });
  await expect.poll(async () => {
    const at = await page.locator('#game').evaluate(element => ({ x: Number((element as HTMLElement).dataset.x), y: Number((element as HTMLElement).dataset.y) }));
    return Math.hypot(at.x - x, at.y - y);
  }, { timeout: 7000, intervals: [50] }).toBeLessThan(8);
}

test('characters can walk behind and in front of foliage but cannot enter the trunk', async ({ page }) => {
  test.setTimeout(40000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.screenshot({ path: 'artifacts/laro-outlined-hub.png', fullPage: true });
  await walk(page, 880, 422); await walk(page, 880, 190); await walk(page, 914, 190);
  await page.locator('#game canvas').screenshot({ path: 'artifacts/laro-tree-behind.png' });
  await walk(page, 880, 190); await walk(page, 880, 270); await walk(page, 914, 270);
  await page.locator('#game canvas').screenshot({ path: 'artifacts/laro-tree-front.png' });
  const box = (await page.locator('#game canvas').boundingBox())!;
  await page.waitForTimeout(180);
  const camera = await page.locator('#game').evaluate(element => ({ x: Number((element as HTMLElement).dataset.cameraX || 0), y: Number((element as HTMLElement).dataset.cameraY || 0) }));
  await page.locator('#game canvas').click({ position: { x: (914 - camera.x) / 960 * box.width, y: (224 - camera.y) / 600 * box.height } });
  await page.waitForTimeout(850);
  const y = Number(await page.locator('#game').getAttribute('data-y'));
  expect(y).toBeGreaterThan(237); expect(y).toBeLessThan(246);
  expect(errors).toEqual([]);
});
