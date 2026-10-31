import { test as base } from '@playwright/test';
export * from '@playwright/test';

// Existing gameplay tests start directly; tutorial tests explicitly enable prompts.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      try {
        const key = 'laro.offline.profile.v1', raw = JSON.parse(localStorage.getItem(key) || '{}');
        if (raw && typeof raw === 'object' && raw.tutorialPrompts === undefined) { raw.tutorialPrompts = false; localStorage.setItem(key, JSON.stringify(raw)); }
      } catch { /* Tests that deliberately block/corrupt storage retain that behavior. */ }
    });
    await use(page);
  },
});
