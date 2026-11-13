import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OnUnresolved } from '../../../engine/extensions';
import { defineForm } from '../../../schema/contract/define';
import { ArtisanSchemaError } from '../../../schema/contract/errors';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const form = defineForm({
  schemaVersion: 1,
  id: 'unresolved',
  steps: [
    {
      id: 'a',
      type: 'form',
      title: 'A',
      hooks: { onEnter: 'track' },
      fields: [{ type: 'text', name: 'name', label: 'Name' }],
    },
    { id: 'done', type: 'result', title: 'Done', message: 'Saved' },
  ],
});

// The default is unchanged: a name nobody provides fails with a stable code.
test('without onUnresolved a missing reference still fails with unresolved-reference', () => {
  const silence = console.error;
  console.error = () => {};
  try {
    expect(() =>
      render(<ArtisanForm scheme={form} onSubmit={() => {}} />),
    ).toThrow(ArtisanSchemaError);
    try {
      render(<ArtisanForm scheme={form} onSubmit={() => {}} />);
    } catch (e) {
      expect((e as ArtisanSchemaError).issues[0]).toMatchObject({
        code: 'unresolved-reference',
        path: 'steps[0].hooks.onEnter',
      });
    }
  } finally {
    console.error = silence;
  }
});

test("returning 'ignore' renders the form without the missing hook", async () => {
  const seen: unknown[] = [];
  const onUnresolved: OnUnresolved = (ref) => {
    seen.push(ref);
    return 'ignore';
  };
  const onSubmit = mock((_: unknown) => {});
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={form}
      onUnresolved={onUnresolved}
      onSubmit={onSubmit}
    />,
  );
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Saved')).toBeTruthy();
  expect(seen).toEqual([
    { group: 'hooks', id: 'track', path: 'steps[0].hooks.onEnter' },
  ]);
});

test('returning anything else keeps the failure, and the callback still saw the reference', () => {
  const onUnresolved = mock((_: unknown) => undefined);
  const silence = console.error;
  console.error = () => {};
  try {
    expect(() =>
      render(
        <ArtisanForm
          scheme={form}
          onUnresolved={onUnresolved}
          onSubmit={() => {}}
        />,
      ),
    ).toThrow(ArtisanSchemaError);
  } finally {
    console.error = silence;
  }
  expect(onUnresolved).toHaveBeenCalled();
});

test("only the exact 'ignore' ignores: other values (from untyped JavaScript) keep the failure", () => {
  const silence = console.error;
  console.error = () => {};
  try {
    for (const value of [true, 'skip', 1, 'IGNORE']) {
      const onUnresolved = (() => value) as unknown as OnUnresolved;
      expect(() =>
        render(
          <ArtisanForm
            scheme={form}
            onUnresolved={onUnresolved}
            onSubmit={() => {}}
          />,
        ),
      ).toThrow(ArtisanSchemaError);
      cleanup();
    }
  } finally {
    console.error = silence;
  }
});

test('a reference that IS registered never reaches the callback', () => {
  const onUnresolved = mock((_: unknown) => 'ignore' as const);
  render(
    <ArtisanForm
      scheme={form}
      extensions={{ hooks: { track: () => {} } }}
      onUnresolved={onUnresolved}
      onSubmit={() => {}}
    />,
  );
  expect(onUnresolved).not.toHaveBeenCalled();
});
