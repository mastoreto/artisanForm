import { expect, test } from 'bun:test';
import {
  type ArtisanSchemaV1,
  checkCapabilities,
  describeCapabilities,
} from '..';
import { type ConfigShape, validateConfig } from '../custom-types';

const stars: ConfigShape = {
  type: 'object',
  required: ['max'],
  properties: {
    max: { type: 'integer', minimum: 1, maximum: 10 },
    color: { enum: ['gold', 'blue'] },
    labels: { type: 'array', items: { type: 'string', maxLength: 5 } },
  },
  additionalProperties: false,
};

const paths = (shape: ConfigShape, value: unknown) =>
  validateConfig(shape, value).map((i) => i.path);

test('a valid config has no issues', () => {
  expect(paths(stars, { max: 5, color: 'gold', labels: ['a', 'b'] })).toEqual(
    [],
  );
});

test('reports each problem at its own path', () => {
  expect(
    paths(stars, {
      max: 99,
      color: 'red',
      labels: ['ok', 'too long'],
      extra: 1,
    }).sort(),
  ).toEqual(['color', 'extra', 'labels[1]', 'max'].sort());
  expect(paths(stars, {})).toEqual(['max']); // required
  expect(paths(stars, 'nope')).toEqual(['']); // wrong type
  expect(paths(stars, { max: 1.5 })).toEqual(['max']); // integer
});

test('never throws on odd input', () => {
  for (const v of [null, undefined, 3, [], () => 1])
    expect(() => validateConfig(stars, v)).not.toThrow();
});

const schema = (
  field: Record<string, unknown>,
  step?: Record<string, unknown>,
) =>
  ({
    schemaVersion: 1,
    id: 'f',
    steps: [
      { id: 's', type: 'form', title: 'S', fields: [field] },
      ...(step ? [step] : []),
    ],
  }) as unknown as ArtisanSchemaV1;

const manifest = describeCapabilities({
  customTypes: [
    { type: 'x-stars', kind: 'field', config: stars },
    {
      type: 'x-map',
      kind: 'step',
      config: { type: 'object', required: ['zoom'] },
    },
  ],
});

test('the manifest carries the specs and lists the custom types', () => {
  expect(manifest.fieldTypes).toContain('x-stars');
  expect(manifest.stepKinds).toContain('x-map');
  expect(manifest.customTypes).toHaveLength(2);
  expect(describeCapabilities().customTypes).toBeUndefined();
});

test('checkCapabilities verifies the config of a custom field without running the app', () => {
  const ok = schema({ name: 'r', type: 'x-stars', config: { max: 5 } });
  expect(checkCapabilities(ok, manifest)).toEqual([]);
  const bad = schema({ name: 'r', type: 'x-stars', config: { max: 50 } });
  expect(checkCapabilities(bad, manifest)).toEqual([
    {
      code: 'invalid-config',
      id: 'x-stars',
      path: 'steps[0].fields[0].config.max',
      message: 'must be at most 10',
    },
  ]);
  // a missing config still has to satisfy `required`
  const missing = schema({ name: 'r', type: 'x-stars' });
  expect(checkCapabilities(missing, manifest).map((i) => i.path)).toEqual([
    'steps[0].fields[0].config.max',
  ]);
});

test('custom steps are verified too, and an unregistered type is reported once', () => {
  const noZoom = schema(
    { name: 'a', type: 'text' },
    { id: 'm', type: 'x-map', title: 'Map', config: {} },
  );
  expect(
    checkCapabilities(noZoom, manifest).map((i) => `${i.code} @ ${i.path}`),
  ).toEqual(['invalid-config @ steps[1].config.zoom']);
  const unknown = schema({ name: 'r', type: 'x-unknown' });
  expect(checkCapabilities(unknown, manifest).map((i) => i.code)).toEqual([
    'unsupported-field-type',
  ]);
});

test('a type with no declared config accepts any config', () => {
  const m = describeCapabilities({
    customTypes: [{ type: 'x-free', kind: 'field' }],
  });
  expect(
    checkCapabilities(
      schema({ name: 'r', type: 'x-free', config: { any: [1] } }),
      m,
    ),
  ).toEqual([]);
});
