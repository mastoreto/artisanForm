import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=wizard');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('blocks the first step until it is valid, then completes the wizard', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByText('Campo requerido').first()).toBeVisible();
  await expect(page.getByLabel('Nombre')).toBeFocused();

  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByRole('button', { name: 'Siguiente' }).click();

  await expect(page.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
  await page.getByRole('radio', { name: 'Pro' }).click();
  await page.getByRole('button', { name: 'Finalizar' }).click();

  const result = page.getByTestId('result');
  await expect(result).toContainText('"name": "Ana"');
  await expect(result).toContainText('"plan": "pro"');
});

test('resumes the draft after a reload', async ({ page }) => {
  await page.getByLabel('Nombre').fill('Zoe');
  await page.getByLabel('Email').fill('zoe@example.com');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Ubicación' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
  await page.getByRole('button', { name: 'Anterior' }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue('Zoe');
});

test('is operable with the keyboard', async ({ page }) => {
  await page.getByLabel('Nombre').focus();
  await page.keyboard.type('Leo');
  await page.keyboard.press('Tab');
  await page.keyboard.type('leo@example.com');
  await page.getByRole('button', { name: 'Siguiente' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ubicación' })).toBeVisible();
});
