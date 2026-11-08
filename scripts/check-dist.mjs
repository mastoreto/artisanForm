// Verifies the built package: React Compiler output is present, every bare
// import is a declared dependency, and React itself is not bundled.
// Usage: node scripts/check-dist.mjs   (after `bun run build`)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : /\.(js|cjs)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
const root = (spec) =>
  spec.startsWith('@')
    ? spec.split('/').slice(0, 2).join('/')
    : spec.split('/')[0];

const errors = [];
let compiled = 0;
for (const file of files('dist')) {
  const src = readFileSync(file, 'utf8');
  const specs = [
    ...src.matchAll(
      /(?:from\s*|import\s*\(\s*|require\(\s*)["']([^"'.][^"']*)["']/g,
    ),
  ].map((m) => m[1]);
  for (const s of new Set(specs))
    if (!declared.has(root(s)) && !s.startsWith('node:'))
      errors.push(`${file}: imports undeclared "${s}"`);
  if (src.includes('react.memo_cache_sentinel')) compiled++;
  if (/__CLIENT_INTERNALS_DO_NOT_USE|react\.transitional\.element/.test(src))
    errors.push(`${file}: contains React internals (bundled React?)`);
}
if (!declared.has('react-compiler-runtime'))
  errors.push('react-compiler-runtime must be a dependency');
if (compiled === 0) errors.push('no compiled output found (compiler off?)');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`dist OK: ${compiled} compiled file(s), all imports declared`);
