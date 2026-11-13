import { afterEach, describe, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { checkSchema, describeCapabilities } from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { FormBuilder } from '../components/FormBuilder';
import {
  addCustomField,
  customFieldProperties,
  defaultConfig,
} from '../model/custom';
import type { BuilderResult } from '../useFormBuilder';

afterEach(cleanup);

const start = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  steps: [
    {
      id: 'one',
      type: 'form',
      title: 'One',
      fields: [{ type: 'text', name: 'email', label: 'Email' }],
    },
  ],
});

const stars = {
  type: 'x-stars',
  kind: 'field' as const,
  config: {
    type: 'object' as const,
    required: ['max'],
    properties: {
      max: { type: 'integer' as const, minimum: 1, maximum: 10 },
      color: { enum: ['gold', 'blue'] },
      showValue: { type: 'boolean' as const },
    },
  },
};
const manifest = describeCapabilities({ customTypes: [stars] });

describe('custom types: the model', () => {
  test('defaultConfig fills the required keys with values that pass the spec', () => {
    expect(defaultConfig(stars.config)).toEqual({ max: 1 });
  });

  test('a new custom field passes checkSchema with the manifest', () => {
    const { schema } = addCustomField(start(), 'one', stars);
    const r = checkSchema(schema, { manifest, lint: false });
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(
      (
        schema.steps[0] as unknown as {
          fields: { name: string; config: unknown }[];
        }
      ).fields[1],
    ).toMatchObject({ name: 'stars', config: { max: 1 } });
  });

  test('descriptors come from the ConfigShape', () => {
    const d = customFieldProperties(stars);
    expect(d.find((x) => x.path === 'config.max')).toMatchObject({
      control: 'number',
      min: 1,
      max: 10,
      help: 'Required',
    });
    expect(d.find((x) => x.path === 'config.color')).toMatchObject({
      control: 'enum',
      options: ['gold', 'blue'],
    });
    expect(d.find((x) => x.path === 'config.showValue')?.control).toBe(
      'boolean',
    );
    // a type with no spec gets its config as JSON
    expect(
      customFieldProperties().find((x) => x.path === 'config')?.control,
    ).toBe('json');
    expect(d.some((x) => x.path === 'name')).toBe(true);
  });
});

describe('custom types: the builder', () => {
  test('a registered type is in the palette; its settings come from the spec', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(
      <FormBuilder
        defaultValue={start()}
        manifest={manifest}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add x-stars' }));
    const inspector = screen.getByRole('region', { name: 'Settings' });
    fireEvent.change(within(inspector).getByLabelText('Max'), {
      target: { value: '5' },
    });
    const latest = onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined;
    const step = latest?.schema.steps[0] as unknown as
      | { fields: { config: { max: number } }[] }
      | undefined;
    expect(step?.fields[1]?.config.max).toBe(5);
    fireEvent.change(within(inspector).getByLabelText('Max'), {
      target: { value: '99' },
    });
    // out of the declared range: the schema is reported as not ok
    expect(
      (onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined)?.ok,
    ).toBe(false);
  });

  test('a policy decides which custom types are offered', () => {
    render(
      <FormBuilder
        defaultValue={start()}
        manifest={manifest}
        policy={{ fieldTypes: [] }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Add x-stars' })).toBeNull();
  });
});

describe('issues and compatibility', () => {
  test('an issue jumps to the element it is about', () => {
    const bad: ArtisanSchemaV1 = {
      ...start(),
      steps: [
        {
          id: 'one',
          type: 'form',
          title: 'One',
          fields: [
            { type: 'x-stars', name: 's', config: { max: 99 } } as never,
          ],
        },
      ],
    };
    render(<FormBuilder defaultValue={bad} manifest={manifest} />);
    const issues = screen
      .getByText(/1 error/)
      .closest('details') as HTMLElement;
    fireEvent.click(
      within(issues).getByRole('button', {
        name: /steps\[0\]\.fields\[0\]\.config\.max/,
      }),
    );
    expect(
      screen.getByRole('region', { name: 'Settings' }).textContent,
    ).toContain('Input (x-stars)');
  });

  test('a clean schema says there is nothing to fix', () => {
    render(<FormBuilder defaultValue={start()} />);
    expect(screen.getByText('0 errors, 0 warnings')).toBeTruthy();
  });

  test('changing the type of a published question warns; adding one does not', () => {
    const baseline = start();
    const { rerender } = render(
      <FormBuilder defaultValue={start()} baseline={baseline} />,
    );
    expect(screen.queryByRole('complementary')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add Number' }));
    expect(screen.queryByRole('complementary')).toBeNull(); // added questions are compatible
    rerender(
      <FormBuilder
        defaultValue={start()}
        baseline={{
          ...baseline,
          steps: [
            {
              id: 'one',
              type: 'form',
              title: 'One',
              fields: [{ type: 'tel', name: 'email' }],
            },
          ],
        }}
      />,
    );
    expect(screen.getByRole('complementary').textContent).toContain(
      'email (tel → text)',
    );
  });
});
