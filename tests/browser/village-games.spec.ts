import { test, expect } from './fixtures';
import { findPhone } from '../helpers/hub-walk';
import { HUB_OBSTACLES } from '../../client/src/hub-obstacles';
import { overlaps } from '../../client/src/rules';

test.use({ hasTouch: true });
test('barangay dogs and cats roam around solid objects and freeze when paused', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  const game = page.locator('#game'); await expect(game).toHaveAttribute('data-animals', /dog/);
  const before = await game.getAttribute('data-animals'); await page.waitForTimeout(6500);
  const after = await game.getAttribute('data-animals'); expect(after).not.toBe(before);
  const animals = JSON.parse(after!) as { kind: string; x: number; y: number }[];
  expect(animals.filter(a => a.kind === 'dog')).toHaveLength(2); expect(animals.filter(a => a.kind === 'cat')).toHaveLength(2);
  for (const animal of animals) expect(HUB_OBSTACLES.some(r => overlaps(animal, r, 8))).toBe(false);
  await page.screenshot({ path: 'artifacts/barangay-animals-sign.png', fullPage: true });
  await page.locator('#pause-button').click(); const frozen = await game.getAttribute('data-animals'); await page.waitForTimeout(200); expect(await game.getAttribute('data-animals')).toBe(frozen);
});

test('Jolen shows difficulty-specific holes, hides hard guide rings and enlarges the score board', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  for (const difficulty of ['easy', 'normal', 'hard', 'expert', 'master']) {
    await page.locator('[data-game="jolen"]').click(); await page.locator('#play-button').click(); await page.locator('#jolen-difficulty').selectOption(difficulty); await page.locator('#jolen-start').click();
    await expect(page.locator('#jolen-stage')).toHaveAttribute('data-phase', 'aim');
    const hole = JSON.parse((await page.locator('#jolen-stage').getAttribute('data-hole'))!);
    if (difficulty === 'easy') { expect(hole).toBeNull(); await expect(page.locator('#jolen-bot')).toContainText('Pom'); }
    else { expect(hole).toBeTruthy(); if (difficulty === 'normal') expect(hole).toEqual({ x: 730, y: 280, radius: 15 }); }
    await expect(page.locator('#jolen-stage')).toHaveAttribute('data-aim-rings', String(['easy', 'normal'].includes(difficulty)));
    expect(await page.locator('#jolen-you').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
    if (difficulty === 'normal') await page.screenshot({ path: 'artifacts/jolen-hole-scoreboard.png', fullPage: true });
    await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  }
});

test('pocket phone keeps the LCD ratio and separates movement and Fire on desktop, tablet and phones', async ({ page }) => {
  test.setTimeout(80000); await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Layout fallback')); });
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await findPhone(page); await page.locator('#phone-impact').click(); await page.locator('#fullscreen-button').click();
  for (const [width, height] of [[1920, 1080], [1024, 768], [932, 430], [844, 390], [932, 330], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(async () => (await page.locator('#game-display').boundingBox())!.height).toBe(height);
    const stage = (await page.locator('#game-shell').boundingBox())!;
    const canvas = (await page.locator('#retro-canvas').boundingBox())!, pad = (await page.locator('.retro-dpad').boundingBox())!, fire = (await page.locator('#retro-fire').boundingBox())!;
    expect(canvas.width / canvas.height).toBeCloseTo(168 / 96, 1); expect(canvas.width).toBeGreaterThan(200);
    await expect(page.locator('.retro-softkeys')).toBeHidden(); await expect(page.locator('.retro-brand')).toBeHidden(); await expect(page.locator('#pocket-phone')).toBeHidden();
    expect(await page.locator('.retro-phone').evaluate(el => getComputedStyle(el).display)).toBe('contents');
    for (const selector of ['#retro-canvas', '.retro-dpad', '#retro-fire', '#retro-status']) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(stage.x - 1); expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
      expect(box.y).toBeGreaterThanOrEqual(stage.y - 1); expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
    }
    expect(pad.x + pad.width).toBeLessThan(fire.x);
    if (width > height) { expect(pad.x + pad.width).toBeLessThan(canvas.x); expect(fire.x).toBeGreaterThan(canvas.x + canvas.width); }
    await page.screenshot({ path: `artifacts/pocket-phone-${width}x${height}.png` });
  }
});
