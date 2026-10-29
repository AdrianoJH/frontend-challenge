import { test, expect, type Page } from '@playwright/test';
import { buyFirstAvailable, login } from './helpers';

// Regressão visual das telas-chave (início, detalhe, carrinho, pagamento).
// Dados determinísticos (fixtures semeadas); o indicador de tempo real é
// mascarado por alternar entre conectado/desconectado.
function mask(page: Page) {
  return [page.getByTestId('realtime-status')];
}

test('início', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); // fixa o carrossel no 1º slide
  await page.goto('/');
  await expect(page.getByText(/resultado\(s\)/)).toBeVisible();
  await page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first().waitFor();
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, mask: mask(page) });
});

test('detalhe', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first();
  await card.click();
  await page.waitForURL(/\/nfts\//);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true, mask: mask(page) });
});

test('carrinho', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: /remover/i }).first()).toBeVisible();
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, mask: mask(page) });
});

test('pagamento', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);
  await page.goto('/checkout');
  await expect(page.getByRole('button', { name: /confirmar compra/i })).toBeVisible();
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true, mask: mask(page) });
});
