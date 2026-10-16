// Browser check for a consumer app built by consumer-test.mjs.
// Usage: node scripts/consumer-browser.mjs <app-dir> <port>
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const [dir, port = '4173'] = process.argv.slice(2);
const preview = spawn(
  'pnpm',
  ['exec', 'vite', 'preview', '--port', port, '--strictPort'],
  { cwd: dir, stdio: 'ignore' },
);
const fail = async (msg) => {
  preview.kill();
  console.error('FAIL:', msg);
  process.exit(1);
};
try {
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:${port}/`);
  await page.getByLabel('Email').waitFor();
  await page.getByRole('button', { name: /next/i }).click();
  await page
    .getByText(/required/i)
    .first()
    .waitFor({ timeout: 3000 });
  await page.getByLabel('Email').fill('a@b.co');
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByLabel('Note').fill('hi');
  await page.getByRole('button', { name: /finish/i }).click();
  await page.waitForFunction(() => window.__submitted, null, { timeout: 5000 });
  const v = await page.evaluate(() => window.__submitted);
  if (v.email !== 'a@b.co' || v.note !== 'hi')
    await fail(`bad values ${JSON.stringify(v)}`);
  if (errors.length) await fail(errors.join('\n'));
  await browser.close();
  console.log('browser OK', JSON.stringify(v));
} catch (e) {
  await fail(e.message);
}
preview.kill();
