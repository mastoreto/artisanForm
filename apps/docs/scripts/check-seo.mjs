// Post-build SEO sanity check over dist/. Exits 1 with a list of problems.
import { existsSync, readFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const errors = [];
const fail = (msg) => errors.push(msg);
const read = (rel) => readFileSync(new URL(rel, dist), 'utf8');

for (const f of [
  'sitemap-index.xml',
  'robots.txt',
  'llms.txt',
  'llms-full.txt',
  'og/en.png',
  'og/es.png',
  'favicon.svg',
]) {
  if (!existsSync(new URL(f, dist))) fail(`missing dist/${f}`);
}

const pages = [
  ['index.html', true],
  ['es/index.html', true],
  ['docs/index.html', false],
  ['docs/schema-v1/index.html', false],
  ['es/docs/index.html', false],
];

const resolves = (href) => {
  const path = href.split('#')[0].split('?')[0];
  if (!path || path === '/') return true;
  const clean = path.replace(/^\//, '');
  return [clean, `${clean}/index.html`, `${clean}index.html`].some((c) =>
    existsSync(new URL(c, dist)),
  );
};

for (const [file, landing] of pages) {
  if (!existsSync(new URL(file, dist))) {
    fail(`missing dist/${file}`);
    continue;
  }
  const html = read(file);
  const has = (re, what) => re.test(html) || fail(`${file}: no ${what}`);
  has(/<title>[^<]{10,}<\/title>/, 'title');
  has(/<meta name="description" content="[^"]{40,}"/, 'meta description');
  has(/<link rel="canonical" href="https?:\/\//, 'canonical');
  has(/<meta property="og:title"/, 'og:title');
  has(/<meta property="og:image" content="https?:\/\//, 'og:image');
  has(/<html[^>]* lang="(en|es)/, 'html lang');
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) fail(`${file}: expected 1 <h1>, found ${h1}`);

  if (landing) {
    for (const code of ['en', 'es', 'x-default']) {
      has(new RegExp(`rel="alternate" hreflang="${code}"`), `hreflang ${code}`);
    }
    const blocks = [
      ...html.matchAll(
        /<script type="application\/ld\+json">(.*?)<\/script>/gs,
      ),
    ];
    if (blocks.length < 3) fail(`${file}: expected 3 JSON-LD blocks`);
    for (const [, json] of blocks) {
      try {
        JSON.parse(json);
      } catch {
        fail(`${file}: invalid JSON-LD`);
      }
    }
    for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
      if (!resolves(href)) fail(`${file}: broken internal link ${href}`);
    }
  }
}

if (errors.length) {
  console.error(`SEO check failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('SEO check passed');
