// Copies the repo guides (docs/ and docs/es/) into the Starlight content dir,
// turning the leading `# Title` into frontmatter. docs/ stays the source.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const out = new URL('../src/content/docs/', import.meta.url);
const pages = [
  ['schema-v1.md', 'schema-v1'],
  ['ui.md', 'ui'],
];

for (const [dir, lang] of [
  ['docs/', 'docs/'],
  ['docs/es/', 'es/docs/'],
]) {
  mkdirSync(new URL(lang, out), { recursive: true });
  for (const [file, slug] of pages) {
    const src = readFileSync(new URL(dir + file, root), 'utf8');
    const title = src.match(/^# (.+)$/m)?.[1] ?? slug;
    const prefix = lang ? `/${lang}` : '/';
    // Guide-to-guide links (`ui.md#x`) become site routes (`/docs/ui/#x`).
    const body = src
      .replace(/^# .+\n/m, '')
      .replace(/^> 🌐.*\n/m, '')
      .replace(
        /\]\((?:es\/)?(schema-v1|ui)\.md(#[^)]*)?\)/g,
        (_, page, hash = '') => `](${prefix}${page}/${hash})`,
      );
    writeFileSync(
      new URL(`${lang}${slug}.md`, out),
      `---\ntitle: ${JSON.stringify(title)}\n---\n${body}`,
    );
  }
}
