import { afterEach, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FieldSchema } from '../../../schema/legacy/types';
import ArtisanForm from '../ArtisanForm';

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
            title: 'Data',
            fields: [
              { type: 'heading', name: 'h', label: 'Section A' },
              { type: 'paragraph', name: 'p', label: 'Explanation' },
              { type: 'callout', name: 'c', label: 'Eye', variant: 'warning' },
              { type: 'divider', name: 'd', label: '' },
              { type: 'text', name: 'a', label: 'A' },
            ],
          },
          { title: 'Review', kind: 'review' },
        ],
      }}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Section A' })).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toBe('Eye');
  await user.type(screen.getByLabelText('A'), 'x');
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Review' });
  expect(screen.queryByText('Explanation', { selector: 'dt' })).toBeNull();
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ a: 'x' });
});

test('time, datetime and month use their native input types and limits', () => {
  setup([
    { type: 'time', name: 't', label: 'Time', minDate: '08:00' },
    { type: 'datetime', name: 'dt', label: 'Date and time' },
    { type: 'month', name: 'm', label: 'Month' },
  ]);
  expect((screen.getByLabelText('Time') as HTMLInputElement).type).toBe('time');
  expect((screen.getByLabelText('Time') as HTMLInputElement).min).toBe('08:00');
  expect(
    (screen.getByLabelText('Date and time') as HTMLInputElement).type,
  ).toBe('datetime-local');
  expect((screen.getByLabelText('Month') as HTMLInputElement).type).toBe(
    'month',
  );
});

test('daterange: the end cannot precede the start', async () => {
  const { user, onSubmit } = setup([
    {
      type: 'daterange',
      name: 'from',
      endName: 'to',
      label: 'From',
      required: true,
    },
  ]);
  await user.type(screen.getByLabelText('From'), '2030-05-10');
  await user.type(screen.getByLabelText('To'), '2030-05-01');
  await user.click(screen.getByText('Finish'));
  expect(
    await screen.findByText('The end date is before the start date'),
  ).toBeTruthy();
  await user.clear(screen.getByLabelText('To'));
  await user.type(screen.getByLabelText('To'), '2030-05-20');
  await user.click(screen.getByText('Finish'));
  expect(await submitted(onSubmit)).toEqual({
    from: '2030-05-10',
    to: '2030-05-20',
  });
});

test('mask formats as you type; prefix is shown', async () => {
  const { user, onSubmit } = setup([
    { type: 'text', name: 'taxId', label: 'Tax ID', mask: '##-########-#' },
    { type: 'number', name: 'price', label: 'Price', prefix: '$' },
  ]);
  await user.type(screen.getByLabelText('Tax ID'), '20123456789');
  expect((screen.getByLabelText('Tax ID') as HTMLInputElement).value).toBe(
    '20-12345678-9',
  );
  expect(screen.getByText('$')).toBeTruthy();
  await user.click(screen.getByText('Finish'));
  expect((await submitted(onSubmit)) as object).toMatchObject({
    taxId: '20-12345678-9',
  });
});

test('range stores a number; rating toggles; otp handles typing, backspace and paste', async () => {
  const { user, onSubmit } = setup([
    {
      type: 'range',
      name: 'level',
      label: 'Level',
      min: 0,
      max: 10,
      defaultValue: '3' as never,
    },
    { type: 'rating', name: 'stars', label: 'Stars', length: 5 },
    { type: 'otp', name: 'code', label: 'Code', length: 4 },
  ]);
  fireEvent.change(screen.getByLabelText('Level'), { target: { value: '7' } });
  // the rating has a visible label, not only an aria-label
  expect(screen.getByText('Stars').tagName).toBe('SPAN');
  await user.click(screen.getByLabelText('4 / 5'));
  expect(screen.getByLabelText('4 / 5').getAttribute('aria-checked')).toBe(
    'true',
  );

  const boxes = screen.getAllByLabelText(/Code \d\/4/);
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
  await user.click(screen.getByText('Finish'));
  expect(await submitted(onSubmit)).toMatchObject({ level: 7, stars: 4 });
});

test('combobox filters options and picks with the keyboard', async () => {
  const { user, onSubmit } = setup([
    {
      type: 'combobox',
      name: 'country',
      label: 'Country',
      options: [
        { value: 'ar', label: 'Argentina' },
        { value: 'au', label: 'Australia' },
        { value: 'cl', label: 'Chile' },
      ],
    },
  ]);
  const input = screen.getByRole('combobox', { name: 'Country' });
  await user.type(input, 'au');
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
    'Australia',
  ]);
  await user.keyboard('{Enter}');
  expect((input as HTMLInputElement).value).toBe('Australia');
  await user.click(screen.getByText('Finish'));
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
    { type: 'multiselect', name: 'langs', label: 'Languages', loadOptions },
  ]);
  const input = screen.getByRole('combobox', { name: 'Languages' });
  await user.type(input, 'script');
  await user.click(await screen.findByRole('option', { name: 'TypeScript' }));
  await user.click(await screen.findByRole('option', { name: 'JavaScript' }));
  expect(loadOptions).toHaveBeenCalled();
  expect(screen.getByLabelText('Remove JavaScript')).toBeTruthy();
  await user.click(screen.getByLabelText('Remove JavaScript'));
  await user.click(screen.getByText('Finish'));
  expect(await submitted(onSubmit)).toEqual({ langs: ['ts'] });
});

test('array field: add and remove rows, validate each row, submit the list', async () => {
  const { user, onSubmit } = setup([
    {
      type: 'array',
      name: 'people',
      label: 'People',
      minItems: 1,
      maxItems: 3,
      itemFields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'email', name: 'mail', label: 'Mail' },
      ],
    },
  ]);
  // starts empty: minItems must be satisfied
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Add at least 1')).toBeTruthy();

  await user.click(screen.getByText('Add another'));
  await user.click(screen.getByText('Add another'));
  expect(screen.getAllByLabelText('Name')).toHaveLength(2);

  // a row with a missing required field blocks the submit
  await user.type(screen.getAllByLabelText('Name')[0], 'Ana');
  await user.type(screen.getAllByLabelText('Mail')[0], 'ana@x.co');
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Required field')).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();

  await user.click(screen.getByLabelText('Remove item 2'));
  expect(screen.getAllByLabelText('Name')).toHaveLength(1);
  await user.click(screen.getByText('Finish'));
  expect(await submitted(onSubmit)).toEqual({
    people: [{ name: 'Ana', mail: 'ana@x.co' }],
  });
});

test('array field: maxItems disables "add" and secrets inside rows are not drafted', async () => {
  localStorage.clear();
  const user = userEvent.setup();
  render(
    <ArtisanForm
      onSubmit={() => {}}
      persistKey="arr"
      scheme={{
        steps: [
          {
            title: 'S',
            fields: [
              {
                type: 'array',
                name: 'cards',
                label: 'Passwords',
                maxItems: 1,
                itemFields: [{ type: 'password', name: 'pin', label: 'PIN' }],
              },
            ],
          },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Add another'));
  await user.type(screen.getByLabelText('PIN'), 'abcd');
  expect((screen.getByText('Add another') as HTMLButtonElement).disabled).toBe(
    true,
  );
  await waitFor(() =>
    expect(localStorage.getItem('artisanform:arr')).toBeTruthy(),
  );
  expect(localStorage.getItem('artisanform:arr')).not.toContain('abcd');
});
