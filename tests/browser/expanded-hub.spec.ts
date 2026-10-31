import { test, expect, type Page } from './fixtures';
import { tinikStage } from '../../client/src/games/arcade-rules';

async function walk(page: Page, key: string, axis: 'x' | 'y', target: number) {
  const start = Number(await page.locator('#game').getAttribute(`data-${axis}`));
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => Number(await page.locator('#game').getAttribute(`data-${axis}`)), { timeout: 10000, intervals: [35] })[target > start ? 'toBeGreaterThanOrEqual' : 'toBeLessThanOrEqual'](target);
  } finally { await page.keyboard.up(key); }
}

test('the expanded barangay has working table, schoolyard, and garden entrances', async ({ page }) => {
  test.setTimeout(65000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await walk(page, 's', 'y', 775); await walk(page, 'a', 'x', 450);
  await expect(page.locator('#game')).toHaveAttribute('data-nearby', 'dama');
  await page.screenshot({ path: 'artifacts/laro-expanded-dama-courtyard.png', fullPage: true });
  await page.keyboard.press('e'); await expect(page.getByRole('heading', { name: 'Tara, Dama tayo.' })).toBeVisible();
  await page.getByRole('button', { name: 'Two players · pass-and-play' }).click(); await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  await expect(page.locator('#game')).toHaveAttribute('data-mode', 'hub');
  expect(Number(await page.locator('#game').getAttribute('data-y'))).toBeGreaterThan(700);
  await walk(page, 's', 'y', 865); await walk(page, 'd', 'x', 1300); await walk(page, 'w', 'y', 480);
  await expect(page.locator('#game')).toHaveAttribute('data-nearby', 'tinik');
  expect(Number(await page.locator('#game').getAttribute('data-camera-x'))).toBeGreaterThan(500);
  await page.screenshot({ path: 'artifacts/laro-expanded-schoolyard.png', fullPage: true });
  await page.keyboard.press('e'); await expect(page.getByRole('heading', { name: 'Ready for a brave jump?' })).toBeVisible(); await page.locator('#close-modal').click();
  await walk(page, 's', 'y', 825); await expect(page.locator('#game')).toHaveAttribute('data-nearby', 'taguan');
  await page.screenshot({ path: 'artifacts/laro-expanded-garden.png', fullPage: true });
  await page.keyboard.press('e'); await expect(page.locator('#game')).toHaveAttribute('data-mode', 'taguan'); expect(errors).toEqual([]);
});

test('Hard difficulty persists and its changing jump stages work with keyboard input', async ({ page }) => {
  test.setTimeout(40000);
  await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  await page.locator('#quick-settings').click(); await page.locator('#difficulty').selectOption('hard'); await page.locator('#save-settings').click();
  await expect(page.locator('#quick-settings')).toContainText('Hard');
  await page.locator('[data-game="tinik"]').click(); await page.locator('#play-button').click(); await page.locator('#tinik-challenge').click();
  await expect(page.locator('#timer')).toHaveText('HARD');
  for (let level = 1; level <= 2; level++) {
    await expect(page.locator('#game')).toHaveAttribute('data-level', String(level)); await expect(page.locator('#game')).toHaveAttribute('data-jump-state', 'run');
    const stage = tinikStage(level, 'hard'), target = (stage.takeoffMin + stage.takeoffMax) / 2 - 4;
    await expect.poll(async () => Number(await page.locator('#game').getAttribute('data-x')), { intervals: [15] }).toBeGreaterThanOrEqual(target);
    await page.keyboard.press('Space'); await expect(page.locator('#game')).toHaveAttribute('data-cleared', String(level));
  }
  await page.reload(); await expect(page.locator('#quick-settings')).toContainText('Hard');
});
