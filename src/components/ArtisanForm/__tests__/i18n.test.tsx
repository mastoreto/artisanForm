import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defineForm } from '../../../schema/contract/define';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const scheme = defineForm({
  schemaVersion: 1,
  id: 'i18n',
  steps: [
    {
      id: 'a',
      type: 'form',
      title: 'Your data',
      fields: [
        { type: 'text', name: 'name', label: 'Name' },
        {
          type: 'select',
          name: 'plan',
          label: 'Plan',
          options: [{ value: 'pro', label: 'Pro plan' }],
        },
      ],
    },
    { id: 'done', type: 'result', title: 'Done', message: 'Saved' },
  ],
  i18n: {
    messages: { es: { 'steps.a.title': 'Tus datos (bloque)' } },
  },
});

const es = {
  'steps.a.title': 'Tus datos',
  'steps.a.fields.name.label': 'Nombre',
  'steps.a.fields.plan.options.pro': 'Plan Pro',
};

test('without a locale the source texts show', () => {
  render(<ArtisanForm scheme={scheme} onSubmit={() => {}} />);
  expect(screen.getByLabelText('Name')).toBeTruthy();
});

test('messages translate labels and options, values stay', async () => {
  render(
    <ArtisanForm
      scheme={scheme}
      locale="es-AR"
      messages={{ es }}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByLabelText('Nombre')).toBeTruthy();
  expect(screen.getByRole('option', { name: 'Plan Pro' })).toBeTruthy();
  expect(screen.getAllByText('Tus datos').length).toBeGreaterThan(0);
});

test("the schema's own i18n block is used when no messages are given", () => {
  render(<ArtisanForm scheme={scheme} locale="es" onSubmit={() => {}} />);
  expect(screen.getAllByText('Tus datos (bloque)').length).toBeGreaterThan(0);
});

test('switching locale keeps what the user typed', async () => {
  const { rerender } = render(
    <ArtisanForm scheme={scheme} locale="en" onSubmit={() => {}} />,
  );
  await userEvent.type(screen.getByLabelText('Name'), 'Ada');
  rerender(
    <ArtisanForm
      scheme={scheme}
      locale="es"
      messages={{ es }}
      onSubmit={() => {}}
    />,
  );
  expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
    'Ada',
  );
});

test('loadMessages fetches on demand; source text shows meanwhile', async () => {
  const load = mock(async (_locale: string) => es);
  render(
    <ArtisanForm
      scheme={scheme}
      locale="es-AR"
      loadMessages={load}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByLabelText('Name')).toBeTruthy();
  await waitFor(() => expect(screen.getByLabelText('Nombre')).toBeTruthy());
  // `es` is already in the schema's own block: only `es-AR` is fetched.
  expect(load.mock.calls.map((c) => String(c[0]))).toEqual(['es-AR']);
});

test('a failing loader leaves the source text', async () => {
  const load = mock(async () => {
    throw new Error('nope');
  });
  render(
    <ArtisanForm
      scheme={scheme}
      locale="fr"
      loadMessages={load}
      onSubmit={() => {}}
    />,
  );
  await waitFor(() => expect(load).toHaveBeenCalled());
  expect(screen.getByLabelText('Name')).toBeTruthy();
});
