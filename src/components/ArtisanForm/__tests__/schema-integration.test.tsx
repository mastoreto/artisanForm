import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArtisanExtensions } from '../../../engine/extensions';
import { callback } from '../../../integrations/wait';
import {
  type ArtisanSchemaV1,
  defineForm,
} from '../../../schema/contract/define';
import { ArtisanSchemaError } from '../../../schema/contract/errors';
import type { FormSchema } from '../../../schema/legacy/types';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

// The same form written in 0.2.0 and in v1.
const legacy: FormSchema = {
  steps: [
    {
      title: 'Account',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Name',
          required: true,
          min: 3,
          width: 'half',
        },
        {
          type: 'radio',
          name: 'kind',
          label: 'Type',
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
        },
        {
          type: 'text',
          name: 'company',
          label: 'Company',
          required: true,
          showIf: { field: 'kind', equals: 'company' },
        },
        {
          type: 'switch',
          name: 'news',
          label: 'News',
          helperText: 'Once a month',
        },
      ],
    },
    {
      title: 'Tax details',
      showIf: { field: 'kind', equals: 'company' },
      fields: [{ type: 'text', name: 'tax', label: 'Tax ID', required: true }],
    },
    { title: 'Done', kind: 'result', message: 'Thanks' },
  ],
};

const v1: ArtisanSchemaV1 = defineForm({
  schemaVersion: 1,
  id: 'account',
  steps: [
    {
      id: 'account',
      type: 'form',
      title: 'Account',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Name',
          required: true,
          validation: { minLength: 3 },
          ui: { span: 1 },
        },
        {
          type: 'radio',
          name: 'kind',
          label: 'Type',
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
        },
        {
          type: 'text',
          name: 'company',
          label: 'Company',
          required: true,
          visibleWhen: { field: 'kind', operator: 'eq', value: 'company' },
        },
        {
          type: 'switch',
          name: 'news',
          label: 'News',
          description: 'Once a month',
        },
      ],
    },
    {
      id: 'tax',
      type: 'form',
      title: 'Tax details',
      visibleWhen: { field: 'kind', operator: 'eq', value: 'company' },
      fields: [{ type: 'text', name: 'tax', label: 'Tax ID', required: true }],
    },
    { id: 'done', type: 'result', title: 'Done', message: 'Thanks' },
  ],
});

const run = async (scheme: FormSchema | ArtisanSchemaV1) => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  const view = render(<ArtisanForm scheme={scheme} onSubmit={onSubmit} />);
  const seen: string[] = [];
  const heading = () =>
    screen.getByRole('heading', { level: 2 }).textContent ?? '';
  seen.push(heading());
  const firstScreen = view.container.innerHTML;
  // blocked by required fields (the tax step is hidden, so this one is the last)
  await user.click(screen.getByRole('button', { name: /Finish|Next/ }));
  expect((await screen.findAllByText('Required field')).length).toBeGreaterThan(
    0,
  );
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.click(screen.getByText('Company', { selector: 'button' }));
  await user.type(
    await screen.findByLabelText('Company', { selector: 'input' }),
    'ACME',
  );
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Tax details' });
  seen.push(heading());
  await user.type(screen.getByLabelText('Tax ID'), '30-1');
  await user.click(screen.getByText('Finish'));
  await screen.findByText('Thanks');
  seen.push(heading());
  return {
    seen,
    submitted: onSubmit.mock.calls[0][0],
    html: view.container.innerHTML,
    firstScreen,
  };
};

describe('a v1 schema behaves exactly like its 0.2.0 equivalent', () => {
  test('same steps, same validation, same submitted values, same DOM', async () => {
    const a = await run(legacy);
    cleanup();
    const b = await run(v1);
    expect(b.seen).toEqual(a.seen);
    expect(b.submitted).toEqual(a.submitted);
    // the rendered first and last screens are identical, byte for byte
    expect(b.firstScreen).toBe(a.firstScreen);
    expect(b.html).toBe(a.html);
    expect(b.submitted).toEqual({
      name: 'Ana',
      kind: 'company',
      company: 'ACME',
      news: false,
      tax: '30-1',
    });
  });

  test('hidden fields and steps are not submitted (person skips the tax step)', async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_: unknown) => {});
    render(<ArtisanForm scheme={v1} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Name'), 'Ana');
    await user.click(screen.getByText('Person'));
    await user.click(screen.getByText('Finish')); // account is the last visible form step
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Ana',
      kind: 'person',
      news: false,
    });
  });
});

describe('v1 conditions in the running form', () => {
  const compound = defineForm({
    schemaVersion: 1,
    id: 'c',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [
          { type: 'number', name: 'age', label: 'Age' },
          { type: 'checkbox', name: 'parent', label: 'Guardian present' },
          {
            type: 'text',
            name: 'consent',
            label: 'Consent',
            required: true,
            visibleWhen: {
              all: [
                { field: 'age', operator: 'lt', value: 18 },
                { not: { field: 'parent', operator: 'eq', value: true } },
              ],
            },
          },
        ],
      },
    ],
  });

  test('all / not / lt decide visibility and validation', async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_: unknown) => {});
    render(<ArtisanForm scheme={compound} onSubmit={onSubmit} />);
    expect(screen.queryByLabelText('Consent')).toBeNull();
    await user.type(screen.getByLabelText('Age'), '15');
    expect(await screen.findByLabelText('Consent')).toBeTruthy();
    await user.click(screen.getByText('Finish'));
    expect(await screen.findByText('Required field')).toBeTruthy(); // visible and required
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText('Guardian present')); // `not parent` is now false
    await waitFor(() => expect(screen.queryByLabelText('Consent')).toBeNull());
    await user.click(screen.getByText('Finish'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ age: 15, parent: true });
  });
});

describe('extensions: a serializable schema refers to local code by id', () => {
  const wait = callback();
  const beforeNext = mock((values: Record<string, unknown>) =>
    values.name === 'blocked' ? { error: 'Name not allowed' } : undefined,
  );
  const onEnter = mock((_: unknown) => {});
  const goHome = mock(() => {});
  const extensions: ArtisanExtensions = {
    options: { langs: async (q) => [{ value: 'es', label: `Spanish ${q}` }] },
    waits: { order: wait.strategy },
    hooks: { check: beforeNext, entered: onEnter },
    renderers: {
      summary: (ctx) => <p>{`summary of ${String(ctx.values.name)}`}</p>,
    },
    actions: { home: goHome },
  };
  const schema = defineForm({
    schemaVersion: 1,
    id: 'ext',
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        hooks: { beforeNext: 'check' },
        fields: [
          { type: 'text', name: 'name', label: 'Name' },
          {
            type: 'combobox',
            name: 'lang',
            label: 'Language',
            optionsSource: 'langs',
          },
        ],
      },
      {
        id: 'sum',
        type: 'custom',
        title: 'Summary',
        renderer: 'summary',
        hooks: { onEnter: 'entered' },
      },
      {
        id: 'wait',
        type: 'wait',
        title: 'Waiting',
        strategy: 'order',
        resultName: 'orderId',
        failTo: 'a',
      },
      {
        id: 'end',
        type: 'result',
        title: 'End',
        message: 'Done',
        actions: [{ label: 'Home', action: 'home' }],
      },
    ],
  });

  test('hooks, async options, renderers, wait strategies and actions all resolve', async () => {
    const user = userEvent.setup();
    const onSubmit = mock((_: unknown) => {});
    render(
      <ArtisanForm
        scheme={schema}
        extensions={extensions}
        onSubmit={onSubmit}
      />,
    );

    // async options through `optionsSource`
    await user.type(screen.getByRole('combobox', { name: 'Language' }), 'x');
    expect(
      await screen.findByRole('option', { name: 'Spanish x' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('option', { name: 'Spanish x' }));

    // beforeNext hook can block
    await user.type(screen.getByLabelText('Name'), 'blocked');
    await user.click(screen.getByText('Next'));
    expect(await screen.findByText('Name not allowed')).toBeTruthy();
    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Ana');
    await user.click(screen.getByText('Next'));

    // custom renderer + onEnter hook
    expect(await screen.findByText('summary of Ana')).toBeTruthy();
    expect(onEnter).toHaveBeenCalled();
    wait.update('procesando');
    await user.click(screen.getByText('Next')); // custom step has the default controls

    // wait step with a named strategy
    await screen.findByRole('heading', { name: 'Waiting' });
    wait.resolve('ord_1');
    expect(await screen.findByText('Done')).toBeTruthy();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Ana',
      lang: 'es',
      orderId: 'ord_1',
    });

    // action by id
    await user.click(screen.getByText('Home'));
    expect(goHome).toHaveBeenCalledTimes(1);
  });

  test('a reference nobody registered fails loudly, not silently', () => {
    const consoleError = console.error;
    console.error = () => {};
    try {
      expect(() =>
        render(<ArtisanForm scheme={schema} onSubmit={() => {}} />),
      ).toThrow(ArtisanSchemaError);
    } finally {
      console.error = consoleError;
    }
  });
});

describe('custom registries accept both naming styles', () => {
  const field = (name: string) => ({
    initialValues: (f: { name: string }) => ({ [f.name]: 3 }),
    rules: () => ({}),
    render: () => <span>{name}</span>,
  });

  test('a 0.2.0 custom type and its v1 `x-` name resolve to the same registry entry', () => {
    render(
      <ArtisanForm
        scheme={{
          steps: [
            { title: 'S', fields: [{ type: 'stars', name: 's', label: 'S' }] },
          ],
        }}
        fields={{ stars: field('legacy-stars') }}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText('legacy-stars')).toBeTruthy();
    cleanup();
    render(
      <ArtisanForm
        scheme={defineForm({
          schemaVersion: 1,
          id: 'x',
          steps: [
            {
              id: 's',
              type: 'form',
              title: 'S',
              fields: [{ type: 'x-stars', name: 's' }],
            },
          ],
        })}
        fields={{ 'x-stars': field('v1-stars') }}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByText('v1-stars')).toBeTruthy();
  });
});

test('a new `extensions`/`scheme` identity with the same content does not reset the wizard', async () => {
  const user = userEvent.setup();
  const make = () => (
    <ArtisanForm
      scheme={{ ...legacy, steps: [...legacy.steps] }}
      extensions={{}}
      onSubmit={() => {}}
    />
  );
  const { rerender } = render(make());
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.click(screen.getByText('Company', { selector: 'button' }));
  await user.type(
    await screen.findByLabelText('Company', { selector: 'input' }),
    'ACME',
  );
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Tax details' });
  rerender(make());
  expect(screen.getByRole('heading', { name: 'Tax details' })).toBeTruthy();
});

describe('unsafe links in a schema', () => {
  const termsWith = (href: string) =>
    render(
      <ArtisanForm
        onSubmit={() => {}}
        scheme={{
          steps: [
            { title: 'Terms', kind: 'terms', content: 'Read this', href },
          ],
        }}
      />,
    );

  test('a terms step does not render a javascript: link', () => {
    termsWith('javascript:alert(1)');
    expect(screen.getByText('Read this')).toBeTruthy();
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('a terms step still renders an https: link', () => {
    termsWith('https://example.com/terms');
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      'https://example.com/terms',
    );
  });
});
