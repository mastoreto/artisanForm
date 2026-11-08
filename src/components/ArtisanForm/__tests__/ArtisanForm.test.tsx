import { afterEach, expect, mock, test } from 'bun:test';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormSchema } from '../../../schema/legacy/types';
import type { StepContext } from '../../steps/registry';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const scheme: FormSchema = {
  steps: [
    {
      title: 'Step one',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true, min: 3 },
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'Place',
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
          label: 'Topics',
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

test('blocks "Next" while the current step has errors', async () => {
  const { user } = setup();
  await user.click(screen.getByText('Next'));
  expect(await screen.findByText('Required field')).toBeTruthy();
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
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.click(screen.getByText('Next'));
  expect(await screen.findByRole('heading', { name: 'Step two' })).toBeTruthy();

  await user.click(screen.getByText('Previous'));
  expect(await screen.findByRole('heading', { name: 'Step one' })).toBeTruthy();
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ana');
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Step two' });

  // Radio is required: submit is blocked until a plan is chosen.
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Required field')).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();

  await user.click(screen.getByText('Pro'));
  await user.click(screen.getByText('A'));
  await user.click(screen.getByText('B'));
  await user.click(screen.getByText('A')); // toggle off
  expect(screen.getByText('B').getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('A').getAttribute('aria-pressed')).toBe('false');

  await user.click(screen.getByText('Finish'));
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
  await user.type(a.getByLabelText('Name'), 'Ana');
  await user.click(a.getByText('Next'));
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
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Zoe');
  expect(onStepChange).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Name'), 'x');
  await waitFor(() => expect(onChange).toHaveBeenCalled());
  expect((onChange.mock.calls.at(-1) as unknown[])[0]).toMatchObject({
    name: 'Zoex',
  });
  await user.click(screen.getByText('Next'));
  await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
});

test('"Finish" stays disabled while onSubmit is pending', async () => {
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
  const button = () => screen.getByText('Finish') as HTMLButtonElement;
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
  const nav = screen.getByRole('navigation', { name: 'Progress' });
  expect(nav.querySelector('[aria-current="step"]')?.textContent).toContain(
    'Step one',
  );
  await user.click(screen.getByText('Next'));
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText('Name')),
  );
  expect(screen.getByLabelText('Name').getAttribute('aria-invalid')).toBe(
    'true',
  );
});

test('radio group is exposed with radio roles', async () => {
  const { user } = setup();
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.click(screen.getByText('Next'));
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
      labels={{ next: 'Continue', required: 'Mandatory' }}
    />,
  );
  await user.click(screen.getByText('Continue'));
  expect(await screen.findByText('Mandatory')).toBeTruthy();
  expect(screen.queryByText('Next')).toBeNull();
});

test('className props reach the rendered elements', () => {
  const { container } = render(
    <ArtisanForm scheme={scheme} onSubmit={() => {}} className="my-form" />,
  );
  expect(container.querySelector('form.my-form')).toBeTruthy();
});

const conditional: FormSchema = {
  steps: [
    {
      title: 'Account',
      fields: [
        {
          type: 'radio',
          name: 'kind',
          label: 'Kind',
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
        },
        {
          type: 'text',
          name: 'company',
          label: 'Company name',
          required: true,
          showIf: { field: 'kind', equals: 'company' },
        },
        { type: 'password', name: 'pw', label: 'Password' },
        { type: 'password', name: 'pw2', label: 'Repeat', sameAs: 'pw' },
      ],
    },
    {
      title: 'Company data',
      showIf: { field: 'kind', equals: 'company' },
      fields: [{ type: 'text', name: 'tax', label: 'Tax id', required: true }],
    },
    { title: 'Done', fields: [{ type: 'text', name: 'note', label: 'Note' }] },
  ],
};

test('conditional field: hidden unless condition holds, and not submitted', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={{ steps: [conditional.steps[0]] }}
      onSubmit={onSubmit}
    />,
  );
  expect(screen.queryByLabelText('Company name')).toBeNull();
  await user.click(screen.getByText('Person'));
  await user.click(screen.getByText('Finish')); // hidden required field must not block
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('company');

  await user.click(screen.getByText('Company'));
  expect(await screen.findByLabelText('Company name')).toBeTruthy();
});

test('conditional step is skipped and sameAs blocks mismatched values', async () => {
  const user = userEvent.setup();
  render(<ArtisanForm scheme={conditional} onSubmit={() => {}} />);
  await user.type(screen.getByLabelText('Password'), 'abc');
  await user.type(screen.getByLabelText('Repeat'), 'abx');
  await user.click(screen.getByText('Person'));
  await user.click(screen.getByText('Next'));
  expect(await screen.findByText('The values do not match')).toBeTruthy();

  await user.clear(screen.getByLabelText('Repeat'));
  await user.type(screen.getByLabelText('Repeat'), 'abc');
  await user.click(screen.getByText('Next'));
  // "Company data" is skipped for kind=person.
  expect(await screen.findByRole('heading', { name: 'Done' })).toBeTruthy();
});

test('dynamicSelect loads dependent options asynchronously', async () => {
  const user = userEvent.setup();
  const load = mock(async (parent: string) => [
    { value: `${parent}-1`, label: `City of ${parent}` },
  ]);
  render(
    <ArtisanForm
      onSubmit={() => {}}
      scheme={{
        steps: [
          {
            title: 'Async',
            fields: [
              {
                type: 'dynamicSelect',
                name: 'country',
                dependentName: 'city',
                label: 'Place',
                options: [
                  { value: 'ar', label: 'Argentina' },
                  { value: 'cl', label: 'Chile' },
                ],
                loadDependentOptions: load,
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(await screen.findByText('City of ar')).toBeTruthy();
  await user.selectOptions(screen.getAllByRole('combobox')[0], 'cl');
  expect(await screen.findByText('City of cl')).toBeTruthy();
  expect(load).toHaveBeenCalledWith('cl');
});

test('dynamicSelect shows an error when loading fails', async () => {
  render(
    <ArtisanForm
      onSubmit={() => {}}
      scheme={{
        steps: [
          {
            title: 'Async',
            fields: [
              {
                type: 'dynamicSelect',
                name: 'country',
                dependentName: 'city',
                label: 'Place',
                options: [{ value: 'ar', label: 'Argentina' }],
                loadDependentOptions: () => Promise.reject(new Error('x')),
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(await screen.findByRole('alert')).toBeTruthy();
});

test('persistKey restores the draft (without passwords) and clears it on submit', async () => {
  localStorage.clear();
  const user = userEvent.setup();
  const draftScheme: FormSchema = {
    steps: [
      {
        title: 'One',
        fields: [
          { type: 'text', name: 'name', label: 'Name' },
          { type: 'password', name: 'pw', label: 'Password' },
        ],
      },
      { title: 'Two', fields: [{ type: 'text', name: 'x', label: 'X' }] },
    ],
  };
  const first = render(
    <ArtisanForm scheme={draftScheme} onSubmit={() => {}} persistKey="t" />,
  );
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.type(screen.getByLabelText('Password'), 'secret');
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Two' });
  expect(localStorage.getItem('artisanform:t')).not.toContain('secret');
  first.unmount();

  render(
    <ArtisanForm scheme={draftScheme} onSubmit={() => {}} persistKey="t" />,
  );
  expect(await screen.findByRole('heading', { name: 'Two' })).toBeTruthy();
  await user.click(screen.getByText('Previous'));
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ana');
  expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(
    '',
  );

  await user.click(screen.getByText('Next'));
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(localStorage.getItem('artisanform:t')).toBeNull());
});

test('custom field types plug in through the `fields` registry', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [
          {
            title: 'Custom',
            fields: [{ type: 'stars', name: 'rating', label: 'Rating' }],
          },
        ],
      }}
      fields={{
        stars: {
          initialValues: (f) => ({ [f.name]: 3 }),
          rules: () => ({}),
          render: (f) => <span>{`custom ${f.label}`}</span>,
        },
      }}
    />,
  );
  expect(screen.getByText('custom Rating')).toBeTruthy();
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ rating: 3 });
});

test('checkbox and switch hold booleans; required means "must be checked"', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [
          {
            title: 'Booleans',
            fields: [
              {
                type: 'checkbox',
                name: 'terms',
                label: 'I accept',
                required: true,
              },
              { type: 'switch', name: 'news', label: 'News' },
            ],
          },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Required field')).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();

  await user.click(screen.getByLabelText('I accept'));
  await user.click(screen.getByRole('switch', { name: 'News' }));
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ terms: true, news: true });
});

test('tel, url, date limits and native attributes', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      onSubmit={() => {}}
      scheme={{
        steps: [
          {
            title: 'Native',
            fields: [
              { type: 'tel', name: 'phone', label: 'Tel' },
              { type: 'url', name: 'site', label: 'Website' },
              {
                type: 'date',
                name: 'when',
                label: 'When',
                minDate: '2030-01-01',
              },
              {
                type: 'text',
                name: 'code',
                label: 'Code',
                maxLength: 4,
                autoComplete: 'one-time-code',
                readOnly: false,
              },
            ],
          },
        ],
      }}
    />,
  );
  const code = screen.getByLabelText('Code') as HTMLInputElement;
  expect(code.maxLength).toBe(4);
  expect(code.autocomplete).toBe('one-time-code');
  expect((screen.getByLabelText('Tel') as HTMLInputElement).type).toBe('tel');

  await user.type(screen.getByLabelText('Tel'), 'abc');
  await user.type(screen.getByLabelText('Website'), 'nope');
  await user.type(screen.getByLabelText('When'), '2020-01-01');
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Invalid phone number')).toBeTruthy();
  expect(screen.getByText('Invalid URL')).toBeTruthy();
  expect(screen.getByText('From 2030-01-01')).toBeTruthy();
});

test('beforeNext blocks with its error; throwing also blocks', async () => {
  const user = userEvent.setup();
  let allow = false;
  render(
    <ArtisanForm
      onSubmit={() => {}}
      scheme={{
        steps: [
          {
            title: 'Gate',
            fields: [{ type: 'text', name: 'a', label: 'A' }],
            beforeNext: async () =>
              allow ? undefined : { error: 'Service unavailable' },
          },
          { title: 'After', fields: [{ type: 'text', name: 'b', label: 'B' }] },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  expect(await screen.findByText('Service unavailable')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Gate' })).toBeTruthy();

  allow = true;
  await user.click(screen.getByText('Next'));
  expect(await screen.findByRole('heading', { name: 'After' })).toBeTruthy();
  expect(screen.queryByText('Service unavailable')).toBeNull();
});

test('custom step reads context, drives navigation and honors controls and onEnter', async () => {
  const user = userEvent.setup();
  const onEnter = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={() => {}}
      scheme={{
        steps: [
          { title: 'First', fields: [{ type: 'text', name: 'a', label: 'A' }] },
          {
            title: 'Custom',
            kind: 'custom',
            controls: { hidden: true },
            onEnter,
            render: (ctx: StepContext) => (
              <button type="button" onClick={() => ctx.back()}>
                {`custom step ${ctx.index + 1}/${ctx.total}`}
              </button>
            ),
          },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  const custom = await screen.findByText('custom step 2/2');
  expect(onEnter).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Finish')).toBeNull();
  expect(screen.queryByText('Previous')).toBeNull();
  await user.click(custom);
  expect(await screen.findByRole('heading', { name: 'First' })).toBeTruthy();
});

test('a failing onSubmit shows an error and can be retried', async () => {
  const user = userEvent.setup();
  let fail = true;
  const onSubmit = mock(async () => {
    if (fail) throw new Error('Boom');
  });
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [
          { title: 'S', fields: [{ type: 'text', name: 'a', label: 'A' }] },
        ],
      }}
    />,
  );
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Boom')).toBeTruthy();
  fail = false;
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText('Boom')).toBeNull());
});

const withResult = (extra: Record<string, unknown> = {}): FormSchema => ({
  steps: [
    {
      title: 'Data',
      fields: [
        { type: 'text', name: 'name', label: 'Name' },
        {
          type: 'radio',
          name: 'plan',
          label: 'Plan',
          options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Professional' },
          ],
        },
        { type: 'password', name: 'pw', label: 'Password' },
      ],
    },
    { title: 'Review', kind: 'review' },
    { title: 'End', kind: 'result', message: 'Thanks!', ...extra },
  ],
});

test('review step summarizes values (secrets masked) and edit goes back', async () => {
  const user = userEvent.setup();
  render(<ArtisanForm scheme={withResult()} onSubmit={() => {}} />);
  await user.type(screen.getByLabelText('Name'), 'Ana');
  await user.type(screen.getByLabelText('Password'), 'topsecret');
  await user.click(screen.getByText('Professional'));
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Review' });
  expect(screen.getByText('Ana')).toBeTruthy();
  expect(screen.getByText('Professional')).toBeTruthy();
  expect(screen.queryByText('topsecret')).toBeNull();
  expect(screen.getByText('••••••')).toBeTruthy();

  await user.click(screen.getByRole('button', { name: /Edit/ }));
  expect(await screen.findByRole('heading', { name: 'Data' })).toBeTruthy();
});

test('result step: success after onSubmit; error shows retry and recovers', async () => {
  const user = userEvent.setup();
  let fail = true;
  const onSubmit = mock(async () => {
    if (fail) throw new Error('Server down');
  });
  render(<ArtisanForm scheme={withResult()} onSubmit={onSubmit} />);
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Review' });
  await user.click(screen.getByText('Finish'));

  expect(await screen.findByText('Server down')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'End' })).toBeTruthy();
  fail = false;
  await user.click(screen.getByText('Retry'));
  expect(await screen.findByText('Thanks!')).toBeTruthy();
  expect(onSubmit).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Finish')).toBeNull();
});

test('terms step shows the text and requires acceptance', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      scheme={{
        steps: [
          {
            title: 'Terms',
            kind: 'terms',
            content: 'Terms text',
            href: 'https://example.com/terms',
          },
        ],
      }}
    />,
  );
  expect(screen.getByText('Terms text')).toBeTruthy();
  expect(
    screen
      .getByRole('link', { name: 'Read the full document' })
      .getAttribute('href'),
  ).toBe('https://example.com/terms');

  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('Required field')).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();

  await user.click(screen.getByLabelText('I accept the terms and conditions'));
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toEqual({ termsAccepted: true });
});
