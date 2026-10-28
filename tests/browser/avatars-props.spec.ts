import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); }
async function walk(page: Page, x: number, y: number, reach = true) {
  await page.waitForTimeout(180);
  const canvas = page.locator('#game canvas'), box = (await canvas.boundingBox())!;
  const camera = { x: Number(await page.locator('#game').getAttribute('data-camera-x')), y: Number(await page.locator('#game').getAttribute('data-camera-y')) };
  await canvas.click({ position: { x: (x - camera.x) / 960 * box.width, y: (y - camera.y) / 600 * box.height } });
  if (reach) await expect.poll(async () => Math.hypot(Number(await page.locator('#game').getAttribute('data-x')) - x, Number(await page.locator('#game').getAttribute('data-y')) - y), { timeout: 7000 }).toBeLessThan(8);
  else await page.waitForTimeout(800);
}

test('boy and girl previews differ and the selected avatar persists in every game', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await ready(page); await page.locator('#avatar-button').click();
  const pictures = await page.locator('.avatar-choice canvas').evaluateAll(elements => elements.map(element => (element as HTMLCanvasElement).toDataURL())); expect(pictures[0]).not.toBe(pictures[1]);
  await page.locator('.avatar-choice[data-avatar-gender="girl"]').click(); await page.getByLabel('YOUR NICKNAME').fill('Maria'); await page.getByRole('button', { name: 'Guava shirt', exact: true }).click();
  await page.screenshot({ path: 'artifacts/laro-avatar-choices.png', fullPage: true }); await page.getByRole('button', { name: 'Save my avatar' }).click();
  await expect(page.locator('#game')).toHaveAttribute('data-avatar-gender', 'girl'); await page.reload(); await expect(page.locator('#player-name')).toHaveText('Maria');
  await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  for (const game of ['patintero', 'taguan', 'tinik']) {
    await page.locator(`[data-game="${game}"]`).click(); await page.locator('#play-button').click(); if (game === 'tinik') await page.locator('#tinik-practice').click();
    await expect(page.locator('#game')).toHaveAttribute('data-avatar-gender', 'girl');
    await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  }
  expect(errors).toEqual([]);
});

test('each Dama difficulty has a different named opponent and a different portrait', async ({ page }) => {
  await ready(page); const pictures = [];
  for (const [level, name] of [['easy', 'Mama Shoni'], ['normal', 'Audrey'], ['hard', 'MJ'], ['expert', 'Ferdie'], ['master', 'Tatay Efren']]) {
    await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('#dama-difficulty').selectOption(level); await expect(page.locator('#dama-bot')).toHaveText(`Play against ${name}`); await page.locator('#dama-bot').click();
    await expect(page.locator('#dama-portrait')).toHaveAttribute('aria-label', name); pictures.push(await page.locator('#dama-portrait').evaluate(element => (element as HTMLCanvasElement).toDataURL()));
    const heading = (await page.locator('.dama-heading').boundingBox())!, board = (await page.locator('.dama-board').boundingBox())!; expect(heading.y + heading.height).toBeLessThan(board.y);
    await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  }
  expect(new Set(pictures).size).toBe(5);
});

test('separate benches, vases, and fences block walking at the visible objects', async ({ page }) => {
  test.setTimeout(45000); await ready(page);
  await walk(page, 514, 440); await walk(page, 365, 440); await walk(page, 365, 480, false);
  const benchY = Number(await page.locator('#game').getAttribute('data-y')); expect(benchY).toBeGreaterThan(440); expect(benchY).toBeLessThan(454);
  await page.screenshot({ path: 'artifacts/laro-bench-obstacle.png', fullPage: true });
  await walk(page, 365, 430); await walk(page, 226, 430); await walk(page, 226, 330); await walk(page, 192, 330); await walk(page, 192, 300, false);
  expect(Number(await page.locator('#game').getAttribute('data-y'))).toBeGreaterThan(327);
  await walk(page, 226, 330); await walk(page, 226, 430); await walk(page, 880, 430); await walk(page, 880, 270); await walk(page, 830, 270); await walk(page, 780, 235); await walk(page, 780, 180, false);
  const fenceY = Number(await page.locator('#game').getAttribute('data-y')); expect(fenceY).toBeGreaterThan(214); expect(fenceY).toBeLessThan(225);
  await page.screenshot({ path: 'artifacts/laro-fence-obstacle.png', fullPage: true });
});
