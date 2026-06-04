import { test, expect } from '@playwright/test';

test.describe('Mobiwave landing exploration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Hero CTA navigates to auth', async ({ page }) => {
    const cta = page.getByRole('link', { name: /Start building|Start free|Start your free trial/i });
    await expect(cta).toBeVisible();
    await Promise.all([page.waitForNavigation(), cta.click()]);
    await expect(page).toHaveURL(/\/auth/);
  });

  test('Demo chat widget opens and accepts messages', async ({ page }) => {
    const openBtn = page.getByRole('button', { name: 'Open demo chat' });
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    const chatInput = page.getByLabel('Type a message');
    await expect(chatInput).toBeVisible();

    await chatInput.fill('Hello demo');
    await page.getByRole('button', { name: /send|Send/i }).click();
    // Wait for assistant reply to appear in aria-live region
    await page.waitForSelector('[aria-live="polite"] >> text=Hello', { timeout: 5000 }).catch(() => {});

    const remaining = page.locator('text=/\d+ messages remaining|messages remaining/i');
    await expect(remaining).toBeVisible();
  });

  test('Developer embed snippet present', async ({ page }) => {
    await page.getByText('For developers').scrollIntoViewIfNeeded();
    const pre = page.locator('pre').filter({ hasText: 'Add to your website' });
    await expect(pre).toBeVisible();
    await expect(pre).toContainText('<script');
    await expect(pre).toContainText('mobiwave.ai/widget.js');
  });

  test('Mobile menu toggles aria-expanded', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    const toggle = page.locator('button[aria-label="Toggle menu"]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
