import { test, expect } from '@playwright/test';
import { buyFirstAvailable, confirmCheckout, expectNoHorizontalScroll, login } from './helpers';

// Fluxos principais no viewport mobile (Pixel 5, ~393px).

test('início renderiza e não tem overflow horizontal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /arte digital/i }).first()).toBeVisible();
  await expect(page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first()).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegação' })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('detalhe renderiza no mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first().click();
  await page.waitForURL(/\/nfts\//);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('compra completa no mobile', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);
  await expectNoHorizontalScroll(page);
  await confirmCheckout(page);
  await page.waitForURL(/\/order\//);
  await expect(page.getByText(/na sua carteira/i)).toBeVisible({ timeout: 15_000 });
  await expectNoHorizontalScroll(page);
});
