import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// The visual builder against a real browser: drag and drop with the mouse and
// the keyboard, the round trip through JSON, saving, and axe.
const schema = async (page: Page) =>
  JSON.parse((await page.getByTestId('schema-json').textContent()) || '{}') as {
    steps: { fields: { name: string; label?: string }[] }[];
  };
const names = async (page: Page) =>
  (await schema(page)).steps[0]?.fields.map((f) => f.name) ?? [];

test.beforeEach(async ({ page }) => {
  // tall enough that the whole builder is on screen: the mouse cannot reach what scrolls
  await page.setViewportSize({ width: 1280, height: 2600 });
  await page.goto('/?demo=builder');
  await page.getByRole('region', { name: 'Inputs' }).waitFor();
});

const drag = async (
  page: Page,
  from: ReturnType<Page['locator']>,
  to: ReturnType<Page['locator']>,
  dy = 12,
) => {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) throw new Error('nothing to drag');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + dy, { steps: 14 });
  await page.waitForTimeout(150);
  await page.mouse.up();
};

test('an input dragged from the palette lands in the form', async ({
  page,
}) => {
  await drag(
    page,
    page.getByRole('button', { name: 'Add Email' }),
    page.getByRole('list', { name: 'Form' }),
    20,
  );
  await expect.poll(() => names(page)).toEqual(['email']);
  await expect(page.getByTestId('ok')).toHaveText('true');
});

test('clicking an input adds it too, and the preview shows it', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add Text' }).click();
  await page.getByRole('button', { name: 'Add Number' }).click();
  await expect.poll(() => names(page)).toEqual(['text', 'number']);
  const preview = page.getByRole('region', { name: 'Preview' });
  await expect(preview.getByLabel('Text')).toBeVisible();
  await expect(preview.getByLabel('Number')).toBeVisible();
});

test('dragging a row reorders the form', async ({ page }) => {
  for (const type of ['Text', 'Email', 'Phone'])
    await page.getByRole('button', { name: `Add ${type}` }).click();
  await expect.poll(() => names(page)).toEqual(['text', 'email', 'phone']);
  const handle = page.getByRole('button', { name: 'Drag Phone' });
  const first = page.locator('[data-field="text"]');
  await drag(page, handle, first, 20);
  await expect.poll(() => names(page)).toEqual(['phone', 'text', 'email']);
});

test('the keyboard reorders too: Space to pick up, arrows, Space to drop', async ({
  page,
}) => {
  for (const type of ['Text', 'Email'])
    await page.getByRole('button', { name: `Add ${type}` }).click();
  await expect.poll(() => names(page)).toEqual(['text', 'email']);
  const handle = page.getByRole('button', { name: 'Drag Email' });
  await handle.focus();
  await page.keyboard.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(250); // the sensor measures the rows between keys
  await page.keyboard.press('Space');
  await expect.poll(() => names(page)).toEqual(['email', 'text']);
});

test('the buttons do everything a drag does (no drag needed)', async ({
  page,
}) => {
  for (const type of ['Text', 'Email'])
    await page.getByRole('button', { name: `Add ${type}` }).click();
  await page.getByRole('button', { name: 'Move up: Email' }).click();
  await expect.poll(() => names(page)).toEqual(['email', 'text']);
  await page.getByRole('button', { name: 'Remove: Email' }).click();
  await expect.poll(() => names(page)).toEqual(['text']);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => names(page)).toEqual(['email', 'text']);
});

test('editing in the inspector reaches the preview and the schema', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add Text' }).click();
  const inspector = page.getByRole('region', { name: 'Settings' });
  await inspector.getByLabel('Label').fill('Full name');
  await inspector.getByLabel('Required').check();
  await expect(
    page.getByRole('region', { name: 'Preview' }).getByLabel('Full name'),
  ).toBeVisible();
  const field = (await schema(page)).steps[0]?.fields[0] as {
    label: string;
    required: boolean;
  };
  expect(field).toMatchObject({ label: 'Full name', required: true });
});

test('round trip: build, take the JSON out, bring it back', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add Email' }).click();
  await page.getByRole('button', { name: 'Add Dropdown' }).click();
  const built = await schema(page);
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  const area = page.getByRole('textbox', { name: 'Schema JSON' });
  const text = await area.inputValue();
  expect(JSON.parse(text)).toEqual(built);
  // start over from a template, then import what was taken out
  await page.getByRole('button', { name: 'Templates' }).click();
  await page.getByRole('button', { name: 'Use Contact' }).click();
  await page.getByRole('button', { name: 'Use Contact' }).click(); // confirm
  await expect
    .poll(() => names(page))
    .toEqual(['fullName', 'email', 'message']);
  await page.getByRole('button', { name: 'JSON', exact: true }).click();
  await page.getByRole('textbox', { name: 'Schema JSON' }).fill(text);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect.poll(() => names(page)).toEqual(['email', 'choice']);
});

test('save hands over the schema hash only while it is valid', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add Text' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('saved')).toHaveText(/^[0-9a-f]{64}$/);
});

test('a custom type from the manifest is offered and configured from its spec', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add x-satisfaction' }).click();
  const inspector = page.getByRole('region', { name: 'Settings' });
  await inspector.getByLabel('Scale').fill('7');
  await expect
    .poll(async () => JSON.stringify((await schema(page)).steps[0]?.fields[0]))
    .toContain('"scale":7');
  await inspector.getByLabel('Scale').fill('99');
  await expect(page.getByTestId('ok')).toHaveText('false');
});

test('no axe violations in the builder', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'axe runs once, on Chromium');
  await page.getByRole('button', { name: 'Add Text' }).click();
  const { violations } = await new AxeBuilder({ page })
    .include('#root')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.slice(0, 2).map((n) => n.target),
    })),
  ).toEqual([]);
});
