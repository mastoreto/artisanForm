import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkSchema } from '../check';
import { normalizeArtisanSchema } from '../normalize';
import { parseArtisanSchema } from '../parser';

const root = join(import.meta.dir, '../../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/** The v1 guide in both languages: the examples in each must stay valid. */
const guides = [
  { lang: 'en', doc: read('docs/schema-v1.md') },
  { lang: 'es', doc: read('docs/es/schema-v1.md') },
];

/** Fenced ```json blocks, so the examples can never rot. */
const jsonBlocks = (doc: string) =>
  [...doc.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);

describe.each(guides)('schema v1 guide ($lang)', ({ doc }) => {
  test('has JSON examples and each is valid JSON', () => {
    const blocks = jsonBlocks(doc);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(() => JSON.parse(block)).not.toThrow();
  });

  test('the TypeScript example is a valid, portable v1 schema', () => {
    const ts = doc.match(
      /```ts\nimport \{ ArtisanForm, defineForm \}[\s\S]*?defineForm\(([\s\S]*?)\);\n\n<ArtisanForm/,
    );
    expect(ts).not.toBeNull();
    const schema = new Function(`return (${ts?.[1]})`)();
    expect(parseArtisanSchema(schema).success).toBe(true);
    expect(normalizeArtisanSchema(schema).portable).toBe(true);
  });

  test('the condition example is a valid condition inside a schema', () => {
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
            {
              name: 'consent',
              type: 'text',
              visibleWhen: JSON.parse(jsonBlocks(doc)[0]),
            },
          ],
        },
      ],
    };
    expect(parseArtisanSchema(schema).success).toBe(true);
  });
});

describe('Spanish documentation mirrors the English originals', () => {
  const pairs: [string, string][] = [
    ['README.md', 'docs/es/README.md'],
    ['AGENTS.md', 'docs/es/AGENTS.md'],
    ['CHANGELOG.md', 'docs/es/CHANGELOG.md'],
    ['docs/schema-v1.md', 'docs/es/schema-v1.md'],
    ['docs/backend.md', 'docs/es/backend.md'],
    ['docs/ui.md', 'docs/es/ui.md'],
    ['docs/builder.md', 'docs/es/builder.md'],
    ['docs/versioning.md', 'docs/es/versioning.md'],
  ];

  test.each(pairs)('%s has a Spanish copy with the same sections', (en, es) => {
    expect(existsSync(join(root, es))).toBe(true);
    const sections = (doc: string) =>
      doc.split('\n').filter((l) => /^#{1,3} /.test(l)).length;
    // Headings are translated, so compare how many there are, not their text.
    expect(sections(read(es))).toBe(sections(read(en)));
  });

  test('AGENTS.md links every Spanish document', () => {
    const agents = read('AGENTS.md');
    for (const link of [
      'docs/es/README.md',
      'docs/es/AGENTS.md',
      'docs/es/CHANGELOG.md',
      'docs/es/schema-v1.md',
      'docs/es/backend.md',
      'docs/es/ui.md',
      'docs/es/builder.md',
    ])
      expect(agents).toContain(link);
  });
});

describe.each([
  { lang: 'en', doc: read('docs/backend.md') },
  { lang: 'es', doc: read('docs/es/backend.md') },
])('backend guide ($lang)', ({ doc }) => {
  test('the schema example is valid, with a $schema and a sensitive field', () => {
    const [block] = jsonBlocks(doc);
    const schema = JSON.parse(block ?? '{}');
    expect(schema.$schema).toBe(
      'https://unpkg.com/artisanform/dist/schema.json',
    );
    const result = checkSchema(schema);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  test('every JSON block is valid JSON', () => {
    for (const block of jsonBlocks(doc))
      expect(() => JSON.parse(block)).not.toThrow();
  });

  test('the TypeScript snippets name only functions the library exports', async () => {
    const lib = await import('../index');
    const asked = [
      ...doc.matchAll(/import \{([^}]*)\} from 'artisanform\/schema'/g),
    ]
      .flatMap((m) => (m[1] ?? '').split(','))
      .map((n) => n.trim())
      // `type X` imports are erased at runtime: only values can be checked
      .filter((n) => n && !n.startsWith('type '));
    expect(asked.length).toBeGreaterThan(0);
    for (const name of asked) expect(name in lib).toBe(true);
  });
});
