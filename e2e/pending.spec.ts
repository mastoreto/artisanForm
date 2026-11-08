import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=pending');
});

test('waits for the service, advances on success and keeps the result', async ({
  page,
}) => {
  await page.getByLabel('Name').fill('Ana');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Confirming' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Querying the service');
  await expect(page.getByText('Operation confirmed')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId('result')).toContainText(
    '"orderId": "ORD-1234"',
  );
});

test('a failure offers retry and going back', async ({ page }) => {
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Simulate failure').check();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(
    page.getByText('The service rejected the operation'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to the form' }).click();
  await expect(page.getByRole('heading', { name: 'Request' })).toBeVisible();
});
