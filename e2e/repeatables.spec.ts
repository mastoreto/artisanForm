import { expect, test } from '@playwright/test';

test('repeatable rows: add, validate each row, remove and submit', async ({
  page,
}) => {
  await page.goto('/?demo=repeatables');
  await page.getByRole('button', { name: 'Agregar otro' }).click();
  await page.getByRole('button', { name: 'Agregar otro' }).click();
  await page.getByRole('button', { name: 'Agregar otro' }).click();
  await expect(
    page.getByRole('button', { name: 'Agregar otro' }),
  ).toBeDisabled();

  await page.getByRole('button', { name: 'Finalizar' }).click();
  await expect(page.getByText('Campo requerido').first()).toBeVisible();

  await page.getByLabel('Quitar elemento 3').click();
  await page.getByLabel('Quitar elemento 2').click();
  await page.getByLabel('Nombre').fill('Ana');
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByRole('button', { name: 'Finalizar' }).click();
  await expect(page.getByText('Equipo guardado')).toBeVisible();
  await expect(page.getByTestId('result')).toContainText('"name": "Ana"');
});

test('a declined payment shows the error with retry and back', async ({
  page,
}) => {
  await page.goto('/?demo=payments');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('radio', { name: 'Pro' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page
    .getByRole('button', { name: 'Pagar con Tarjeta rechazada' })
    .click();
  await page.getByRole('button', { name: 'Pagar (mock)' }).click();
  await expect(page.getByText('Pago rechazado (mock)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Volver al formulario' }),
  ).toBeVisible();
});
