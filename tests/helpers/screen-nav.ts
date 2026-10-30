import { expect, type Page } from '@playwright/test';
export async function screenNav(page: Page, id: string) {
  if (!await page.locator('#fullscreen-nav').isVisible()) { await page.locator('#play-menu').click(); await expect(page.locator('#fullscreen-nav')).toBeVisible(); }
  await page.locator(`[data-screen-nav="${id}"]`).click();
}
