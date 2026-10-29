import { test, expect } from '@playwright/test';
import { login, setScenario, waitAuthed, waitForMocks } from './helpers';

test('link de pular para o conteúdo é focável e fica visível ao focar', async ({ page }) => {
  await page.goto('/');
  const skip = page.getByRole('link', { name: /pular para o conteúdo/i });
  await skip.focus();
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible(); // sai do sr-only ao receber foco
});

test('validação de formulário com campos obrigatórios e aria-invalid', async ({ page }) => {
  await page.goto('/login');
  await page.locator('form').getByRole('button', { name: /entrar/i }).click();
  await expect(page.getByText(/informe seu e-mail/i)).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute('aria-invalid', 'true');
});

test('menu da conta gerencia foco pelo teclado (abre e Escape retorna)', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await waitAuthed(page);

  const trigger = page.getByRole('button', { name: /menu da conta/i });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: /perfil/i })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('skeletons aparecem durante carregamento lento', async ({ page }) => {
  await page.goto('/');
  await waitForMocks(page);
  await setScenario(page, 'slow');
  await page.goto('/');
  await expect(page.locator('.skeleton').first()).toBeVisible();
  await expect(page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first()).toBeVisible({ timeout: 15_000 });
});

test('feedback de falha e recuperação após nova tentativa', async ({ page }) => {
  await page.goto('/');
  await waitForMocks(page);
  await setScenario(page, 'offline');
  await page.goto('/');
  await expect(page.getByText(/não foi possível carregar/i)).toBeVisible();

  await setScenario(page, 'default');
  await page.getByRole('button', { name: /tentar novamente/i }).click();
  await expect(page.getByRole('link').filter({ has: page.locator('img[alt^="Arte do NFT"]') }).first()).toBeVisible({ timeout: 15_000 });
});
