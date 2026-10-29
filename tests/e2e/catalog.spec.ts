import { test, expect } from '@playwright/test';
import { expectNoHorizontalScroll } from './helpers';

test.describe('catálogo: busca, filtros, ordenação, paginação e histórico', () => {
  test('filtros combináveis reiniciam a paginação e compõem a URL', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/resultado\(s\)/)).toBeVisible();

    await page.getByRole('button', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);

    await page.getByRole('button', { name: /arte digital/i }).click();
    await expect(page).toHaveURL(/categories=[^&]*art/);
    await expect(page).not.toHaveURL(/page=2/);

    await page.getByRole('button', { name: /ethereum/i }).click();
    await expect(page).toHaveURL(/chains=[^&]*ethereum/);
    await expect(page).toHaveURL(/categories=[^&]*art/);
  });

  test('ordenação pela URL e persistência após refresh', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sort').click();
    await page.getByRole('option', { name: 'Menor preço' }).click();
    await expect(page).toHaveURL(/sort=price_asc/);

    await page.reload();
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page.locator('#sort')).toContainText('Menor preço');
  });

  test('busca compõe a URL e sobrevive à navegação pelo histórico', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await page.getByPlaceholder(/buscar nfts/i).fill('monolith');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/q=monolith/);
    await expect(page.getByText(/para .monolith/i)).toBeVisible();

    await page.getByRole('button', { name: /fotografia/i }).click();
    await expect(page).toHaveURL(/categories=[^&]*photography/);
    await page.goBack();
    await expect(page).toHaveURL(/q=monolith/);
  });

  test('resultado vazio exibe estado apropriado', async ({ page }) => {
    await page.goto('/?q=zzzzznaoexiste');
    await expect(page.getByRole('heading', { name: /nenhum nft encontrado/i })).toBeVisible();
  });
});

test.describe('detalhe: acesso direto e recurso inexistente', () => {
  test('acesso direto a um NFT válido renderiza o detalhe', async ({ page }) => {
    await page.goto('/');
    const card = page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first();
    const href = (await card.getAttribute('href'))!;
    await page.goto(href);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Comprar', exact: true })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('NFT inexistente mostra mensagem de não encontrado', async ({ page }) => {
    await page.goto('/nfts/nao-existe-123');
    await expect(page.getByRole('heading', { name: /não encontrado/i })).toBeVisible();
  });
});
