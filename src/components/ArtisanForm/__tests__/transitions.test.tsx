import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defineForm } from '../../../schema';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const text = (name: string) => ({ type: 'text' as const, name, label: name });
const step = (
  id: string,
  fields: ReturnType<typeof text>[] = [],
  extra = {},
) => ({
  id,
  type: 'form' as const,
  title: id,
  fields,
  ...extra,
});

// plan: pro → pay, otherwise → review. pay can never be revisited.
const plans = defineForm({
  schemaVersion: 1,
  id: 'plans',
  steps: [
    step('plan', [text('plan')], {
      next: [
        { when: { field: 'plan', operator: 'eq', value: 'pro' }, to: 'pay' },
        { to: 'review' },
      ],
    }),
    step('pay', [], { revisit: 'deny' }),
    step('review'),
    step('end'),
  ],
});

const heading = (name: string) => screen.findByRole('heading', { name });
const type = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) => user.type(screen.getByLabelText(label), value);

test('the first matching transition decides the next step', async () => {
  const user = userEvent.setup();
  render(<ArtisanForm scheme={plans} onSubmit={() => {}} />);
  await type(user, 'plan', 'pro');
  await user.click(screen.getByText('Next'));
  expect(await heading('pay')).toBeTruthy();
  cleanup();

  render(<ArtisanForm scheme={plans} onSubmit={() => {}} />);
  await type(user, 'plan', 'free');
  await user.click(screen.getByText('Next'));
  expect(await heading('review')).toBeTruthy();
});

test('Back follows the path taken, not the step order', async () => {
  const user = userEvent.setup();
  render(<ArtisanForm scheme={plans} onSubmit={() => {}} />);
  await type(user, 'plan', 'free');
  await user.click(screen.getByText('Next')); // plan → review (skips pay)
  await heading('review');
  await user.click(screen.getByText('Previous'));
  expect(await heading('plan')).toBeTruthy(); // not "pay"
});

test('a finished revisit:deny step cannot be gone back through', async () => {
  const user = userEvent.setup();
  render(<ArtisanForm scheme={plans} onSubmit={() => {}} />);
  await type(user, 'plan', 'pro');
  await user.click(screen.getByText('Next')); // → pay
  await user.click(await screen.findByText('Next')); // pay → review
  await heading('review');
  expect(screen.queryByText('Previous')).toBeNull();
});

test('loop.max bounds how often a step is entered again', async () => {
  const user = userEvent.setup();
  const looping = defineForm({
    schemaVersion: 1,
    id: 'loop',
    steps: [
      step('edit', [], { loop: { max: 1 } }),
      step('review', [text('again')], {
        next: [
          {
            when: { field: 'again', operator: 'eq', value: 'yes' },
            to: 'edit',
          },
        ],
      }),
      step('end'),
    ],
  });
  render(<ArtisanForm scheme={looping} onSubmit={() => {}} />);
  await user.click(screen.getByText('Next')); // edit → review
  await type(user, 'again', 'yes');
  await user.click(screen.getByText('Next')); // review → edit (re-entry 1 of 1)
  expect(await heading('edit')).toBeTruthy();
  await user.click(screen.getByText('Next')); // edit → review
  await user.click(screen.getByText('Next')); // review → loop used up → end
  expect(await heading('end')).toBeTruthy();
});

test('a reload resumes on the branched path and Back still follows it', async () => {
  const user = userEvent.setup();
  const first = render(
    <ArtisanForm scheme={plans} onSubmit={() => {}} persistKey="flow" />,
  );
  await type(user, 'plan', 'free');
  await user.click(screen.getByText('Next')); // plan → review
  await heading('review');
  first.unmount();

  expect(
    JSON.parse(localStorage.getItem('artisanform:flow') ?? '{}').history,
  ).toEqual(['plan']);
  render(<ArtisanForm scheme={plans} onSubmit={() => {}} persistKey="flow" />);
  expect(await heading('review')).toBeTruthy();
  await user.click(screen.getByText('Previous'));
  expect(await heading('plan')).toBeTruthy();
});

test('a schema without transitions keeps the linear behavior and writes no history', async () => {
  const user = userEvent.setup();
  const linear = defineForm({
    schemaVersion: 1,
    id: 'linear',
    steps: [step('a'), step('b'), step('c')],
  });
  const onSubmit = mock((_: unknown) => {});
  render(<ArtisanForm scheme={linear} onSubmit={onSubmit} persistKey="lin" />);
  await user.click(screen.getByText('Next'));
  await heading('b');
  await user.click(screen.getByText('Previous'));
  expect(await heading('a')).toBeTruthy();
  await waitFor(() =>
    expect(
      JSON.parse(localStorage.getItem('artisanform:lin') ?? '{}'),
    ).not.toHaveProperty('history'),
  );
});
