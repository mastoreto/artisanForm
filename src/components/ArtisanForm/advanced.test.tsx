import { afterEach, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtisanForm from './ArtisanForm';
import type { FieldSchema } from './types';

afterEach(cleanup);

const setup = (fields: FieldSchema[], extra: Record<string, unknown> = {}) => {
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [{ title: 'S', fields }, ...((extra.steps as never[]) ?? [])],
      }}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
};

const submitted = async (onSubmit: ReturnType<typeof mock>) => {
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  return onSubmit.mock.calls[0][0];
};

test('content fields render text, own no values and are skipped in the review', async () => {
  const onSubmit = mock((_: unknown) => {});
  const user = userEvent.setup();
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [
          {
            title: 'Datos',
            fields: [
              { type: 'heading', name: 'h', label: 'Sección A' },
              { type: 'paragraph', name: 'p', label: 'Explicación' },
              { type: 'callout', name: 'c', label: 'Ojo', variant: 'warning' },
              { type: 'divider', name: 'd', label: '' },
              { type: 'text', name: 'a', label: 'A' },
            ],
          },
          { title: 'Revisá', kind: 'review' },
        ],
      }}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Sección A' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toBe('Ojo');
  await user.type(screen.getByLabelText('A'), 'x');
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'Revisá' });
  expect(screen.queryByText('Explicación', { selector: 'dt' })).toBeNull();
  await user.click(screen.getByText('Finalizar'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ a: 'x' });
});

test('time, datetime and month use their native input types and limits', () => {
  setup([
    { type: 'time', name: 't', label: 'Hora', minDate: '08:00' },
    { type: 'datetime', name: 'dt', label: 'Fecha y hora' },
    { type: 'month', name: 'm', label: 'Mes' },
  ]);
  expect((screen.getByLabelText('Hora') as HTMLInputElement).type).toBe('time');
  expect((screen.getByLabelText('Hora') as HTMLInputElement).min).toBe('08:00');
  expect((screen.getByLabelText('Fecha y hora') as HTMLInputElement).type).toBe(
    'datetime-local',
  );
  expect((screen.getByLabelText('Mes') as HTMLInputElement).type).toBe('month');
});

test('daterange: the end cannot precede the start', async () => {
  const { user, onSubmit } = setup([
    {
      type: 'daterange',
      name: 'from',
      endName: 'to',
      label: 'Desde',
      required: true,
    },
  ]);
  await user.type(screen.getByLabelText('Desde'), '2030-05-10');
  await user.type(screen.getByLabelText('Hasta'), '2030-05-01');
  await user.click(screen.getByText('Finalizar'));
  expect(
    await screen.findByText('La fecha final es anterior a la inicial'),
  ).toBeTruthy();
  await user.clear(screen.getByLabelText('Hasta'));
  await user.type(screen.getByLabelText('Hasta'), '2030-05-20');
  await user.click(screen.getByText('Finalizar'));
  expect(await submitted(onSubmit)).toEqual({
    from: '2030-05-10',
    to: '2030-05-20',
  });
});

test('mask formats as you type; prefix is shown', async () => {
  const { user, onSubmit } = setup([
    { type: 'text', name: 'cuit', label: 'CUIT', mask: '##-########-#' },
    { type: 'number', name: 'price', label: 'Precio', prefix: '$' },
  ]);
  await user.type(screen.getByLabelText('CUIT'), '20123456789');
  expect((screen.getByLabelText('CUIT') as HTMLInputElement).value).toBe(
    '20-12345678-9',
  );
  expect(screen.getByText('$')).toBeTruthy();
  await user.click(screen.getByText('Finalizar'));
  expect((await submitted(onSubmit)) as object).toMatchObject({
    cuit: '20-12345678-9',
  });
});

test('range stores a number; rating toggles; otp handles typing, backspace and paste', async () => {
  const { user, onSubmit } = setup([
    {
      type: 'range',
      name: 'level',
      label: 'Nivel',
      min: 0,
      max: 10,
      defaultValue: '3' as never,
    },
    { type: 'rating', name: 'stars', label: 'Estrellas', length: 5 },
    { type: 'otp', name: 'code', label: 'Código', length: 4 },
  ]);
  fireEvent.change(screen.getByLabelText('Nivel'), { target: { value: '7' } });
  await user.click(screen.getByLabelText('4 / 5'));
  expect(screen.getByLabelText('4 / 5').getAttribute('aria-checked')).toBe(
    'true',
  );

  const boxes = screen.getAllByLabelText(/Código \d\/4/);
  await user.click(boxes[0]);
  await user.keyboard('12');
  await user.keyboard('{Backspace}');
  await user.keyboard('34');
  expect(boxes.map((b) => (b as HTMLInputElement).value)).toEqual([
    '1',
    '3',
    '4',
    '',
  ]);
  await user.paste('9');
  await user.click(screen.getByText('Finalizar'));
  expect(await submitted(onSubmit)).toMatchObject({ level: 7, stars: 4 });
});

test('combobox filters options and picks with the keyboard', async () => {
  const { user, onSubmit } = setup([
    {
      type: 'combobox',
      name: 'country',
      label: 'País',
      options: [
        { value: 'ar', label: 'Argentina' },
        { value: 'au', label: 'Australia' },
        { value: 'cl', label: 'Chile' },
      ],
    },
  ]);
  const input = screen.getByRole('combobox', { name: 'País' });
  await user.type(input, 'au');
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
    'Australia',
  ]);
  await user.keyboard('{Enter}');
  expect((input as HTMLInputElement).value).toBe('Australia');
  await user.click(screen.getByText('Finalizar'));
  expect(await submitted(onSubmit)).toEqual({ country: 'au' });
});

test('multiselect shows chips, removes them and supports async search', async () => {
  const loadOptions = mock(async (q: string) =>
    [
      { value: 'js', label: 'JavaScript' },
      { value: 'ts', label: 'TypeScript' },
    ].filter((o) => o.label.toLowerCase().includes(q.toLowerCase())),
  );
  const { user, onSubmit } = setup([
    { type: 'multiselect', name: 'langs', label: 'Lenguajes', loadOptions },
  ]);
  const input = screen.getByRole('combobox', { name: 'Lenguajes' });
  await user.type(input, 'script');
  await user.click(await screen.findByRole('option', { name: 'TypeScript' }));
  await user.click(await screen.findByRole('option', { name: 'JavaScript' }));
  expect(loadOptions).toHaveBeenCalled();
  expect(screen.getByLabelText('Quitar JavaScript')).toBeTruthy();
  await user.click(screen.getByLabelText('Quitar JavaScript'));
  await user.click(screen.getByText('Finalizar'));
  expect(await submitted(onSubmit)).toEqual({ langs: ['ts'] });
});
