import { afterEach, describe, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { checkSchema } from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { ConditionV1 } from '../../schema/contract/types';
import { FormBuilder } from '../components/FormBuilder';
import {
  answerInfo,
  fromTree,
  newLeaf,
  operatorsFor,
  toTree,
} from '../model/conditions';
import type { BuilderResult } from '../useFormBuilder';

afterEach(cleanup);

const form = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  steps: [
    {
      id: 'one',
      type: 'form',
      title: 'One',
      fields: [
        {
          type: 'select',
          name: 'kind',
          label: 'Kind',
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
        },
        { type: 'number', name: 'age', label: 'Age' },
        { type: 'daterange', name: 'stay', label: 'Stay' },
        { type: 'text', name: 'company', label: 'Company' },
      ],
    },
    {
      id: 'two',
      type: 'form',
      title: 'Two',
      fields: [{ type: 'text', name: 'note' }],
    },
    { id: 'done', type: 'result', title: 'Done' },
  ],
});

describe('the condition tree', () => {
  const cases: (ConditionV1 | undefined)[] = [
    undefined,
    { field: 'a', operator: 'eq', value: 'x' },
    { field: 'a', operator: 'filled' },
    {
      all: [
        { field: 'a', operator: 'eq', value: 1 },
        { field: 'b', operator: 'in', value: ['x', 'y'] },
      ],
    },
    {
      any: [
        { field: 'a', operator: 'gt', value: 3 },
        {
          all: [
            { field: 'b', operator: 'empty' },
            { field: 'c', operator: 'neq', value: 'z' },
          ],
        },
      ],
    },
    { not: { field: 'a', operator: 'eq', value: 'x' } },
    {
      not: {
        all: [
          { field: 'a', operator: 'eq', value: 1 },
          { field: 'b', operator: 'eq', value: 2 },
        ],
      },
    },
  ];
  test.each(cases.map((c, i) => [i, c] as const))(
    'round trip %i',
    (_i, cond) => {
      // a single comparison is stored bare, everything else comes back as it was
      expect(fromTree(toTree(cond))).toEqual(cond);
    },
  );

  test('an empty tree is no condition, and a comparison without an answer is dropped', () => {
    expect(fromTree(toTree(undefined))).toBeUndefined();
    expect(
      fromTree({
        kind: 'group',
        mode: 'all',
        negate: false,
        items: [{ kind: 'leaf', field: '', operator: 'eq', value: '' }],
      }),
    ).toBeUndefined();
  });

  test('every tree the editor can build is a valid condition', () => {
    const leaf = newLeaf([
      {
        key: 'kind',
        label: 'Kind',
        type: 'select',
        stepIndex: 0,
        options: [{ value: 'p', label: 'P' }],
      },
    ]);
    const tree = {
      kind: 'group',
      mode: 'any',
      negate: true,
      items: [
        leaf,
        { kind: 'group', mode: 'all', negate: false, items: [leaf, leaf] },
      ],
    } as const;
    const schema = form();
    const target = (
      schema.steps[0] as unknown as { fields: { visibleWhen?: unknown }[] }
    ).fields[3];
    if (target) target.visibleWhen = fromTree(tree as never);
    expect(
      checkSchema(schema, { lint: false }).issues.filter(
        (i) => i.severity === 'error',
      ),
    ).toEqual([]);
  });
});

describe('what a condition may read', () => {
  test('answerInfo lists keys up to a step, implicit ones included, and can exclude one', () => {
    const keys = (n: number) => answerInfo(form(), n).map((a) => a.key);
    expect(keys(0)).toEqual(['kind', 'age', 'stay', 'stayEnd', 'company']);
    expect(keys(1)).toContain('note');
    expect(keys(-1)).toEqual([]);
    expect(
      answerInfo(form(), 0, new Set(['age'])).map((a) => a.key),
    ).not.toContain('age');
  });

  test('operators depend on the type', () => {
    expect(operatorsFor('number')).toContain('gt');
    expect(operatorsFor('text')).not.toContain('gt');
    expect(operatorsFor('checkbox')).toEqual(['eq', 'filled']);
  });
});

const latest = (spy: ReturnType<typeof mock>): BuilderResult => {
  const r = spy.mock.calls.at(-1)?.[0] as BuilderResult | undefined;
  if (!r) throw new Error('no change was reported');
  return r;
};

describe('the editors', () => {
  const setup = () => {
    const onChange = mock((_: BuilderResult) => {});
    render(
      <FormBuilder defaultValue={form()} mode="advanced" onChange={onChange} />,
    );
    return onChange;
  };
  const inspector = () => screen.getByRole('region', { name: 'Settings' });
  const lastField = (onChange: ReturnType<typeof mock>, i: number) =>
    (
      (onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined)?.schema
        .steps[0] as unknown as
        | { fields: { visibleWhen?: unknown }[] }
        | undefined
    )?.fields[i];
  const select = (name: string) =>
    fireEvent.click(screen.getByRole('button', { name }));

  test('a field is shown only when an earlier answer matches', () => {
    const onChange = setup();
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Form' })).getByText(
        'Company',
        { selector: '.afb-field-label' },
      ),
    );
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Add condition' }),
    );
    expect(lastField(onChange, 3)?.visibleWhen).toEqual({
      field: 'kind',
      operator: 'eq',
      value: 'person',
    });
    fireEvent.change(within(inspector()).getByLabelText('Value'), {
      target: { value: 'company' },
    });
    expect(lastField(onChange, 3)?.visibleWhen).toEqual({
      field: 'kind',
      operator: 'eq',
      value: 'company',
    });
    // a number answer offers comparisons and keeps the value a number
    fireEvent.change(within(inspector()).getByLabelText('Answer'), {
      target: { value: 'age' },
    });
    fireEvent.change(within(inspector()).getByLabelText('Is'), {
      target: { value: 'gte' },
    });
    fireEvent.change(within(inspector()).getByLabelText('Value'), {
      target: { value: '18' },
    });
    expect(lastField(onChange, 3)?.visibleWhen).toEqual({
      field: 'age',
      operator: 'gte',
      value: 18,
    });
    expect(
      (onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined)?.ok,
    ).toBe(true);
  });

  test('it never offers the field itself or a later answer', () => {
    setup();
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Form' })).getByText('Age', {
        selector: '.afb-field-label',
      }),
    );
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Add condition' }),
    );
    const options = [
      ...within(inspector())
        .getByLabelText('Answer')
        .querySelectorAll('option'),
    ].map((o) => o.getAttribute('value'));
    expect(options).toEqual(['kind', 'stay', 'stayEnd', 'company']);
  });

  test('groups nest, switch to any, and removing the last condition removes the key', () => {
    const onChange = setup();
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Form' })).getByText(
        'Company',
        { selector: '.afb-field-label' },
      ),
    );
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Add condition' }),
    );
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Add group' }),
    );
    expect(JSON.stringify(lastField(onChange, 3)?.visibleWhen)).toContain(
      '"all"',
    );
    fireEvent.change(
      within(inspector()).getAllByLabelText('Match')[0] as HTMLElement,
      { target: { value: 'any' } },
    );
    expect(Object.keys(lastField(onChange, 3)?.visibleWhen as object)).toEqual([
      'any',
    ]);
    for (let i = 0; i < 4; i++) {
      const buttons = within(inspector()).queryAllByRole('button', {
        name: 'Remove condition',
      });
      if (buttons.length === 0) break;
      fireEvent.click(buttons[buttons.length - 1] as HTMLElement);
    }
    expect(lastField(onChange, 3)).not.toHaveProperty('visibleWhen');
  });

  test('a step gets next steps with a condition, and the flow lists them', () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole('tab', { name: /Step 1/ }));
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Add next step' }),
    );
    fireEvent.change(within(inspector()).getByLabelText('Go to 1'), {
      target: { value: 'done' },
    });
    const step = latest(onChange).schema.steps[0] as unknown as {
      next: { to: string }[];
    };
    expect(step.next).toEqual([{ to: 'done' }]);
    // step 1 now leads straight to Done, skipping Two
    const flow = screen.getByText('Flow').closest('details') as HTMLElement;
    expect(within(flow).getAllByText('→ Done').length).toBe(2);
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Remove next step 1' }),
    );
    expect(latest(onChange).schema.steps[0]).not.toHaveProperty('next');
  });

  test('the buttons of a result step', () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole('tab', { name: /Step 3/ }));
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Add button' }),
    );
    fireEvent.change(within(inspector()).getByLabelText('Link 1'), {
      target: { value: '/home' },
    });
    const step = latest(onChange).schema.steps[2] as unknown as {
      actions: unknown[];
    };
    expect(step.actions).toEqual([{ label: 'Button', href: '/home' }]);
    void select;
  });

  test('turning conditions off hides their editors', () => {
    render(
      <FormBuilder
        defaultValue={form()}
        mode="advanced"
        features={{ conditions: false }}
      />,
    );
    fireEvent.click(
      within(screen.getByRole('region', { name: 'Form' })).getByText(
        'Company',
        { selector: '.afb-field-label' },
      ),
    );
    expect(
      within(inspector()).queryByRole('button', { name: 'Add condition' }),
    ).toBeNull();
  });
});
