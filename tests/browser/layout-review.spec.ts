import { test, expect, type Page } from './fixtures';
import { walkHubTo } from '../helpers/hub-walk';

async function ready(page: Page) { await page.goto('/'); await expect(page.locator('#game')).toHaveAttribute('data-ready', 'true'); }
test('tutorial illustrations are readable on a phone and in short landscape', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('laro.offline.profile.v1', JSON.stringify({ tutorialPrompts: true })); });
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page); await page.locator('[data-game="piko"]').click(); await page.locator('#play-button').click(); await page.locator('#street-start').click(); await page.locator('#tutorial-show').click();
  const portrait = (await page.locator('.tutorial-picture').boundingBox())!; expect(portrait.width).toBeGreaterThan(260); expect(portrait.height).toBeGreaterThan(125);
  await page.locator('#tutorial-next').click(); await page.screenshot({ path: 'artifacts/tutorial-readable-phone.png' });
  await page.setViewportSize({ width: 932, height: 330 }); const landscape = (await page.locator('.tutorial-picture').boundingBox())!; expect(landscape.width).toBeGreaterThan(190); expect(landscape.height).toBeGreaterThan(90);
  await page.locator('#tutorial-next').click(); await page.locator('#tutorial-next').click(); await expect(page.locator('#piko-stage')).toBeVisible();
});
test('mobile board and chalk court start at the top of the panel; both Piko feet actions are colored', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await ready(page);
  for (const id of ['chess', 'piko']) {
    await page.locator(`[data-game="${id === 'chess' ? 'dama' : id}"]`).click(); await page.locator('#play-button').click();
    if (id === 'chess') { await page.locator('[data-table-game="chess"]').click(); await page.locator('#chess-local').click(); }
    else await page.locator('#street-start').click();
    const shell = (await page.locator('#game-shell').boundingBox())!, stage = (await page.locator(`#${id}-stage`).boundingBox())!; expect(stage.y - shell.y).toBeLessThan(3);
    if (id === 'piko') {
      await page.locator('#piko-action').click(); await expect.poll(async () => Number(await page.locator('#piko-meter').getAttribute('aria-valuenow')), { intervals: [15] }).toBeGreaterThan(58); await page.locator('#piko-action').click(); await expect(page.locator('#piko-stage')).toHaveAttribute('data-phase', 'hop-ready'); await page.locator('#piko-action').click();
      const color = await page.locator('#piko-two').evaluate(el => getComputedStyle(el).backgroundColor); expect(color).toBe('rgb(133, 197, 208)');
      await page.screenshot({ path: 'artifacts/piko-two-feet-phone.png', fullPage: true });
    } else await page.screenshot({ path: 'artifacts/chess-no-empty-space-phone.png', fullPage: true });
    await page.locator('#nav-hub').click(); await page.locator('#confirm-home').click();
  }
});
test('school flagpole and sari-sari shop are reachable in the expanded village', async ({ page }) => {
  test.setTimeout(60000); await ready(page); await walkHubTo(page, { x: 230, y: 330 }); await page.keyboard.press('e'); await expect(page.locator('#modal-title')).toContainText('sari-sari store'); await expect(page.locator('[data-buy-snack="biscuit"]')).toBeVisible(); await page.locator('#food-close').click();
  await walkHubTo(page, { x: 1580, y: 470 }); await page.screenshot({ path: 'artifacts/paaralan-philippine-flag.png', fullPage: true });
});
