import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Yup from 'yup';
import type { FormSchema } from '../../../schema/legacy/types';
import TextInput from '../../inputs/Text/Text';
import StandaloneForm from '../../StandaloneForm/StandaloneForm';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const rows: FormSchema = {
  steps: [
    {
      title: 'Team',
      fields: [
        {
          type: 'array',
          name: 'people',
          label: 'People',
          itemFields: [
            { type: 'text', name: 'name', label: 'Name', required: true },
          ],
        },
      ],
    },
  ],
};

test('removing a middle row keeps the other rows and their errors aligned', async () => {
  const user = userEvent.setup();
  const onSubmit = mock(() => {});
  render(<ArtisanForm scheme={rows} onSubmit={onSubmit} />);
  for (let i = 0; i < 3; i++) await user.click(screen.getByText('Add another'));
  const names = () => screen.getAllByLabelText('Name') as HTMLInputElement[];
  await user.type(names()[0], 'Ana');
  await user.type(names()[2], 'Zoe');
  await user.click(screen.getByText('Finish')); // row 2 is empty -> error
  expect(await screen.findByText('Required field')).toBeTruthy();

  await user.click(screen.getByLabelText('Remove item 2'));
  expect(names().map((n) => n.value)).toEqual(['Ana', 'Zoe']);
  await waitFor(() => expect(screen.queryByText('Required field')).toBeNull());
  await user.click(screen.getByText('Finish'));
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith({
      people: [{ name: 'Ana' }, { name: 'Zoe' }],
    }),
  );
});

test('typed numbers are submitted as numbers', async () => {
  const user = userEvent.setup();
  const onSubmit = mock(() => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [
          {
            title: 'S',
            fields: [{ type: 'number', name: 'age', label: 'Age' }],
          },
        ],
      }}
    />,
  );
  await user.type(screen.getByLabelText('Age'), '42');
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ age: 42 }));
});

test('onChange fires per change with all values, not on mount', async () => {
  const user = userEvent.setup();
  const onChange = mock(() => {});
  render(
    <ArtisanForm
      onSubmit={() => {}}
      onChange={onChange}
      scheme={{
        steps: [
          { title: 'S', fields: [{ type: 'text', name: 'a', label: 'A' }] },
        ],
      }}
    />,
  );
  expect(onChange).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('A'), 'xy');
  expect(onChange).toHaveBeenCalledTimes(2);
  expect(onChange).toHaveBeenLastCalledWith({ a: 'xy' });
});

test('an ordinary rerender keeps what the user typed', async () => {
  const user = userEvent.setup();
  const scheme: FormSchema = {
    steps: [{ title: 'S', fields: [{ type: 'text', name: 'a', label: 'A' }] }],
  };
  const { rerender } = render(
    <ArtisanForm scheme={scheme} onSubmit={() => {}} />,
  );
  await user.type(screen.getByLabelText('A'), 'keep');
  rerender(<ArtisanForm scheme={scheme} onSubmit={() => {}} className="x" />);
  expect((screen.getByLabelText('A') as HTMLInputElement).value).toBe('keep');
});

test('a step that disappears while active moves the wizard to a valid step', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      onSubmit={() => {}}
      stepTypes={{
        flip: {
          render: (ctx) => (
            <button
              type="button"
              onClick={() => ctx.setFieldValue('mode', 'off')}
            >
              Flip
            </button>
          ),
        },
      }}
      scheme={{
        steps: [
          {
            title: 'First',
            fields: [
              { type: 'text', name: 'mode', label: 'Mode', defaultValue: 'on' },
            ],
          },
          {
            title: 'Middle',
            kind: 'flip',
            showIf: { field: 'mode', equals: 'on' },
          },
          { title: 'Last', fields: [{ type: 'text', name: 'l', label: 'L' }] },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  expect(await screen.findByRole('heading', { name: 'Middle' })).toBeTruthy();
  await user.click(screen.getByText('Flip'));
  expect(await screen.findByRole('heading', { name: 'Last' })).toBeTruthy();
});

test('a second click on "Next" while beforeNext runs does not run it twice', async () => {
  const user = userEvent.setup();
  let release: () => void = () => {};
  const beforeNext = mock(
    () => new Promise<undefined>((r) => (release = () => r(undefined))),
  );
  render(
    <ArtisanForm
      onSubmit={() => {}}
      scheme={{
        steps: [
          {
            title: 'One',
            beforeNext,
            fields: [{ type: 'text', name: 'a', label: 'A' }],
          },
          { title: 'Two', fields: [{ type: 'text', name: 'b', label: 'B' }] },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(screen.getByText('Next'));
  expect(beforeNext).toHaveBeenCalledTimes(1);
  release();
  expect(await screen.findByRole('heading', { name: 'Two' })).toBeTruthy();
});

test('standalone inputs work inside StandaloneForm with Yup rules', async () => {
  const user = userEvent.setup();
  const onSubmit = mock(() => {});
  render(
    <StandaloneForm
      initialValues={{ name: '' }}
      schema={{ name: Yup.string().required('Name is required') }}
      onSubmit={onSubmit}
    >
      <TextInput id="name" name="name" label="Name" />
      <button type="submit">Send</button>
    </StandaloneForm>,
  );
  await user.click(screen.getByText('Send'));
  expect(await screen.findByText('Name is required')).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.click(screen.getByText('Send'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Ana' }));
});
