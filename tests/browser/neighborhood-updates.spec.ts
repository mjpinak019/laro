import { test, expect, type Page } from './fixtures';
import { findPhone, walkHubTo } from '../helpers/hub-walk';
import { FOOD_CORNER } from '../../client/src/hub';

async function ready(page: Page) { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); }
async function home(page: Page) { await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click(); }
async function street(page: Page, id: string, difficulty = 'easy') { await page.locator(`[data-game="${id}"]`).click(); await page.locator('#play-button').click(); await page.locator('#street-difficulty').selectOption(difficulty); await page.locator('#street-start').click(); }

test('mobile chess uses ivory/dark SVG pawns and no visible tile names', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page); await page.locator('[data-game="dama"]').click(); await page.locator('#play-button').click(); await page.locator('[data-table-game="chess"]').click(); await page.locator('#chess-local').click();
  await expect(page.locator('[data-chess-square="e2"] svg')).toHaveAttribute('fill', '#fff5db'); await expect(page.locator('[data-chess-square="e7"] svg')).toHaveAttribute('fill', '#17372f');
  await expect(page.locator('.chess-square small')).toHaveCount(0); await expect(page.locator('.chess-piece')).toHaveCount(32); await expect(page.locator('.chess-square')).toHaveCount(64);
  await page.screenshot({ path: 'artifacts/chess-svg-mobile.png', fullPage: true });
});
test('all eleven games offer optional tutorials, including the two hidden phone games', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => { localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ tutorialPrompts: true })); }); await ready(page);
  for (const id of ['patintero', 'dama', 'chess', 'taguan', 'tinik', 'jolen', 'lubid', 'piko', 'tumbang']) {
    await page.locator(`[data-game="${id === 'chess' ? 'dama' : id}"]`).click(); await page.locator('#play-button').click();
    if (id === 'dama') await page.locator('#dama-local').click();
    if (id === 'chess') { await page.locator('[data-table-game="chess"]').click(); await page.locator('#chess-local').click(); }
    if (id === 'tinik') await page.locator('#tinik-practice').click();
    if (id === 'jolen') await page.locator('#jolen-start').click();
    if (id === 'lubid') await page.locator('#lubid-start').click();
    if (id === 'piko' || id === 'tumbang') await page.locator('#street-start').click();
    await expect(page.locator('#tutorial-show')).toBeVisible(); await expect(page.locator('.tutorial-picture')).toBeVisible(); await page.locator('#tutorial-play').click(); await home(page);
  }
  for (const id of ['snake', 'impact']) {
    await findPhone(page); await page.locator(`#phone-${id}`).click(); await expect(page.locator('#tutorial-show')).toBeVisible(); await page.locator('#tutorial-play').click(); await home(page);
  }
});
test('illustrated Piko steps can be skipped or replayed and the global tutorial preference persists', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('tutorial-seeded')) { localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ tutorialPrompts: true })); localStorage.setItem('tutorial-seeded', 'true'); } });
  await ready(page); await street(page, 'piko'); await page.locator('#tutorial-disable').check(); await page.locator('#tutorial-show').click();
  await expect(page.locator('.tutorial-step-count')).toHaveText('Step 1 of 3'); await page.locator('#tutorial-next').click(); await expect(page.locator('#modal-title')).toContainText('Two squares');
  await page.screenshot({ path: 'artifacts/piko-illustrated-tutorial.png', fullPage: true }); await page.locator('#tutorial-next').click(); await page.locator('#tutorial-next').click();
  await expect(page.locator('#piko-stage')).toBeVisible(); await page.locator('#piko-action').click(); await page.locator('#piko-action').click(); await expect(page.locator('#piko-stage')).toHaveAttribute('data-phase', 'feedback');
  await page.locator('#guide-button').click(); await page.locator('#replay-tutorial').click(); await expect(page.locator('.tutorial-step-count')).toHaveText('Step 1 of 3'); await page.locator('#close-modal').click();
  await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); await page.locator('#settings-button').click(); await expect(page.locator('#tutorial-prompts')).not.toBeChecked(); await page.locator('#tutorial-prompts').check(); await page.locator('#save-settings').click();
  await page.locator('[data-game="patintero"]').click(); await page.locator('#play-button').click(); await expect(page.locator('#tutorial-show')).toBeVisible();
});
test('avatar identity selectors stay visually stable with one main changing outfit preview', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ tutorialPrompts: false, coins: 1000 })); }); await ready(page); await page.locator('#avatar-button').click();
  const choices = await page.locator('.avatar-genders').innerHTML(); await expect(page.locator('.avatar-choice canvas')).toHaveCount(0); await expect(page.locator('.swatch canvas')).toHaveCount(0);
  const before = await page.locator('#wardrobe-preview').evaluate(el => (el as HTMLCanvasElement).toDataURL());
  await page.locator('[data-shop-category="skin"]').click(); await page.locator('[data-equip-item="skin-deep"]').click(); await page.locator('[data-shop-category="costume"]').click(); await page.locator('[data-equip-item="costume-ranger"]').click();
  expect(await page.locator('.avatar-genders').innerHTML()).toBe(choices); expect(await page.locator('#wardrobe-preview').evaluate(el => (el as HTMLCanvasElement).toDataURL())).not.toBe(before); await expect(page.locator('.shop-mannequin canvas')).toHaveCount(1);
  await page.screenshot({ path: 'artifacts/avatar-single-preview.png', fullPage: true });
});
test('volume sliders persist and barangay music respects mute, modal pause, and game transitions', async ({ page }) => {
  await ready(page); await page.locator('#game canvas').click(); await expect(page.locator('#game-display')).toHaveAttribute('data-music', 'playing');
  await page.locator('#settings-button').click(); await expect(page.locator('#game-display')).toHaveAttribute('data-music', 'silent');
  for (const [id, value] of [['sound-volume', '40'], ['music-volume', '25']]) await page.locator('#' + id).evaluate((el, value) => { (el as HTMLInputElement).value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  await page.locator('#save-settings').click(); await expect(page.locator('#game-display')).toHaveAttribute('data-music', 'playing');
  await page.locator('#sound-button').click(); await expect(page.locator('#game-display')).toHaveAttribute('data-music', 'silent'); await page.locator('#sound-button').click(); await expect(page.locator('#game-display')).toHaveAttribute('data-music', 'playing');
  await street(page, 'piko'); await expect(page.locator('#game-display')).toHaveAttribute('data-music', 'silent'); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!)); expect(saved.volume).toBe(.4); expect(saved.musicVolume).toBe(.25);
});
test('Tumbang guides use exact fractions, manual movement works, and dropping the slipper stops the guard', async ({ page }) => {
  test.setTimeout(60000); await ready(page);
  for (const [level, scale] of [['normal', '0.5'], ['hard', '0.125']]) { await street(page, 'tumbang', level); await expect(page.locator('#tumbang-stage')).toHaveAttribute('data-guide-scale', scale); await home(page); }
  await street(page, 'tumbang'); const stage = page.locator('#tumbang-stage'); await page.locator('#tumbang-action').click(); await expect.poll(async () => Number(await page.locator('#tumbang-meter').getAttribute('aria-valuenow')), { intervals: [10] }).toBeGreaterThan(55); await page.locator('#tumbang-action').click();
  await page.locator('#tumbang-walk').click(); await expect.poll(async () => { const p = JSON.parse((await stage.getAttribute('data-player'))!), s = JSON.parse((await stage.getAttribute('data-slipper'))!); return Math.hypot(p.x - s.x, p.y - s.y); }, { intervals: [25] }).toBeLessThan(24);
  const guard = await stage.getAttribute('data-guard'); await page.locator('#tumbang-action').click(); await expect(stage).toHaveAttribute('data-carrying', 'true'); await expect.poll(() => stage.getAttribute('data-guard')).not.toBe(guard);
  await page.locator('#tumbang-action').click(); await expect(stage).toHaveAttribute('data-carrying', 'false'); const frozen = await stage.getAttribute('data-guard');
  const before = JSON.parse((await stage.getAttribute('data-player'))!); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(220); await page.keyboard.up('ArrowRight');
  expect(JSON.parse((await stage.getAttribute('data-player'))!).x).toBeGreaterThan(before.x + 20); expect(await stage.getAttribute('data-guard')).toBe(frozen);
  await page.screenshot({ path: 'artifacts/tumbang-manual-retrieval.png', fullPage: true });
});
test('food corner is reachable, snack buys save offline, and no energy or level requirement is added', async ({ page, context }) => {
  test.setTimeout(80000); await page.addInitScript(() => { if (!localStorage.getItem('snacks-seeded')) { localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ tutorialPrompts: false, coins: 20 })); localStorage.setItem('snacks-seeded', 'true'); } }); await ready(page);
  await walkHubTo(page, FOOD_CORNER); await page.screenshot({ path: 'artifacts/merienda-jeepney-houses.png', fullPage: true }); await page.keyboard.press('e'); await expect(page.locator('#modal-title')).toHaveText('Street food corner'); await page.locator('[data-buy-snack="fishball"]').click(); await expect(page.locator('#food-coins')).toHaveText('17 coins'); await expect(page.locator('#food-status')).toContainText('Fishball');
  await page.locator('#food-close').click(); await page.evaluate(async () => { await navigator.serviceWorker.ready; }); await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true); await context.setOffline(true); await page.reload(); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('laro.offline.profile.v1')!)); expect(saved.coins).toBe(17); expect(saved.snacksEaten).toBe(1); expect(saved.energy).toBeUndefined(); expect(saved.level).toBeUndefined(); await context.setOffline(false);
});
