import { expect, test } from '@playwright/test';

const pdf = (name: string) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4 test'),
});

test.beforeEach(async ({ page }) => {
  await page.goto('/?demo=files');
});

test('uploads a document, blocks while uploading, then submits', async ({
  page,
}) => {
  await page.locator('input[type=file]').first().setInputFiles(pdf('dni.pdf'));
  await expect(page.getByRole('progressbar')).toBeVisible();

  await page.getByRole('button', { name: 'Next' }).click();
  await expect(
    page.getByText('Wait for the files to finish uploading'),
  ).toBeVisible();

  await expect(page.getByLabel('Remove dni.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
  await expect(page.getByText('dni.pdf')).toBeVisible();

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByText('Documents received')).toBeVisible();
  await expect(page.getByTestId('result')).toContainText('"name": "dni.pdf"');
});

test('shows an error for failed uploads and allows a retry', async ({
  page,
}) => {
  await page.locator('input[type=file]').first().setInputFiles(pdf('fail.pdf'));
  await expect(page.getByText('Mock upload failed')).toBeVisible();
  await expect(page.getByLabel('Retry fail.pdf')).toBeVisible();
});

test('drag and drop adds a file', async ({ page }) => {
  const zone = page.getByRole('region', { name: 'DNI (PDF)' });
  const data = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(
      new File(['%PDF'], 'dropped.pdf', { type: 'application/pdf' }),
    );
    return dt;
  });
  await zone.dispatchEvent('drop', { dataTransfer: data });
  await expect(page.getByLabel('Remove dropped.pdf')).toBeVisible();
});
