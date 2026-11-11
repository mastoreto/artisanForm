import { afterEach, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defineForm } from '../../../schema/contract/define';
import type { FormSchema } from '../../../schema/legacy/types';
import type { StepContext } from '../../steps/registry';
import type {
  ArtisanControlsProps,
  ArtisanFieldWrapperProps,
  ArtisanInputProps,
  ArtisanStepperProps,
} from '../../ui/types';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const legacy: FormSchema = {
  steps: [
    {
      title: 'Data',
      fields: [
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'text', name: 'nick', label: 'Nick', width: 'half' },
      ],
    },
    { title: 'Done', kind: 'result', message: 'Saved' },
  ],
};

const v1 = (ui: Record<string, unknown> = {}, stepUi = {}, fieldUi = {}) =>
  defineForm({
    schemaVersion: 1,
    id: 'ui-form',
    ui,
    steps: [
      {
        id: 'data',
        type: 'form',
        title: 'Data',
        ui: stepUi,
        fields: [
          { type: 'text', name: 'a', label: 'A', ui: fieldUi },
          { type: 'text', name: 'b', label: 'B', ui: { span: 1 } },
        ],
      },
    ],
  });

// ---- default UI and its semantic configuration ----

test('the default UI emits stable af-* classes and the form defaults', () => {
  const { container } = render(
    <ArtisanForm scheme={v1()} onSubmit={() => {}} />,
  );
  const root = container.querySelector('form') as HTMLFormElement;
  expect(root.className).toContain('af-root');
  expect(root.dataset.density).toBe('comfortable');
  expect(root.dataset.labelPosition).toBe('top');
  expect(root.dataset.layout).toBe('vertical');
  expect(container.querySelector('input')?.className).toContain('af-input');
});

test('ui.density, labelPosition and layout reach the root as data attributes', () => {
  const { container } = render(
    <ArtisanForm
      scheme={v1({
        density: 'compact',
        labelPosition: 'left',
        layout: 'horizontal',
      })}
      onSubmit={() => {}}
    />,
  );
  const root = container.querySelector('form') as HTMLFormElement;
  expect(root.dataset.density).toBe('compact');
  expect(root.dataset.labelPosition).toBe('left');
  expect(root.dataset.layout).toBe('horizontal');
});

test('step columns and field span decide each cell; legacy width maps to span', () => {
  const cells = (scheme: Parameters<typeof ArtisanForm>[0]['scheme']) => {
    const { container, unmount } = render(
      <ArtisanForm scheme={scheme} onSubmit={() => {}} />,
    );
    const spans = Array.from(
      container.querySelectorAll<HTMLElement>('.af-field-cell'),
    ).map((c) => c.dataset.span);
    unmount();
    return spans;
  };
  expect(cells(v1())).toEqual(['2', '1']); // default: 2 columns, span from the field
  expect(cells(v1({}, { columns: 1 }))).toEqual(['2', '2']); // 1 column: everything full
  expect(cells(legacy)).toEqual(['2', '1']); // width: 'half' ≡ span 1
});

test('classNames add to the defaults and unstyled drops them', () => {
  const { container, rerender } = render(
    <ArtisanForm
      scheme={legacy}
      onSubmit={() => {}}
      classNames={{ input: 'my-input', root: 'my-root' }}
    />,
  );
  const input = container.querySelector('input') as HTMLInputElement;
  expect(input.className).toContain('af-input');
  expect(input.className).toContain('my-input');
  rerender(
    <ArtisanForm
      scheme={legacy}
      onSubmit={() => {}}
      unstyled
      classNames={{ input: 'my-input' }}
    />,
  );
  const bare = container.querySelector('input') as HTMLInputElement;
  expect(bare.className).toBe('my-input');
  expect(container.querySelector('form')?.className ?? '').not.toContain('af-');
});

test('the stylesheet is plain, namespaced CSS: only .af-* selectors, no globals', () => {
  const css = readFileSync(
    join(import.meta.dir, '../../../styles/artisanform.css'),
    'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]*\{/g, '')
    .replace(/@keyframes[^{]*\{[\s\S]*?\}\s*\}/g, '');
  const selectors = [...css.matchAll(/([^{}]+)\{/g)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  expect(selectors.length).toBeGreaterThan(50);
  for (const sel of selectors) expect(sel).toMatch(/^\.af-/);
  expect(css).not.toContain('@tailwind');
  expect(css).not.toContain('@apply');
});

// ---- replaceable components ----

test('a replacement input gets the neutral contract and the form still works', async () => {
  const user = userEvent.setup();
  const seen: ArtisanInputProps<string>[] = [];
  const MyText = (props: ArtisanInputProps<string>) => {
    seen.push(props);
    return (
      <input
        data-testid="custom"
        id={props.id}
        {...props.aria}
        value={props.value ?? ''}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        placeholder={props.placeholder}
      />
    );
  };
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      scheme={legacy}
      onSubmit={onSubmit}
      components={{ inputs: { text: MyText } }}
    />,
  );
  expect(screen.getAllByTestId('custom')).toHaveLength(2);
  // Blocked while the required field is empty: the error arrives as { code, message }.
  await user.click(screen.getByText('Finish'));
  await waitFor(() => {
    const last = seen.filter((p) => p.name === 'name').at(-1);
    expect(last?.error).toEqual({
      code: 'required',
      message: 'Required field',
    });
    expect(last?.aria['aria-invalid']).toBe(true);
  });
  // Focus lands on the first invalid custom control.
  expect(document.activeElement).toBe(screen.getAllByTestId('custom')[0]);
  await user.type(screen.getAllByTestId('custom')[0], 'Ana');
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Ana' });
  expect(seen[0].field.type).toBe('text');
  expect(seen[0].label).toBe('Name');
});

test('a replacement select, checkbox and number receive typed values', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      components={{
        inputs: {
          select: (p) => (
            <select
              aria-label={p.label}
              value={p.value}
              onChange={(e) => p.onChange(e.target.value)}
            >
              {p.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ),
          checkbox: (p) => (
            <input
              type="checkbox"
              aria-label={p.label}
              checked={p.value}
              onChange={(e) => p.onChange(e.target.checked)}
            />
          ),
          number: (p) => (
            <input
              type="number"
              aria-label={p.label}
              value={p.value}
              onChange={(e) => p.onChange(Number(e.target.value))}
            />
          ),
        },
      }}
      scheme={{
        steps: [
          {
            title: 'S',
            fields: [
              {
                type: 'select',
                name: 'color',
                label: 'Color',
                options: [
                  { value: 'r', label: 'Red' },
                  { value: 'g', label: 'Green' },
                ],
              },
              { type: 'checkbox', name: 'ok', label: 'OK' },
              { type: 'number', name: 'qty', label: 'Qty' },
            ],
          },
        ],
      }}
    />,
  );
  await user.selectOptions(screen.getByLabelText('Color'), 'g');
  await user.click(screen.getByLabelText('OK'));
  await user.type(screen.getByLabelText('Qty'), '7');
  await user.click(screen.getByText('Finish'));
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith({ color: 'g', ok: true, qty: 7 }),
  );
});

test('a FieldWrapper owns the label, description and error of every field', async () => {
  const user = userEvent.setup();
  const Wrapper = (p: ArtisanFieldWrapperProps) => (
    <div data-testid="wrap" data-invalid={p.invalid}>
      <b>{p.label}</b>
      {p.description && <i>{p.description}</i>}
      {p.children}
      {p.error && <em role="alert">{`${p.error.code}: ${p.error.message}`}</em>}
    </div>
  );
  render(
    <ArtisanForm
      onSubmit={() => {}}
      components={{ FieldWrapper: Wrapper }}
      scheme={{
        steps: [
          {
            title: 'S',
            fields: [
              {
                type: 'text',
                name: 'n',
                label: 'Nm',
                helperText: 'Help',
                required: true,
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(screen.getByText('Nm').tagName).toBe('B');
  expect(screen.getByText('Help').tagName).toBe('I');
  await user.click(screen.getByText('Finish'));
  expect(await screen.findByText('required: Required field')).toBeTruthy();
  expect(document.querySelectorAll('label').length).toBe(0); // the default label is skipped
});

test('a replacement Stepper and Controls drive the wizard through public props', async () => {
  const user = userEvent.setup();
  const stepper: ArtisanStepperProps[] = [];
  const Stepper = (p: ArtisanStepperProps) => {
    stepper.push(p);
    return (
      <p data-testid="stepper">
        {p.steps.map((s) => `${s.title}:${s.state}`).join(' | ')}
      </p>
    );
  };
  const Controls = (p: ArtisanControlsProps) => (
    <div>
      {!p.isFirst && (
        <button type="button" onClick={p.onPrevious}>
          Back
        </button>
      )}
      <button type="button" onClick={p.onNext} disabled={p.isSubmitting}>
        {p.isLast ? 'Send it' : 'Go on'}
      </button>
      {p.error && <span>{p.error}</span>}
    </div>
  );
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      components={{ Stepper, Controls }}
      scheme={{
        steps: [
          { title: 'One', fields: [{ type: 'text', name: 'a', label: 'A' }] },
          { title: 'Two', fields: [{ type: 'text', name: 'b', label: 'B' }] },
        ],
      }}
    />,
  );
  expect(screen.getByTestId('stepper').textContent).toBe(
    'One:current | Two:upcoming',
  );
  expect(screen.queryByText('Back')).toBeNull();
  await user.click(screen.getByText('Go on'));
  expect(await screen.findByTestId('stepper')).toBeTruthy();
  await waitFor(() =>
    expect(screen.getByTestId('stepper').textContent).toBe(
      'One:done | Two:current',
    ),
  );
  await user.click(screen.getByText('Send it'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(stepper.length).toBeGreaterThan(1);
});

// ---- extensions ----

test('a registered custom field type is resolved from a JSON schema', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  // JSON only names the type: the implementation is local.
  const json = JSON.parse(
    JSON.stringify(
      defineForm({
        schemaVersion: 1,
        id: 'json-form',
        steps: [
          {
            id: 's',
            type: 'form',
            title: 'S',
            fields: [
              { type: 'x-satisfaction', name: 'sat', label: 'Satisfaction' },
            ],
          },
        ],
      }),
    ),
  );
  render(
    <ArtisanForm
      scheme={json}
      onSubmit={onSubmit}
      fields={{
        satisfaction: {
          initialValues: (f) => ({ [f.name]: 3 }),
          rules: () => ({}),
          render: (f) => <p data-testid="sat">{`custom ${f.label}`}</p>,
        },
      }}
    />,
  );
  expect(screen.getByTestId('sat').textContent).toBe('custom Satisfaction');
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ sat: 3 }));
});

test('an incomplete registry entry fails early with its name', () => {
  const quiet = mock(() => {});
  const original = console.error;
  console.error = quiet;
  try {
    expect(() =>
      render(
        <ArtisanForm
          scheme={legacy}
          onSubmit={() => {}}
          fields={{ broken: { render: () => null } as never }}
        />,
      ),
    ).toThrow('Field type "broken" is incomplete');
    expect(() =>
      render(
        <ArtisanForm
          scheme={legacy}
          onSubmit={() => {}}
          stepTypes={{ hollow: {} as never }}
        />,
      ),
    ).toThrow('Step kind "hollow" is incomplete');
  } finally {
    console.error = original;
  }
});

test('an unknown field type renders a visible alert, not a crash', () => {
  render(
    <ArtisanForm
      onSubmit={() => {}}
      scheme={{
        steps: [
          { title: 'S', fields: [{ type: 'mystery', name: 'm', label: 'M' }] },
        ],
      }}
    />,
  );
  expect(screen.getByRole('alert').textContent).toContain('Unknown field type');
});

test('custom steps use a stable API: owned writes, errors, next; other writes throw', async () => {
  const user = userEvent.setup();
  let ctx: StepContext | undefined;
  const onSubmit = mock((_: unknown) => {});
  render(
    <ArtisanForm
      onSubmit={onSubmit}
      stepTypes={{
        verify: {
          render: (c) => {
            ctx = c;
            return (
              <button
                type="button"
                onClick={() => c.api.setValue('code', 'ok')}
              >
                Verify
              </button>
            );
          },
        },
      }}
      scheme={{
        steps: [
          { title: 'Check', kind: 'verify', resultName: 'code' },
          { title: 'Fin', kind: 'result', message: 'Done' },
        ],
      }}
    />,
  );
  expect(ctx?.api.step).toMatchObject({
    title: 'Check',
    kind: 'verify',
    index: 0,
    total: 2,
  });
  expect(() => ctx?.api.setValue('somethingElse', 1)).toThrow(
    'cannot write "somethingElse"',
  );
  await user.click(screen.getByText('Verify'));
  await waitFor(() => expect(ctx?.api.values.code).toBe('ok'));
  await user.click(screen.getByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ code: 'ok' }));
});

test('a replaced select inside a FieldWrapper shows its label once', () => {
  const Wrapper = (p: ArtisanFieldWrapperProps) => (
    <div>
      <b>{p.label}</b>
      {p.children}
    </div>
  );
  const Select = ({ id, value, onChange }: ArtisanInputProps<string>) => (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="a">A</option>
    </select>
  );
  render(
    <ArtisanForm
      onSubmit={() => {}}
      components={{ FieldWrapper: Wrapper, inputs: { select: Select } }}
      scheme={{
        steps: [
          {
            title: 'S',
            fields: [
              {
                type: 'select',
                name: 's',
                label: 'Zone',
                options: [{ value: 'a', label: 'A' }],
              },
            ],
          },
        ],
      }}
    />,
  );
  expect(screen.getAllByText('Zone')).toHaveLength(1);
});
