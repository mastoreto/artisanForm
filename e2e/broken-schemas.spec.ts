import { expect, test } from '@playwright/test';

// A schema that cannot run must never blank the page: each form shows a
// message, the healthy form still works and the issues are reported.
test('broken schemas show a message and the rest of the page keeps working', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/?demo=broken');

  for (const name of [
    'No steps',
    'Unknown step type',
    'Payment provider not registered',
    'Not even an object',
  ])
    await expect(
      page.getByTestId(`case-${name}`).getByRole('alert'),
    ).toContainText('This form is not available right now');

  const healthy = page.getByTestId('case-healthy');
  await healthy.getByLabel('Name').fill('Ana');
  await expect(healthy.getByLabel('Name')).toHaveValue('Ana');
  await expect(healthy.getByRole('alert')).toContainText(
    'Unknown field type "x-stars"',
  );

  const log = page.getByTestId('issue-log');
  await expect(log).toContainText('No steps: empty-steps');
  await expect(log).toContainText('Unknown step type: unsupported-step-kind');
  await expect(log).toContainText('healthy: unsupported-field-type');
  expect(pageErrors).toEqual([]);
});
