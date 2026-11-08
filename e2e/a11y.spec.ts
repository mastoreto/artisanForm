import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Automated WCAG 2.x A/AA checks with axe-core on the default UI. axe is
// engine-independent, so it runs once (Chromium) instead of on every browser.
// It catches roughly a third of the possible issues: keyboard and screen
// reader behavior still need manual passes.
const scenarios = ['wizard', 'fields', 'repeatables', 'layout', 'files'];

for (const demo of scenarios) {
  test(`no axe violations: ${demo}`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'axe runs once, on Chromium');
    await page.goto(`/?demo=${demo}`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('form, [data-testid], .af-form').first().waitFor();

    const { violations } = await new AxeBuilder({ page })
      .include('main, #root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(
      violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target.join(' ')).slice(0, 3),
      })),
    ).toEqual([]);
  });
}

test('no axe violations: wizard with validation errors shown', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'axe runs once, on Chromium');
  await page.goto('/?demo=wizard');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Required field').first()).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.map((v) => ({ id: v.id, impact: v.impact }))).toEqual([]);
});
