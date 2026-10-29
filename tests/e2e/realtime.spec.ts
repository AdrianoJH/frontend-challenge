import { test, expect, type Page } from '@playwright/test';
import { buyFirstAvailable, confirmCheckout, login, reprice, emitEvent, waitRealtimeConnected } from './helpers';

async function authedJson(page: Page, path: string) {
  return page.evaluate(async (p) => {
    const token = localStorage.getItem('nftm.token');
    const r = await fetch(p, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return r.json();
  }, path);
}

test('alteração de preço via Socket.IO durante o checkout exige nova confirmação', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);

  const cart = await authedJson(page, '/api/cart');
  const nftId = cart.items[0].nftId as string;

  await page.goto('/checkout');
  await waitRealtimeConnected(page);
  await page.getByRole('button', { name: /conectar/i }).first().click();
  await expect(page.getByRole('button', { name: /confirmar compra/i })).toBeEnabled();

  await reprice(page, nftId, { price: '99.999' });

  await expect(page.getByText(/os valores mudaram/i)).toBeVisible();
  await expect(page.getByText(/99\.999/).first()).toBeVisible();
});

test('evento antigo/duplicado não regride um estado mais recente', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first();
  const href = (await card.getAttribute('href'))!;
  await page.goto(href);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await waitRealtimeConnected(page);

  const slug = href.split('/nfts/')[1];
  const nft = await authedJson(page, `/api/nfts/${slug}`);
  const base = nft.version as number;

  await emitEvent(page, 'nft.updated', {
    eventId: `nft.${nft.id}.v${base + 10}`,
    resource: { type: 'nft', id: nft.id },
    version: base + 10,
    emittedAt: new Date().toISOString(),
    data: { id: nft.id, price: '42.4242', editionsAvailable: nft.editionsAvailable, version: base + 10 },
  });
  await expect(page.getByText(/42\.4242/).first()).toBeVisible();

  // evento antigo (versão menor) deve ser ignorado
  await emitEvent(page, 'nft.updated', {
    eventId: `nft.${nft.id}.v${base + 1}`,
    resource: { type: 'nft', id: nft.id },
    version: base + 1,
    emittedAt: new Date().toISOString(),
    data: { id: nft.id, price: '1.0001', editionsAvailable: nft.editionsAvailable, version: base + 1 },
  });
  await page.waitForTimeout(500);
  await expect(page.getByText(/42\.4242/).first()).toBeVisible();
  await expect(page.getByText(/1\.0001/)).toHaveCount(0);
});

test('pedido pendente é recuperado após refresh sem criar outra compra', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);
  await confirmCheckout(page);
  await page.waitForURL(/\/order\//);

  // recarrega enquanto pode estar pendente — deve reconciliar, não duplicar
  await page.reload();
  await expect(page.getByText(/na sua carteira/i)).toBeVisible({ timeout: 15_000 });

  const orders = await authedJson(page, '/api/orders');
  expect(orders.items.length).toBe(1);
});
