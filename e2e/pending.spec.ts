import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=pending');
});

test('waits for the service, advances on success and keeps the result', async ({
  page,
}) => {
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(
    page.getByRole('heading', { name: 'Confirmando' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText(
    'Consultando al servicio',
  );
  await expect(page.getByText('Operación confirmada')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId('result')).toContainText(
    '"orderId": "ORD-1234"',
  );
});

test('a failure offers retry and going back', async ({ page }) => {
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Simular fallo').check();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(
    page.getByText('El servicio rechazó la operación'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Volver al formulario' }).click();
  await expect(page.getByRole('heading', { name: 'Solicitud' })).toBeVisible();
});
