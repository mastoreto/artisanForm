import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('a custom design system drives the wizard (inputs, stepper, controls)', async ({
  page,
}) => {
  await page.goto('/?demo=custom');
  await expect(
    page.getByLabel('Progress').getByText('Account'),
  ).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByText('Required field').first()).toBeVisible();
  await expect(page.getByLabel('Name')).toBeFocused();
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Email').fill('ana@example.com');
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByLabel('Plan').selectOption('pro');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('result')).toContainText('"plan": "pro"');
});

test('a JSON schema renders with local extensions and a custom step', async ({
  page,
}) => {
  await page.goto('/?demo=extensions');
  await page.getByLabel('Full name').fill('Zoe');
  await page.getByLabel('Email').fill('zoe@example.com');
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: 'I am human' }).click();
  await expect(page.getByTestId('result')).toContainText('"verified": true');
  await expect(page.getByTestId('result')).toContainText('"fullName": "Zoe"');
});

test('density and label position follow the schema ui settings', async ({
  page,
}) => {
  await page.goto('/?demo=layout');
  const root = page.locator('form');
  await expect(root).toHaveAttribute('data-density', 'comfortable');
  await page.getByLabel('Labels').selectOption('left');
  await expect(root).toHaveAttribute('data-label-position', 'left');
  await page.getByLabel('Density').selectOption('compact');
  await expect(root).toHaveAttribute('data-density', 'compact');
});

test('the same form is styled by tokens, Tailwind classes or plain CSS', async ({
  page,
}) => {
  await page.goto('/?demo=styles');
  const bg = (name: string) =>
    page
      .getByRole('button', { name })
      .evaluate((el) => getComputedStyle(el).backgroundColor);
  // tokens: --artisan-primary overridden from CSS
  expect(
    await page
      .locator('.af-button')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe('rgb(124, 58, 237)');
  await page.getByRole('button', { name: 'plain-css' }).click();
  await expect(page.locator('.af-input')).toHaveCount(0); // unstyled: no library classes
  await expect(page.locator('.plain-input').first()).toBeVisible();
  void bg;
});
