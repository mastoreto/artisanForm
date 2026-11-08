// Checks what `npm publish` would upload: only the built package, the
// license and the readme; no sources, tests, stories or config.
// Usage: node scripts/check-pack.mjs   (after `bun run build`)
import { execSync } from 'node:child_process';

const [{ files }] = JSON.parse(
  execSync('npm pack --dry-run --json', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);
const paths = files.map((f) => f.path);
const problems = [];

for (const required of [
  'LICENSE',
  'README.md',
  'package.json',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/style.css',
]) {
  if (!paths.includes(required)) problems.push(`missing: ${required}`);
}
for (const p of paths) {
  const allowed =
    p.startsWith('dist/') ||
    ['LICENSE', 'README.md', 'package.json'].includes(p);
  if (!allowed) problems.push(`unexpected file: ${p}`);
  if (/(__tests__|\.test\.|\.stories\.)/.test(p))
    problems.push(`test/story file: ${p}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`pack OK: ${paths.length} files`);
