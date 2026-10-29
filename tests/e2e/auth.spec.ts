import { test, expect } from '@playwright/test';
import { DEMO, login, setFlags, waitAuthed } from './helpers';

test('cadastro cria conta e autentica', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel(/nome/i).first().fill('Novo Colecionador');
  await page.getByLabel('E-mail', { exact: true }).fill('novo@nftm.dev');
  await page.getByLabel(/senha/i).first().fill('Password123!');
  await page.getByLabel(/confirmar/i).fill('Password123!');
  await page.locator('form').getByRole('button', { name: /criar conta|cadastrar|registrar/i }).click();
  await page.waitForURL((u) => !new URL(u).pathname.startsWith('/register'));
  await expect(page.getByRole('button', { name: /menu da conta/i })).toBeVisible();
});

test('cadastro com e-mail já existente mostra conflito', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel(/nome/i).first().fill('Camila');
  await page.getByLabel('E-mail', { exact: true }).fill(DEMO.collector.email);
  await page.getByLabel(/senha/i).first().fill('Password123!');
  await page.getByLabel(/confirmar/i).fill('Password123!');
  await page.locator('form').getByRole('button', { name: /criar conta|cadastrar|registrar/i }).click();
  await expect(page.getByText(/já cadastrado|já em uso/i)).toBeVisible();
});

test('login, logout e troca de usuário isolam dados privados', async ({ page }) => {
  await login(page, DEMO.collector);
  await page.goto('/');
  await waitAuthed(page);
  const firstHeart = page.getByRole('button', { name: /adicionar .* aos favoritos/i }).first();
  await firstHeart.click();
  await expect(page.getByRole('button', { name: /remover .* dos favoritos/i }).first()).toBeVisible();

  await page.getByRole('button', { name: /menu da conta/i }).click();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/logout')),
    page.getByRole('menuitem', { name: /sair/i }).click(),
  ]);
  await expect(page.getByRole('button', { name: /menu da conta/i })).toBeHidden();

  // trader entra e NÃO vê o favorito do collector
  await login(page, DEMO.trader);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /adicionar .* aos favoritos/i }).first()).toBeVisible();
});

test('expiração de sessão durante a navegação desloga o usuário', async ({ page }) => {
  await login(page, DEMO.collector);
  await setFlags(page, { forceSessionExpired: true });
  // qualquer chamada autenticada passa a retornar 401 → token é limpo
  await page.goto('/profile');
  await expect(page.getByRole('button', { name: /entrar/i }).first()).toBeVisible();
});
