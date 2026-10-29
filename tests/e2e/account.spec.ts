import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('edição de perfil persiste após refresh', async ({ page }) => {
  await login(page);
  await page.goto('/profile');

  const name = page.getByLabel(/nome/i).first();
  await expect(name).toHaveValue(/.+/); // espera o prefill carregar
  await name.fill('Camila Editada');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/profile') && r.request().method() === 'PATCH'),
    page.getByRole('button', { name: /salvar/i }).click(),
  ]);
  await expect(page.getByText(/perfil atualizado/i)).toBeVisible();

  await page.reload();
  await expect(page.getByLabel(/nome/i).first()).toHaveValue('Camila Editada');
});

test('troca de senha valida confirmação e senha atual', async ({ page }) => {
  await login(page);
  await page.goto('/profile');

  // confirmação divergente → erro de validação (cliente)
  await page.getByLabel(/senha atual/i).fill('Password123!');
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123');
  await page.getByLabel(/confirmar/i).fill('Diferente123');
  await page.getByRole('button', { name: /salvar/i }).click();
  await expect(page.getByText(/não coincidem/i)).toBeVisible();

  // senha atual incorreta → erro da API
  await page.getByLabel(/senha atual/i).fill('ErradaAtual1');
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaSenha123');
  await page.getByLabel(/confirmar/i).fill('NovaSenha123');
  await page.getByRole('button', { name: /salvar/i }).click();
  await expect(page.getByText(/senha atual incorreta/i)).toBeVisible();
});

test('cadastro de carteira valida endereço e adiciona', async ({ page }) => {
  await login(page);
  await page.goto('/wallets');

  await page.getByLabel(/apelido/i).fill('Minha carteira');
  await page.getByLabel(/endereço/i).fill('0x123');
  await page.getByRole('button', { name: /salvar carteira/i }).click();
  await expect(page.getByText(/endereço inválido|0x/i).first()).toBeVisible();

  await page.getByLabel(/endereço/i).fill('0x1111222233334444555566667777888899990000');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/wallets') && r.request().method() === 'POST'),
    page.getByRole('button', { name: /salvar carteira/i }).click(),
  ]);
  await expect(page.getByText('Minha carteira')).toBeVisible();
});
