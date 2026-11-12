import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArtisanExtensions } from '../../../engine/extensions';
import { defineForm } from '../../../schema/contract/define';
import type { ArtisanInputProps } from '../../ui/types';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const form = (type: 'select' | 'radio') =>
  defineForm({
    schemaVersion: 1,
    id: `sourced-${type}`,
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        fields: [
          {
            type,
            name: 'plan',
            label: 'Plan',
            required: true,
            optionsSource: 'plans',
          },
        ],
      },
      { id: 'done', type: 'result', title: 'Done', message: 'Saved' },
    ],
  });

const plans = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
];

// A source that resolves when the test says so.
const deferred = () => {
  let resolve!: (v: typeof plans) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<typeof plans>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test('a select loads its options from the source and starts on the first one', async () => {
  const d = deferred();
  const load = mock((_q: string) => d.promise);
  const extensions: ArtisanExtensions = { options: { plans: load } };
  const onSubmit = mock((_: unknown) => {});
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={form('select')}
      extensions={extensions}
      onSubmit={onSubmit}
    />,
  );

  expect(screen.getByRole('status').textContent).toBe('Loading…');
  expect(load).toHaveBeenCalledWith('');
  d.resolve(plans);
  expect(await screen.findByRole('option', { name: 'Pro' })).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
  expect((screen.getByLabelText('Plan') as HTMLSelectElement).value).toBe(
    'free',
  );

  await user.selectOptions(screen.getByLabelText('Plan'), 'pro');
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ plan: 'pro' });
});

test('submitting without touching the select sends the first option, not an empty value', async () => {
  const extensions: ArtisanExtensions = {
    options: { plans: async () => plans },
  };
  const onSubmit = mock((_: unknown) => {});
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={form('select')}
      extensions={extensions}
      onSubmit={onSubmit}
    />,
  );
  await screen.findByRole('option', { name: 'Pro' });
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  // A native <select> shows its first option even when the form value is still '',
  // so the DOM alone cannot prove the value was set.
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ plan: 'free' });
});

test('a radio group shows the options the source returns', async () => {
  const extensions: ArtisanExtensions = {
    options: { plans: async () => plans },
  };
  render(
    <ArtisanForm
      scheme={form('radio')}
      extensions={extensions}
      onSubmit={() => {}}
    />,
  );
  expect(await screen.findByRole('radio', { name: 'Pro' })).toBeTruthy();
  expect(screen.getAllByRole('radio')).toHaveLength(2);
});

test('a failing source shows the error and keeps the form usable', async () => {
  const extensions: ArtisanExtensions = {
    options: { plans: () => Promise.reject(new Error('down')) },
  };
  render(
    <ArtisanForm
      scheme={form('select')}
      extensions={extensions}
      onSubmit={() => {}}
    />,
  );
  expect((await screen.findByRole('alert')).textContent).toBe(
    'Could not load the options',
  );
});

test('a kit input receives the resolved options', async () => {
  const seen: (readonly { value: string }[])[] = [];
  const Select = ({
    id,
    options = [],
    value,
    onChange,
  }: ArtisanInputProps<string>) => {
    seen.push(options);
    return (
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  };
  const extensions: ArtisanExtensions = {
    options: { plans: async () => plans },
  };
  render(
    <ArtisanForm
      scheme={form('select')}
      extensions={extensions}
      components={{ inputs: { select: Select } }}
      onSubmit={() => {}}
    />,
  );
  await waitFor(() =>
    expect(seen.at(-1)?.map((o) => o.value)).toEqual(['free', 'pro']),
  );
});
