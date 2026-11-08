// Copies the repo guides (docs/ and docs/es/) into the Starlight content dir,
// turning the leading `# Title` into frontmatter. docs/ stays the source.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const out = new URL('../src/content/docs/', import.meta.url);
const pages = [
  ['schema-v1.md', 'schema-v1'],
  ['ui.md', 'ui'],
  ['payments.md', 'payments'],
  ['files.md', 'files'],
  ['accessibility.md', 'accessibility'],
  ['releasing.md', 'releasing'],
];
const slugs = new Map(pages);

// `](ui.md#x)` between synced guides becomes a site link (`../ui/#x`), which
// works under any base path. Other relative links are left as they are.
const siteLinks = (body) =>
  body.replace(/\]\(([a-z0-9-]+\.md)(#[^)]*)?\)/g, (match, file, hash = '') =>
    slugs.has(file) ? `](../${slugs.get(file)}/${hash})` : match,
  );

for (const [dir, lang] of [
  ['docs/', ''],
  ['docs/es/', 'es/'],
]) {
  mkdirSync(new URL(lang, out), { recursive: true });
  for (const [file, slug] of pages) {
    const src = readFileSync(new URL(dir + file, root), 'utf8');
    const title = src.match(/^# (.+)$/m)?.[1] ?? slug;
    const body = siteLinks(
      src.replace(/^# .+\n/m, '').replace(/^> 🌐.*\n/m, ''),
    );
    writeFileSync(
      new URL(`${lang}${slug}.md`, out),
      `---\ntitle: ${JSON.stringify(title)}\n---\n${body}`,
    );
  }
}
