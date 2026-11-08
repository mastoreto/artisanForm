import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=payments');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('radio', { name: 'Pro' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
});

test('embedded payment completes and is submitted', async ({ page }) => {
  await page.getByRole('button', { name: 'Pay with Card (embedded)' }).click();
  await page.getByRole('button', { name: 'Pay (mock)' }).click();
  await expect(page.getByText('Payment recorded')).toBeVisible();
  await expect(page.getByTestId('result')).toContainText('"provider": "card"');
});

test('hosted checkout: leaves the page and resumes at the payment step on return', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Pay with Checkout (redirect)' })
    .click();
  // The mock "provider" sends the user straight back with a result param.
  await expect(page.getByText('Payment recorded')).toBeVisible();
  await expect(page.getByTestId('result')).toContainText('"plan": "pro"');
  await expect(page.getByTestId('result')).toContainText(
    '"provider": "hosted"',
  );
  expect(page.url()).not.toContain('mock_payment');
});
