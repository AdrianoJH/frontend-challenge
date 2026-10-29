import { test, expect } from '@playwright/test';
import { login, setScenario, waitAuthed } from './helpers';

test('favorito otimista persiste após refresh', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await waitAuthed(page);

  const add = page.getByRole('button', { name: /adicionar .* aos favoritos/i }).first();
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/favorites/') && r.request().method() === 'PUT'),
    add.click(),
  ]);
  await expect(page.getByRole('button', { name: /remover .* dos favoritos/i }).first()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /remover .* dos favoritos/i }).first()).toBeVisible();
});

test('falha na mutation faz rollback e recupera depois', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await waitAuthed(page);

  await setScenario(page, 'offline');
  await page.getByRole('button', { name: /adicionar .* aos favoritos/i }).first().click();
  await expect(page.getByText(/falha ao atualizar favorito/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /adicionar .* aos favoritos/i }).first()).toBeVisible();

  await setScenario(page, 'default');
  await page.getByRole('button', { name: /adicionar .* aos favoritos/i }).first().click();
  await expect(page.getByRole('button', { name: /remover .* dos favoritos/i }).first()).toBeVisible();
});
