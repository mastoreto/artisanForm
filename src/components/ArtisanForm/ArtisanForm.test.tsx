import { afterEach, expect, mock, test } from 'bun:test';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArtisanForm from './ArtisanForm';
import type { FormSchema } from './types';

afterEach(cleanup);

const scheme: FormSchema = {
  steps: [
    {
      title: 'Step one',
      fields: [
        { type: 'text', name: 'name', label: 'Nombre', required: true, min: 3 },
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'Lugar',
          options: [
            { value: 'ar', label: 'Argentina' },
            { value: 'cl', label: 'Chile' },
          ],
          dependentOptions: {
            ar: [{ value: 'bsas', label: 'Buenos Aires' }],
            cl: [{ value: 'scl', label: 'Santiago' }],
          },
        },
      ],
    },
    {
      title: 'Step two',
      fields: [
        {
          type: 'radio',
          name: 'plan',
          label: 'Plan',
          required: true,
          options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
          ],
        },
        {
          type: 'check',
          name: 'topics',
          label: 'Temas',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
      ],
    },
  ],
};

const setup = () => {
  const onSubmit = mock(() => {});
  render(<ArtisanForm scheme={scheme} onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
};

test('blocks "Siguiente" while the current step has errors', async () => {
  const { user } = setup();
  await user.click(screen.getByText('Siguiente'));
  expect(await screen.findByText('Campo requerido')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Step one' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Step two' })).toBeNull();
});

test('dependent select follows the parent value', async () => {
  const { user } = setup();
  const [parent] = screen.getAllByRole('combobox');
  await user.selectOptions(parent, 'cl');
  await waitFor(() => expect(screen.getByText('Santiago')).toBeTruthy());
  expect(screen.queryByText('Buenos Aires')).toBeNull();
});

test('full flow: advance, go back, submit with all values', async () => {
  const { user, onSubmit } = setup();
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.click(screen.getByText('Siguiente'));
  expect(await screen.findByRole('heading', { name: 'Step two' })).toBeTruthy();

  await user.click(screen.getByText('Anterior'));
  expect(await screen.findByRole('heading', { name: 'Step one' })).toBeTruthy();
  expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
    'Ana',
  );
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'Step two' });

  // Radio is required: submit is blocked until a plan is chosen.
  await user.click(screen.getByText('Finalizar'));
  expect(await screen.findByText('Campo requerido')).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();

  await user.click(screen.getByText('Pro'));
  await user.click(screen.getByText('A'));
  await user.click(screen.getByText('B'));
  await user.click(screen.getByText('A')); // toggle off
  expect(screen.getByText('B').getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('A').getAttribute('aria-pressed')).toBe('false');

  await user.click(screen.getByText('Finalizar'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect((onSubmit.mock.calls[0] as unknown[])[0]).toEqual({
    name: 'Ana',
    country: 'ar',
    city: 'bsas',
    plan: 'pro',
    topics: ['b'],
  });
});

test('two forms on the same page keep independent steps', async () => {
  const user = userEvent.setup();
  render(
    <>
      <div data-testid="a">
        <ArtisanForm scheme={scheme} onSubmit={() => {}} />
      </div>
      <div data-testid="b">
        <ArtisanForm scheme={scheme} onSubmit={() => {}} />
      </div>
    </>,
  );
  const a = within(screen.getByTestId('a'));
  const b = within(screen.getByTestId('b'));
  await user.type(a.getByLabelText('Nombre'), 'Ana');
  await user.click(a.getByText('Siguiente'));
  expect(await a.findByRole('heading', { name: 'Step two' })).toBeTruthy();
  expect(b.getByRole('heading', { name: 'Step one' })).toBeTruthy();
});

test('initialValues, onChange and onStepChange', async () => {
  const user = userEvent.setup();
  const onChange = mock((_: unknown) => {});
  const onStepChange = mock((_: number) => {});
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={() => {}}
      initialValues={{ name: 'Zoe' }}
      onChange={onChange}
      onStepChange={onStepChange}
    />,
  );
  expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
    'Zoe',
  );
  expect(onStepChange).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Nombre'), 'x');
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect((onChange.mock.calls.at(-1) as unknown[])[0]).toMatchObject({
    name: 'Zoex',
  });
  await user.click(screen.getByText('Siguiente'));
  await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
});

test('"Finalizar" stays disabled while onSubmit is pending', async () => {
  const user = userEvent.setup();
  let release = () => {};
  const onSubmit = () => new Promise<void>((r) => (release = r));
  render(
    <ArtisanForm
      scheme={{ steps: [scheme.steps[0]] }}
      onSubmit={onSubmit}
      initialValues={{ name: 'Zoe' }}
    />,
  );
  const button = () => screen.getByText('Finalizar') as HTMLButtonElement;
  await user.click(button());
  await waitFor(() => expect(button().disabled).toBe(true));
  release();
  await waitFor(() => expect(button().disabled).toBe(false));
});

test('controlled step prop moves the wizard', async () => {
  const noop = () => {};
  const { rerender } = render(
    <ArtisanForm scheme={scheme} onSubmit={noop} step={0} />,
  );
  expect(screen.getByRole('heading', { name: 'Step one' })).toBeTruthy();
  rerender(<ArtisanForm scheme={scheme} onSubmit={noop} step={1} />);
  expect(await screen.findByRole('heading', { name: 'Step two' })).toBeTruthy();
});

test('progress indicator and focus on the first invalid field', async () => {
  const { user } = setup();
  const nav = screen.getByRole('navigation', { name: 'Progreso' });
  expect(nav.querySelector('[aria-current="step"]')?.textContent).toContain(
    'Step one',
  );
  await user.click(screen.getByText('Siguiente'));
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText('Nombre')),
  );
  expect(screen.getByLabelText('Nombre').getAttribute('aria-invalid')).toBe(
    'true',
  );
});

test('radio group is exposed with radio roles', async () => {
  const { user } = setup();
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'Step two' });
  expect(screen.getByRole('radiogroup', { name: 'Plan' })).toBeTruthy();
  await user.click(screen.getByRole('radio', { name: 'Pro' }));
  expect(
    screen.getByRole('radio', { name: 'Pro' }).getAttribute('aria-checked'),
  ).toBe('true');
});

test('labels override buttons and validation messages', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={() => {}}
      labels={{ next: 'Next', required: 'Required' }}
    />,
  );
  await user.click(screen.getByText('Next'));
  expect(await screen.findByText('Required')).toBeTruthy();
  expect(screen.queryByText('Siguiente')).toBeNull();
});
