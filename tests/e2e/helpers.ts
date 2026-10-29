import { expect, type Page } from '@playwright/test';

export const DEMO = {
  collector: { email: 'collector@nftm.dev', password: 'Password123!', name: 'Camila Collector' },
  trader: { email: 'trader@nftm.dev', password: 'Password123!', name: 'Téo Trader' },
};

// O MSW vive no service worker do navegador, então qualquer controle de mock
// (reset/cenário/flags) precisa rodar dentro da página. Espera o SW responder
// em JSON antes de prosseguir — evita a corrida de ativação no primeiro load.
export async function waitForMocks(page: Page) {
  await page.waitForFunction(
    async () => {
      try {
        const r = await fetch('/api/__mock__/state');
        return (r.headers.get('content-type') ?? '').includes('application/json');
      } catch {
        return false;
      }
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function post(page: Page, url: string, body?: unknown) {
  // Repete até o MSW de fato tratar (resposta JSON). Evita a corrida de ativação
  // do Service Worker, em que a primeira tentativa cai no fallback SPA (HTML).
  return page.evaluate(
    async ([u, b]) => {
      for (let i = 0; i < 50; i++) {
        try {
          const r = await fetch(u as string, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: b ? JSON.stringify(b) : undefined,
          });
          if ((r.headers.get('content-type') ?? '').includes('application/json')) return r.json();
        } catch {
          /* retry */
        }
        await new Promise((res) => setTimeout(res, 100));
      }
      throw new Error(`controle de mock não respondeu JSON: ${u}`);
    },
    [url, body] as const,
  );
}

export async function resetMocks(page: Page) {
  await post(page, '/api/__mock__/reset');
}

export async function setScenario(page: Page, name: string) {
  await post(page, '/api/__mock__/scenario', { name });
}

export async function setFlags(page: Page, patch: Record<string, unknown>) {
  await post(page, '/api/__mock__/flags', patch);
}

export async function reprice(page: Page, nftId: string, patch: { price?: string; editionsAvailable?: number }) {
  await post(page, '/api/__mock__/reprice', { nftId, ...patch });
}

export async function emitEvent(page: Page, event: string, envelope: unknown) {
  await post(page, '/api/__mock__/emit', { event, envelope });
}

export async function apiGet<T = unknown>(page: Page, path: string): Promise<T> {
  // Repete até o MSW responder em JSON (contorna a corrida de ativação do SW).
  const handle = await page.waitForFunction(
    async (p) => {
      try {
        const r = await fetch(p);
        if (!(r.headers.get('content-type') ?? '').includes('application/json')) return false;
        return await r.json();
      } catch {
        return false;
      }
    },
    path,
    { timeout: 15_000 },
  );
  return handle.jsonValue() as Promise<T>;
}

/** Popula o carrinho direto pela API (determinístico), usando o token logado. */
export async function addToCart(page: Page, nftId: string, quantity: number) {
  await page.evaluate(
    async ([id, qty]) => {
      const token = localStorage.getItem('nftm.token');
      await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ nftId: id, quantity: qty, additive: true }),
      });
    },
    [nftId, quantity] as const,
  );
}

export async function waitAuthed(page: Page) {
  await expect(page.getByRole('button', { name: /menu da conta/i })).toBeVisible();
}

export async function waitRealtimeConnected(page: Page) {
  await expect(page.getByTestId('realtime-status')).toHaveAttribute('data-connected', 'true', { timeout: 10_000 });
}

export async function login(page: Page, who: { email: string; password: string } = DEMO.collector) {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(who.email);
  await page.getByLabel(/senha/i).first().fill(who.password);
  await page.locator('form').getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL((u) => !new URL(u).pathname.startsWith('/login'));
}

/** Pega o slug e o id do primeiro NFT da listagem, a partir do DOM da home. */
export async function firstNft(page: Page): Promise<{ slug: string; href: string }> {
  await page.goto('/');
  const card = page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first();
  await card.waitFor();
  const href = (await card.getAttribute('href')) ?? '';
  return { href, slug: href.split('/nfts/')[1] ?? '' };
}

/** Acha o primeiro NFT disponível (com botão Comprar) e o adiciona ao carrinho. */
export async function buyFirstAvailable(page: Page): Promise<void> {
  await page.goto('/');
  const cards = page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') });
  await cards.first().waitFor();
  const hrefs = await cards.evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') ?? ''));
  for (const href of hrefs) {
    await page.goto(href);
    await page.getByRole('heading', { level: 1 }).waitFor();
    const buy = page.getByRole('button', { name: /^comprar( nft)?$/i });
    if (await buy.count()) {
      await buy.click();
      await page.waitForURL(/\/cart/);
      return;
    }
  }
  throw new Error('nenhum NFT disponível para compra');
}

/** Conecta a carteira e confirma a compra no checkout. */
export async function confirmCheckout(page: Page): Promise<void> {
  await page.goto('/checkout');
  // o desktop tem o botão "Conectar carteira"; o mobile não (conexão não é pré-requisito)
  const connect = page.getByRole('button', { name: /conectar/i });
  if (await connect.count()) await connect.first().click();
  const confirm = page.getByRole('button', { name: /confirmar compra/i });
  await expect(confirm).toBeEnabled();
  await confirm.click();
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow, 'não deve haver overflow horizontal').toBeFalsy();
}
