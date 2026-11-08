import { expect, test } from '@playwright/test';

test('combobox, multiselect, otp, rating and mask work in a real browser', async ({
  page,
}) => {
  await page.goto('/?demo=fields');
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Tax ID').pressSequentially('20123456789');
  await expect(page.getByLabel('Tax ID')).toHaveValue('20-12345678-9');

  await page
    .getByRole('combobox', { name: 'Country', exact: true })
    .fill('chi');
  await page.getByRole('option', { name: 'Chile' }).click();

  const visited = page.getByRole('combobox', { name: 'Visited countries' });
  await visited.fill('ar');
  await page.getByRole('option', { name: 'Argentina' }).click();
  await visited.fill('uru');
  await page.getByRole('option', { name: 'Uruguay' }).click();

  await page.getByLabel('4 / 5').click();
  await page.getByLabel('Code 1/4').click();
  await page.keyboard.type('4821');
  await page.getByRole('button', { name: 'Finish' }).click();

  const result = page.getByTestId('result');
  await expect(result).toContainText('"country": "cl"');
  await expect(result).toContainText('"visited": [');
  await expect(result).toContainText('"code": "4821"');
  await expect(result).toContainText('"stars": 4');
  await expect(result).toContainText('"taxId": "20-12345678-9"');
});
