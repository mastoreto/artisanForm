import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { buildJsonSchema } from '../../../scripts/build-json-schema.mjs';
import { FIELD_KEYS, STEP_KEYS } from '../contract/specs';
import { parseArtisanSchema } from '../parser';

// The JSON Schema describes the STRUCTURE of the contract for validators that
// are not this library (other languages, database constraints). It must agree
// with the parser on every schema the parser can tell apart structurally.
const jsonSchema = buildJsonSchema({ FIELD_KEYS, STEP_KEYS });
const validate = new Ajv2020({ strict: false, allErrors: true }).compile(
  jsonSchema,
);

const dir = join(import.meta.dir, 'fixtures-v1');
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const files = (sub: string) =>
  readdirSync(join(dir, sub))
    .filter((f) => f.endsWith('.json'))
    .map((f) => [`${sub}/${f}`, json(join(dir, sub, f))] as const);

describe('every valid and normalized golden fixture passes', () => {
  for (const [name, schema] of [...files('valid'), ...files('normalized')])
    test(name, () => {
      validate(schema);
      expect(validate.errors ?? []).toEqual([]);
    });
});

// A code the structure alone can reveal; the rest need the whole document.
const STRUCTURAL = new Set([
  'invalid-type',
  'invalid-value',
  'unknown-property',
  'missing-property',
  'missing-version',
  'unsupported-version',
  'empty-steps',
  'unknown-type',
]);

describe('structural errors the parser reports fail the JSON Schema too', () => {
  const cases = json(join(dir, 'invalid.json')) as {
    name: string;
    schema: unknown;
    errors: string[];
  }[];
  for (const c of cases) {
    const codes = c.errors.map((e) => e.split(' @ ')[0] ?? '');
    if (!codes.every((code) => STRUCTURAL.has(code))) continue;
    test(c.name, () => {
      expect(parseArtisanSchema(c.schema).success).toBe(false);
      expect(validate(c.schema)).toBe(false);
    });
  }
});

test("the contract keys of every type are the library's own", () => {
  const field = jsonSchema.$defs.field.oneOf.find(
    (d: { properties: { type: { const?: string } } }) =>
      d.properties.type.const === 'text',
  );
  expect(Object.keys(field?.properties ?? {}).sort()).toEqual(
    [...FIELD_KEYS.text].sort(),
  );
});

test('structure the parser accepts but the document-level rules refuse still passes here', () => {
  // duplicate names are a whole-document rule, not structure
  const dup = {
    schemaVersion: 1,
    id: 'x',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [
          { type: 'text', name: 'a' },
          { type: 'text', name: 'a' },
        ],
      },
    ],
  };
  expect(validate(dup)).toBe(true);
  expect(parseArtisanSchema(dup).success).toBe(false);
});
