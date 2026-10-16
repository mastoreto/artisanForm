import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeArtisanSchema } from './normalize';
import { parseArtisanSchema } from './parser';

const doc = readFileSync(
  join(import.meta.dir, '../../docs/schema-v1.md'),
  'utf8',
);

/** Fenced ```json blocks in the guide, so the examples can never rot. */
const jsonBlocks = [...doc.matchAll(/```json\n([\s\S]*?)```/g)].map(
  (m) => m[1],
);

test('the guide has JSON examples and each is valid JSON', () => {
  expect(jsonBlocks.length).toBeGreaterThan(0);
  for (const block of jsonBlocks) expect(() => JSON.parse(block)).not.toThrow();
});

test('the TypeScript example in the guide is a valid v1 schema', () => {
  // Same literal as §6, kept in sync by reading it from the document.
  const ts = doc.match(
    /```ts\nimport \{ ArtisanForm, defineForm \}[\s\S]*?defineForm\(([\s\S]*?)\);\n\n<ArtisanForm/,
  );
  expect(ts).not.toBeNull();
  const schema = new Function(`return (${ts?.[1]})`)();
  const parsed = parseArtisanSchema(schema);
  expect(parsed.success).toBe(true);
  expect(normalizeArtisanSchema(schema).portable).toBe(true);
});

test('the condition example in the guide parses as a condition inside a schema', () => {
  const condition = JSON.parse(jsonBlocks[0]);
  const schema = {
    schemaVersion: 1,
    id: 'doc',
    steps: [
      {
        id: 's',
        type: 'form',
        title: 'S',
        fields: [
          { name: 'age', type: 'number' },
          { name: 'parent', type: 'checkbox' },
          { name: 'consent', type: 'text', visibleWhen: condition },
        ],
      },
    ],
  };
  expect(parseArtisanSchema(schema).success).toBe(true);
});
