import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

async function addViaDetail(page: Page, slug: string, qty = 1) {
  await page.goto(`/nfts/${slug}`);
  for (let i = 1; i < qty; i++) await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
  await page.getByRole('button', { name: /^comprar( nft)?$/i }).click();
  await page.waitForURL(/\/cart/);
}

// Abre detalhes até achar um NFT com mais de uma edição (botão "Aumentar" ativo).
async function findMultiEditionSlug(page: Page): Promise<string> {
  await page.goto('/');
  const cards = page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') });
  await cards.first().waitFor();
  const hrefs = await cards.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''));
  for (const href of hrefs) {
    await page.goto(href);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const inc = page.getByRole('button', { name: 'Aumentar quantidade' });
    if ((await inc.count()) > 0 && (await inc.isEnabled())) return href.split('/nfts/')[1];
  }
  throw new Error('nenhum NFT com múltiplas edições encontrado');
}

async function firstSlug(page: Page): Promise<string> {
  await page.goto('/');
  const card = page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first();
  await card.waitFor();
  return ((await card.getAttribute('href')) ?? '').split('/nfts/')[1];
}

test('adicionar, alterar quantidade e remover itens', async ({ page }) => {
  const slug = await findMultiEditionSlug(page);
  await addViaDetail(page, slug, 2);
  const qtyGroup = page.getByRole('group', { name: 'Quantidade' }).first();
  await expect(qtyGroup).toContainText('2');

  await page.getByRole('button', { name: 'Aumentar quantidade' }).first().click();
  await expect(qtyGroup).toContainText('3');

  await page.getByRole('button', { name: /remover/i }).first().click();
  await expect(page.getByText(/seu carrinho está vazio/i)).toBeVisible();
});

test('cupom inválido mostra erro e cupom válido é aplicado', async ({ page }) => {
  await addViaDetail(page, await firstSlug(page));

  const coupon = page.getByPlaceholder(/código|cupom/i);
  await coupon.fill('NAOEXISTE');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByText(/inválid/i)).toBeVisible();

  await page.getByRole('button', { name: /remover cupom/i }).click();
  await coupon.fill('WELCOME10');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByRole('button', { name: /remover cupom/i })).toBeVisible();
  await expect(page.getByText(/aplicado/i)).toBeVisible();
});

test('carrinho persiste após refresh', async ({ page }) => {
  await addViaDetail(page, await firstSlug(page));
  await page.reload();
  await expect(page.getByRole('button', { name: /remover/i }).first()).toBeVisible();
});

test('carrinho do visitante é preservado ao autenticar', async ({ page }) => {
  await addViaDetail(page, await firstSlug(page)); // como visitante
  await login(page);
  await page.goto('/cart');
  await expect(page.getByRole('button', { name: /remover/i }).first()).toBeVisible();
});
