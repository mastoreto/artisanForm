import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeArtisanSchema } from '../normalize';
import { parseArtisanSchema } from '../parser';

// Golden fixtures of the v1 contract. Inside 1.x a schema that parses today
// must parse tomorrow and normalize to the same JSON, so a failure here is a
// contract change: it needs a minor/major decision (docs/versioning.md), not a
// quiet fixture update. `UPDATE_GOLDEN=1 bun test golden` rewrites normalized/.
const dir = join(import.meta.dir, 'fixtures-v1');
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const valid = readdirSync(join(dir, 'valid')).filter((f) =>
  f.endsWith('.json'),
);

describe.each(valid)('valid/%s', (file) => {
  const input = json(join(dir, 'valid', file));

  test('parses without errors or warnings', () => {
    const r = parseArtisanSchema(input);
    expect(r.issues).toEqual([]);
    expect(r.success).toBe(true);
  });

  test('normalizes to the recorded JSON', () => {
    const out = normalizeArtisanSchema(input).schema;
    const path = join(dir, 'normalized', file);
    if (process.env.UPDATE_GOLDEN)
      writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
    expect(out).toEqual(json(path));
  });

  test('normalizing twice changes nothing', () => {
    const once = normalizeArtisanSchema(input).schema;
    expect(normalizeArtisanSchema(once).schema).toEqual(once);
    expect(parseArtisanSchema(once).success).toBe(true);
  });

  test('is portable (survives a JSON round trip)', () => {
    expect(normalizeArtisanSchema(input).portable).toBe(true);
    const n = normalizeArtisanSchema(input).schema;
    expect(JSON.parse(JSON.stringify(n))).toEqual(n);
  });
});

describe('invalid fixtures', () => {
  const cases: { name: string; schema: unknown; errors: string[] }[] = json(
    join(dir, 'invalid.json'),
  );
  test.each(cases)('$name', ({ schema, errors }) => {
    const r = parseArtisanSchema(schema);
    expect(r.success).toBe(false);
    if (!r.success)
      expect(
        r.issues
          .filter((i) => i.severity === 'error')
          .map((i) => `${i.code} @ ${i.path}`),
      ).toEqual(errors);
  });
});
