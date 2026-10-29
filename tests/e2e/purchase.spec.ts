import { test, expect } from '@playwright/test';
import { buyFirstAvailable, confirmCheckout, login, setFlags, waitForMocks } from './helpers';

test('compra completa do catálogo ao recibo confirmado', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);
  await confirmCheckout(page);

  await page.waitForURL(/\/order\//);
  await expect(page.getByText(/na sua carteira/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/transação confirmada/i)).toBeVisible();

  await page.goto('/cart');
  await expect(page.getByText(/seu carrinho está vazio/i)).toBeVisible();
});

test('pagamento recusado preserva o carrinho', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);
  await page.goto('/');
  await waitForMocks(page);
  await setFlags(page, { orderOutcome: 'rejected' });

  await confirmCheckout(page);
  await page.waitForURL(/\/order\//);
  await expect(page.getByRole('heading', { name: /recusado/i })).toBeVisible({ timeout: 15_000 });

  await page.goto('/cart');
  await expect(page.getByRole('button', { name: /remover/i }).first()).toBeVisible();
});

test('clique repetido não duplica o pedido', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);

  await page.goto('/checkout');
  await page.getByRole('button', { name: /conectar/i }).first().click();

  const confirm = page.getByRole('button', { name: /confirmar compra/i });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  // segundo clique: o botão já deve estar desabilitado (evita reenvio)
  await expect(confirm).toBeDisabled();

  await page.waitForURL(/\/order\//);
  const orders = await page.evaluate(async () => {
    const token = localStorage.getItem('nftm.token');
    const r = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
    return r.json();
  });
  expect(orders.items.length).toBe(1);
});

test('timeout após criar o pedido é recuperado por idempotência', async ({ page }) => {
  await login(page);
  await buyFirstAvailable(page);
  await page.goto('/');
  await waitForMocks(page);
  await setFlags(page, { orderOutcome: 'timeout' });

  await confirmCheckout(page);
  // mesmo com timeout na primeira tentativa, a recuperação leva ao mesmo pedido
  await page.waitForURL(/\/order\//, { timeout: 20_000 });
  await expect(page.getByText(/na sua carteira/i)).toBeVisible({ timeout: 20_000 });

  const orders = await page.evaluate(async () => {
    const token = localStorage.getItem('nftm.token');
    const r = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
    return r.json();
  });
  expect(orders.items.length).toBe(1);
});
