import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ArtisanSchemaV1, normalizeArtisanSchema } from '..';
import { validateValues } from '../validate';
import { loadValueFixtures } from './values/load';

// The shared fixtures in ./values/*.json are also run against Yup in
// src/engine/__tests__/validate-parity.test.ts: they pin the validator's
// exact output here, and the agreement with the browser there.
for (const fx of loadValueFixtures()) {
  for (const c of fx.cases) {
    test(`${fx.file}: ${c.name}`, () => {
      const r = validateValues(fx.schema, c.values);
      const got = r.issues.map((i) => `${i.path}:${i.code}`).sort();
      const want = c.expect.map((i) => `${i.path}:${i.code}`).sort();
      expect(got).toEqual(want);
      expect(r.ok).toBe(want.length === 0);
    });
  }
}

test('every fixture schema is a valid v1 schema', () => {
  for (const fx of loadValueFixtures())
    expect(() => normalizeArtisanSchema(fx.schema)).not.toThrow();
});

const schema = (fields: unknown[]): ArtisanSchemaV1 =>
  ({
    schemaVersion: 1,
    id: 't',
    steps: [{ id: 's', type: 'form', title: 'S', fields }],
  }) as ArtisanSchemaV1;

test('accepts a normalized schema as well', () => {
  const s = schema([{ type: 'text', name: 'a', required: true }]);
  expect(validateValues(normalizeArtisanSchema(s), {}).ok).toBe(false);
  expect(validateValues(normalizeArtisanSchema(s), { a: 'x' }).ok).toBe(true);
});

test('values that are not an object are rejected', () => {
  const s = schema([]);
  for (const v of [null, undefined, 'x', 5, []])
    expect(validateValues(s, v).issues).toEqual([
      { path: '', code: 'type', params: { expected: 'object' } },
    ]);
});

test('prune drops hidden fields, hidden steps and unknown keys', () => {
  const s = schema([
    { type: 'text', name: 'a' },
    {
      type: 'text',
      name: 'b',
      visibleWhen: { field: 'a', operator: 'eq', value: 'x' },
    },
  ]);
  const r = validateValues(
    s,
    { a: 'y', b: 'hidden', evil: '<script>' },
    { prune: true },
  );
  expect(r.values).toEqual({ a: 'y' });
  expect(
    validateValues(s, { a: 'x', b: 'shown' }, { prune: true }).values,
  ).toEqual({ a: 'x', b: 'shown' });
});

test('a hidden step is skipped, including its terms checkbox', () => {
  const s = {
    schemaVersion: 1,
    id: 't',
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        fields: [{ type: 'checkbox', name: 'go' }],
      },
      {
        id: 'terms',
        type: 'terms',
        title: 'T',
        visibleWhen: { field: 'go', operator: 'eq', value: true },
      },
    ],
  } as ArtisanSchemaV1;
  expect(validateValues(s, { go: false }).ok).toBe(true);
  expect(validateValues(s, { go: true }).issues).toEqual([
    { path: 'termsAccepted', code: 'required' },
  ]);
});

test('optionsSource is checked only when its options are supplied', () => {
  const s = schema([
    { type: 'combobox', name: 'c', optionsSource: 'countries' },
  ]);
  expect(validateValues(s, { c: 'zz' }).ok).toBe(true);
  const r = validateValues(
    s,
    { c: 'zz' },
    { dynamicOptions: { countries: ['ar', 'uy'] } },
  );
  expect(r.issues).toEqual([{ path: 'c', code: 'invalidOption' }]);
  expect(
    validateValues(
      s,
      { c: 'ar' },
      { dynamicOptions: { countries: ['ar', 'uy'] } },
    ).ok,
  ).toBe(true);
});

test('custom x-* types are validated only by the rule the caller supplies', () => {
  const s = schema([{ type: 'x-stars', name: 'rating' }]);
  expect(validateValues(s, { rating: 'anything' }).ok).toBe(true);
  const r = validateValues(
    s,
    { rating: 9 },
    {
      customTypes: {
        'x-stars': (v) =>
          v === 9 ? [{ path: 'rating', code: 'custom' as const }] : [],
      },
    },
  );
  expect(r.issues).toEqual([{ path: 'rating', code: 'custom' }]);
});

test('a catastrophic pattern is rejected instead of being run', () => {
  const s = schema([
    { type: 'text', name: 'a', validation: { pattern: '^(a+)+$' } },
  ]);
  const t = performance.now();
  const r = validateValues(s, { a: `${'a'.repeat(40)}!` });
  expect(performance.now() - t).toBeLessThan(200);
  expect(r.issues).toEqual([{ path: 'a', code: 'unsafePattern' }]);
});

test('the string length cap can be lowered', () => {
  const s = schema([{ type: 'text', name: 'a' }]);
  expect(
    validateValues(s, { a: 'x'.repeat(11) }, { maxStringLength: 10 }).issues,
  ).toEqual([{ path: 'a', code: 'tooLong', params: { max: 10 } }]);
});

test('the fixture folder only holds fixtures', () => {
  const files = readdirSync(join(import.meta.dir, 'values'));
  expect(files.every((f) => f.endsWith('.json') || f === 'load.ts')).toBe(true);
  expect(
    readFileSync(join(import.meta.dir, 'values', 'text.json'), 'utf8'),
  ).toContain('"cases"');
});
