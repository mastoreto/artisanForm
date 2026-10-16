import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ArtisanSchemaV1, defineForm } from '../../schema/define';
import { ArtisanSchemaError } from '../../schema/errors';
import { callback } from '../../wait';
import ArtisanForm from './ArtisanForm';
import type { ArtisanExtensions } from './extensions';
import type { FormSchema } from './types';

afterEach(cleanup);

// The same form written in 0.2.0 and in v1.
const legacy: FormSchema = {
  steps: [
    {
      title: 'Cuenta',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Nombre',
          required: true,
          min: 3,
          width: 'half',
        },
        {
          type: 'radio',
          name: 'kind',
          label: 'Tipo',
          options: [
            { value: 'person', label: 'Persona' },
            { value: 'company', label: 'Empresa' },
          ],
        },
        {
          type: 'text',
          name: 'company',
          label: 'Empresa',
          required: true,
          showIf: { field: 'kind', equals: 'company' },
        },
        {
          type: 'switch',
          name: 'news',
          label: 'Novedades',
          helperText: 'Una vez por mes',
        },
      ],
    },
    {
      title: 'Datos fiscales',
      showIf: { field: 'kind', equals: 'company' },
      fields: [{ type: 'text', name: 'tax', label: 'CUIT', required: true }],
    },
    { title: 'Listo', kind: 'result', message: 'Gracias' },
  ],
};

const v1: ArtisanSchemaV1 = defineForm({
  schemaVersion: 1,
  id: 'account',
  steps: [
    {
      id: 'account',
      type: 'form',
      title: 'Cuenta',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Nombre',
          required: true,
          validation: { minLength: 3 },
          ui: { span: 1 },
        },
        {
          type: 'radio',
          name: 'kind',
          label: 'Tipo',
          options: [
            { value: 'person', label: 'Persona' },
            { value: 'company', label: 'Empresa' },
          ],
        },
        {
          type: 'text',
          name: 'company',
          label: 'Empresa',
          required: true,
          visibleWhen: { field: 'kind', operator: 'eq', value: 'company' },
        },
        {
          type: 'switch',
          name: 'news',
          label: 'Novedades',
          description: 'Una vez por mes',
        },
      ],
    },
    {
      id: 'tax',
      type: 'form',
      title: 'Datos fiscales',
      visibleWhen: { field: 'kind', operator: 'eq', value: 'company' },
      fields: [{ type: 'text', name: 'tax', label: 'CUIT', required: true }],
    },
    { id: 'done', type: 'result', title: 'Listo', message: 'Gracias' },
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
  await user.click(screen.getByRole('button', { name: /Finalizar|Siguiente/ }));
  expect(
    (await screen.findAllByText('Campo requerido')).length,
  ).toBeGreaterThan(0);
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.click(screen.getByText('Empresa', { selector: 'button' }));
  await user.type(
    await screen.findByLabelText('Empresa', { selector: 'input' }),
    'ACME',
  );
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'Datos fiscales' });
  seen.push(heading());
  await user.type(screen.getByLabelText('CUIT'), '30-1');
  await user.click(screen.getByText('Finalizar'));
  await screen.findByText('Gracias');
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
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.click(screen.getByText('Persona'));
    await user.click(screen.getByText('Finalizar')); // account is the last visible form step
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
          { type: 'number', name: 'age', label: 'Edad' },
          { type: 'checkbox', name: 'parent', label: 'Tutor presente' },
          {
            type: 'text',
            name: 'consent',
            label: 'Consentimiento',
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
    expect(screen.queryByLabelText('Consentimiento')).toBeNull();
    await user.type(screen.getByLabelText('Edad'), '15');
    expect(await screen.findByLabelText('Consentimiento')).toBeTruthy();
    await user.click(screen.getByText('Finalizar'));
    expect(await screen.findByText('Campo requerido')).toBeTruthy(); // visible and required
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText('Tutor presente')); // `not parent` is now false
    await waitFor(() =>
      expect(screen.queryByLabelText('Consentimiento')).toBeNull(),
    );
    await user.click(screen.getByText('Finalizar'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ age: 15, parent: true });
  });
});

describe('extensions: a serializable schema refers to local code by id', () => {
  const wait = callback();
  const beforeNext = mock((values: Record<string, unknown>) =>
    values.name === 'bloqueado' ? { error: 'Nombre no permitido' } : undefined,
  );
  const onEnter = mock((_: unknown) => {});
  const goHome = mock(() => {});
  const extensions: ArtisanExtensions = {
    options: { langs: async (q) => [{ value: 'es', label: `Español ${q}` }] },
    waits: { order: wait.strategy },
    hooks: { check: beforeNext, entered: onEnter },
    renderers: {
      summary: (ctx) => <p>{`resumen de ${String(ctx.values.name)}`}</p>,
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
          { type: 'text', name: 'name', label: 'Nombre' },
          {
            type: 'combobox',
            name: 'lang',
            label: 'Idioma',
            optionsSource: 'langs',
          },
        ],
      },
      {
        id: 'sum',
        type: 'custom',
        title: 'Resumen',
        renderer: 'summary',
        hooks: { onEnter: 'entered' },
      },
      {
        id: 'wait',
        type: 'wait',
        title: 'Esperando',
        strategy: 'order',
        resultName: 'orderId',
        failTo: 'a',
      },
      {
        id: 'end',
        type: 'result',
        title: 'Fin',
        message: 'Hecho',
        actions: [{ label: 'Inicio', action: 'home' }],
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
    await user.type(screen.getByRole('combobox', { name: 'Idioma' }), 'x');
    expect(
      await screen.findByRole('option', { name: 'Español x' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('option', { name: 'Español x' }));

    // beforeNext hook can block
    await user.type(screen.getByLabelText('Nombre'), 'bloqueado');
    await user.click(screen.getByText('Siguiente'));
    expect(await screen.findByText('Nombre no permitido')).toBeTruthy();
    await user.clear(screen.getByLabelText('Nombre'));
    await user.type(screen.getByLabelText('Nombre'), 'Ana');
    await user.click(screen.getByText('Siguiente'));

    // custom renderer + onEnter hook
    expect(await screen.findByText('resumen de Ana')).toBeTruthy();
    expect(onEnter).toHaveBeenCalled();
    wait.update('procesando');
    await user.click(screen.getByText('Siguiente')); // custom step has the default controls

    // wait step with a named strategy
    await screen.findByRole('heading', { name: 'Esperando' });
    wait.resolve('ord_1');
    expect(await screen.findByText('Hecho')).toBeTruthy();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Ana',
      lang: 'es',
      orderId: 'ord_1',
    });

    // action by id
    await user.click(screen.getByText('Inicio'));
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
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.click(screen.getByText('Empresa', { selector: 'button' }));
  await user.type(
    await screen.findByLabelText('Empresa', { selector: 'input' }),
    'ACME',
  );
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'Datos fiscales' });
  rerender(make());
  expect(screen.getByRole('heading', { name: 'Datos fiscales' })).toBeTruthy();
});
