import { expect, test } from 'bun:test';
import { checkSchema } from '../../schema';
import { describeRegistrations } from '../registrations';

const render = () => null;
const field = (spec?: object) =>
  ({ render, initialValues: () => ({}), rules: () => ({}), spec }) as never;

test('nothing registered describes the native surface only', () => {
  const m = describeRegistrations();
  expect(m.refs.hooks).toEqual([]);
  expect(m.fieldTypes).toContain('text');
  expect(m.fieldTypes.some((t) => t.startsWith('x-'))).toBe(false);
  expect(m.customTypes).toBeUndefined();
});

test('the manifest comes from the same props the form gets', () => {
  const m = describeRegistrations({
    extensions: { hooks: { verify: () => undefined }, waits: {} as never },
    plugins: { payments: [{ id: 'stripe', name: 'Stripe', mode: 'embedded' }] },
    storage: { cloud: { id: 'cloud', upload: async () => ({}) as never } },
    fields: { stars: field(), 'x-slider': field() },
    stepTypes: { map: { render } },
  });
  expect(m.refs.hooks).toEqual(['verify']);
  expect(m.refs.paymentProviders).toEqual(['stripe']);
  expect(m.refs.storage).toEqual(['cloud']);
  // `stars` and `x-stars` are the same schema type
  expect(m.fieldTypes).toEqual(expect.arrayContaining(['x-stars', 'x-slider']));
  expect(m.stepKinds).toContain('x-map');
});

test('a single storage adapter is the default one', () => {
  const m = describeRegistrations({
    storage: { id: 'one', upload: async () => ({}) as never },
  });
  expect(m.refs.storage).toEqual(['default']);
});

test('native keys of a registry are not custom types', () => {
  const m = describeRegistrations({ fields: { text: field() } });
  expect(m.fieldTypes).toContain('text');
  expect(m.fieldTypes).not.toContain('x-text');
});

test('a definition spec ends up in the manifest and checks a schema end to end', () => {
  const m = describeRegistrations({
    fields: {
      stars: field({
        type: 'ignored-the-key-wins',
        kind: 'field',
        config: {
          type: 'object',
          properties: { max: { type: 'integer', maximum: 10 } },
        },
      }),
    },
  });
  expect(m.customTypes?.[0]).toMatchObject({ type: 'x-stars', kind: 'field' });
  const schema = (max: number) => ({
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        fields: [{ name: 'r', type: 'x-stars', config: { max } }],
      },
    ],
  });
  expect(checkSchema(schema(5), { manifest: m }).ok).toBe(true);
  const bad = checkSchema(schema(50), { manifest: m });
  expect(bad.ok).toBe(false);
  expect(bad.issues[0]?.path).toBe('steps[0].fields[0].config.max');
});
