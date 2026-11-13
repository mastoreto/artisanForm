import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { SchemaIssue } from '../../../schema';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const codes = (spy: ReturnType<typeof mock>): string[] => {
  const issues = (spy.mock.calls.at(-1)?.[0] ?? []) as SchemaIssue[];
  return issues.map((i) => `${i.severity}:${i.code}@${i.path}`);
};

const one = (fields: unknown[], extra: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id: 'f',
  steps: [{ id: 'a', type: 'form', title: 'A', fields }],
  ...extra,
});

test('an invalid schema does not throw: the form shows a message and reports why', () => {
  const onSchemaIssues = mock((_: SchemaIssue[]) => {});
  expect(() =>
    render(
      <ArtisanForm
        scheme={{ schemaVersion: 1, id: 'f', steps: [] } as never}
        onSchemaIssues={onSchemaIssues}
        showSchemaIssues
        onSubmit={() => {}}
      />,
    ),
  ).not.toThrow();
  const alert = screen.getByRole('alert');
  expect(alert.textContent).toContain('This form is not available right now');
  expect(alert.textContent).toContain('empty-steps');
  expect(codes(onSchemaIssues)).toEqual(['error:empty-steps@steps']);
});

test.each([null, undefined, 42, 'x', { steps: 'no' }])(
  'whatever it is given (%p) the render survives',
  (input) => {
    expect(() =>
      render(<ArtisanForm scheme={input as never} onSubmit={() => {}} />),
    ).not.toThrow();
    expect(screen.getByRole('alert')).toBeTruthy();
    cleanup();
  },
);

test('without details only the generic message shows (what an end user sees)', () => {
  render(
    <ArtisanForm
      scheme={{ schemaVersion: 1, id: 'f', steps: [] } as never}
      showSchemaIssues={false}
      onSubmit={() => {}}
    />,
  );
  const text = screen.getByRole('alert').textContent;
  expect(text).toBe('This form is not available right now');
});

test('the message is a label: overridable and translatable', () => {
  render(
    <ArtisanForm
      scheme={{ schemaVersion: 1, id: 'f', steps: [] } as never}
      labels={{ schemaErrorMessage: 'Este formulario no está disponible' }}
      showSchemaIssues={false}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByRole('alert').textContent).toBe(
    'Este formulario no está disponible',
  );
});

test('fallback replaces the panel, as a node or a function of the issues', () => {
  const schema = { schemaVersion: 1, id: 'f', steps: [] } as never;
  const { rerender } = render(
    <ArtisanForm
      scheme={schema}
      fallback={<p>custom</p>}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByText('custom')).toBeTruthy();
  rerender(
    <ArtisanForm
      scheme={schema}
      fallback={(issues) => <p>{`${issues.length} problem`}</p>}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByText('1 problem')).toBeTruthy();
});

test('a missing payment provider blocks the form before the user fills anything', () => {
  const onSchemaIssues = mock((_: SchemaIssue[]) => {});
  render(
    <ArtisanForm
      scheme={
        {
          schemaVersion: 1,
          id: 'f',
          steps: [
            {
              id: 'a',
              type: 'form',
              title: 'A',
              fields: [{ type: 'text', name: 'n' }],
            },
            { id: 'p', type: 'payment', title: 'Pay', providers: ['stripe'] },
            { id: 'w', type: 'wait', title: 'W', strategy: 's' },
          ],
        } as never
      }
      extensions={{ waits: { s: { subscribe: () => () => {} } } }}
      onSchemaIssues={onSchemaIssues}
      onSubmit={() => {}}
    />,
  );
  expect(screen.queryByLabelText('n')).toBeNull();
  expect(codes(onSchemaIssues)).toEqual([
    'error:missing-reference@steps[1].providers[0]',
  ]);
});

test('an unregistered step type blocks; an unregistered custom field only warns and the form keeps running', () => {
  const blocked = mock((_: SchemaIssue[]) => {});
  render(
    <ArtisanForm
      scheme={
        {
          schemaVersion: 1,
          id: 'f',
          steps: [{ id: 'm', type: 'x-map', title: 'Map' }],
        } as never
      }
      onSchemaIssues={blocked}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(codes(blocked)).toEqual(['error:unsupported-step-kind@steps[0].type']);
  cleanup();

  const warned = mock((_: SchemaIssue[]) => {});
  render(
    <ArtisanForm
      scheme={
        one([
          { type: 'text', name: 'name', label: 'Name' },
          { type: 'x-stars', name: 'r', label: 'R' },
        ]) as never
      }
      onSchemaIssues={warned}
      onSubmit={() => {}}
    />,
  );
  // the rest of the form works and the unknown field shows its own notice
  expect(screen.getByLabelText('Name')).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toBe(
    'Unknown field type "x-stars"',
  );
  expect(codes(warned)).toEqual([
    'warning:unsupported-field-type@steps[0].fields[1].type',
  ]);
});

test('a missing options source only warns: the field renders without options', () => {
  const onSchemaIssues = mock((_: SchemaIssue[]) => {});
  render(
    <ArtisanForm
      scheme={
        one([
          {
            type: 'combobox',
            name: 'c',
            label: 'City',
            optionsSource: 'cities',
          },
        ]) as never
      }
      onSchemaIssues={onSchemaIssues}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByLabelText('City')).toBeTruthy();
  expect(codes(onSchemaIssues)).toEqual([
    'warning:unresolved-reference@steps[0].fields[0].optionsSource',
  ]);
});

test('the config of a custom field is verified from its spec', () => {
  const onSchemaIssues = mock((_: SchemaIssue[]) => {});
  const stars = {
    render: () => <span>stars</span>,
    initialValues: () => ({}),
    rules: () => ({}),
    spec: {
      type: 'x-stars',
      kind: 'field' as const,
      config: {
        type: 'object' as const,
        properties: { max: { type: 'integer' as const, maximum: 10 } },
      },
    },
  };
  render(
    <ArtisanForm
      scheme={
        one([
          { type: 'x-stars', name: 'r', label: 'R', config: { max: 50 } },
        ]) as never
      }
      fields={{ 'x-stars': stars } as never}
      onSchemaIssues={onSchemaIssues}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByRole('alert').textContent).toContain('invalid-config');
  expect(codes(onSchemaIssues)).toEqual([
    'error:invalid-config@steps[0].fields[0].config.max',
  ]);
  cleanup();
  render(
    <ArtisanForm
      scheme={
        one([
          { type: 'x-stars', name: 'r', label: 'R', config: { max: 5 } },
        ]) as never
      }
      fields={{ 'x-stars': stars } as never}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByText('stars')).toBeTruthy();
});

test('lint and legacy warnings are reported but never stop the form', () => {
  const onSchemaIssues = mock((_: SchemaIssue[]) => {});
  render(
    <ArtisanForm
      scheme={
        one([
          { type: 'text', name: 'name', label: 'Name' },
          {
            type: 'select',
            name: 's',
            label: 'S',
            options: [{ value: 'a', label: 'A' }],
            defaultValue: 'z',
          },
        ]) as never
      }
      onSchemaIssues={onSchemaIssues}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByLabelText('Name')).toBeTruthy();
  expect(codes(onSchemaIssues)).toEqual([
    'warning:default-not-an-option@steps[0].fields[1].defaultValue',
  ]);
});

test('a 0.2.0 schema with an unknown step kind keeps running (legacy never blocks)', () => {
  const onSchemaIssues = mock((_: SchemaIssue[]) => {});
  render(
    <ArtisanForm
      scheme={
        {
          steps: [
            { title: 'S', fields: [{ type: 'text', name: 'n', label: 'N' }] },
          ],
        } as never
      }
      onSchemaIssues={onSchemaIssues}
      onSubmit={() => {}}
    />,
  );
  expect(screen.getByLabelText('N')).toBeTruthy();
});

test('a blocked form leaves a saved draft alone', () => {
  const store = new Map<string, string>([['artisanform:k', '{"keep":"me"}']]);
  const draftStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  render(
    <ArtisanForm
      scheme={{ schemaVersion: 1, id: 'f', steps: [] } as never}
      persistKey="k"
      draftStorage={draftStorage}
      onSubmit={() => {}}
    />,
  );
  expect([...store.entries()]).toEqual([['artisanform:k', '{"keep":"me"}']]);
});

test('fixing the schema brings the form back without a remount', () => {
  const bad = { schemaVersion: 1, id: 'f', steps: [] } as never;
  const good = one([{ type: 'text', name: 'name', label: 'Name' }]) as never;
  const { rerender } = render(<ArtisanForm scheme={bad} onSubmit={() => {}} />);
  expect(screen.getByRole('alert')).toBeTruthy();
  rerender(<ArtisanForm scheme={good} onSubmit={() => {}} />);
  expect(screen.getByLabelText('Name')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
