import { expect, test } from '@playwright/test';

test('repeatable rows: add, validate each row, remove and submit', async ({
  page,
}) => {
  await page.goto('/?demo=repeatables');
  await page.getByRole('button', { name: 'Add another' }).click();
  await page.getByRole('button', { name: 'Add another' }).click();
  await page.getByRole('button', { name: 'Add another' }).click();
  await expect(
    page.getByRole('button', { name: 'Add another' }),
  ).toBeDisabled();

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Required field').first()).toBeVisible();

  await page.getByLabel('Remove item 3').click();
  await page.getByLabel('Remove item 2').click();
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Team saved')).toBeVisible();
  await expect(page.getByTestId('result')).toContainText('"name": "Ana"');
});

test('a declined payment shows the error with retry and back', async ({
  page,
}) => {
  await page.goto('/?demo=payments');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('radio', { name: 'Pro' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Pay with Card declined' }).click();
  await page.getByRole('button', { name: 'Pay (mock)' }).click();
  await expect(page.getByText('Payment rejected (mock)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Back to the form' }),
  ).toBeVisible();
});
