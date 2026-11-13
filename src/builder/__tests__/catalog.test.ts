import { describe, expect, test } from 'bun:test';
import {
  checkSchema,
  FIELD_KEYS,
  NATIVE_FIELD_TYPES,
  NATIVE_STEP_TYPES,
  STEP_KEYS,
} from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import {
  FIELD_CATALOG,
  PALETTE_CATEGORIES,
  STEP_CATALOG,
} from '../model/catalog';
import { addField, addStep } from '../model/operations';
import {
  fieldProperties,
  MANAGED_FIELD_KEYS,
  MANAGED_STEP_KEYS,
  stepProperties,
} from '../model/properties';

const blank = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  steps: [{ id: 'main', type: 'form', title: 'Main', fields: [] }],
});

/** Errors only: warnings (a payment without a wait step…) are not a problem here. */
const errors = (schema: ArtisanSchemaV1) =>
  checkSchema(schema, { lint: false }).issues.filter(
    (i) => i.severity === 'error',
  );

describe('the catalog covers the contract', () => {
  test('every native field and step type has an entry, and nothing else does', () => {
    expect(Object.keys(FIELD_CATALOG).sort()).toEqual(
      [...NATIVE_FIELD_TYPES].sort(),
    );
    expect(Object.keys(STEP_CATALOG).sort()).toEqual(
      [...NATIVE_STEP_TYPES].sort(),
    );
  });

  test('every palette category is used and every entry names a known one', () => {
    const known = new Set(PALETTE_CATEGORIES.map((c) => c.id));
    const used = new Set(Object.values(FIELD_CATALOG).map((e) => e.category));
    expect([...used].every((c) => known.has(c))).toBe(true);
    expect([...known].every((c) => used.has(c))).toBe(true);
  });
});

describe('the inspector covers every key of the contract', () => {
  const root = (path: string) => path.split('.')[0] as string;

  test.each(NATIVE_FIELD_TYPES)('field %s', (type) => {
    const keys: readonly string[] = FIELD_KEYS[type];
    const managed = new Set<string>(MANAGED_FIELD_KEYS);
    const covered = new Set(fieldProperties(type).map((d) => root(d.path)));
    // each key is edited by a control or deliberately left to the canvas…
    for (const key of keys)
      expect(covered.has(key) || managed.has(key)).toBe(true);
    // …and no control edits something the type does not accept
    for (const d of fieldProperties(type)) expect(keys).toContain(root(d.path));
  });

  test.each(NATIVE_STEP_TYPES)('step %s', (type) => {
    const keys: readonly string[] = STEP_KEYS[type];
    const managed = new Set<string>(MANAGED_STEP_KEYS);
    const covered = new Set(stepProperties(type).map((d) => root(d.path)));
    for (const key of keys)
      expect(covered.has(key) || managed.has(key)).toBe(true);
    for (const d of stepProperties(type)) expect(keys).toContain(root(d.path));
  });
});

describe('a new element is valid by construction', () => {
  test.each(NATIVE_FIELD_TYPES)('field %s', (type) => {
    const { schema } = addField(blank(), 'main', type);
    expect(errors(schema)).toEqual([]);
  });

  test.each(NATIVE_STEP_TYPES)('step %s', (type) => {
    const { schema } = addStep(blank(), type);
    expect(errors(schema)).toEqual([]);
  });

  test('a developer step takes its ids from what the app registered', () => {
    const ctx = {
      refs: {
        paymentProviders: ['stripe'],
        waits: ['orderStatus'],
        renderers: ['summary'],
      },
    };
    const s = addStep(
      addStep(addStep(blank(), 'payment', { ctx }).schema, 'wait', { ctx })
        .schema,
      'custom',
      { ctx },
    ).schema;
    const [, pay, wait, custom] = s.steps as unknown as Record<
      string,
      unknown
    >[];
    expect(pay?.providers).toEqual(['stripe']);
    expect(wait?.strategy).toBe('orderStatus');
    expect(custom?.renderer).toBe('summary');
  });

  test('a second payment or terms step does not clash on the implicit name', () => {
    let s = blank();
    for (const type of ['payment', 'payment', 'terms', 'terms'] as const)
      s = addStep(s, type).schema;
    expect(errors(s)).toEqual([]);
  });
});
