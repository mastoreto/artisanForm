// Checks what `npm publish` would upload for the core package and for every
// publishable kit: only the built output, the license, the readme and
// package.json (no sources, tests or stories), and that the kits are in
// lockstep with the core version.
// Usage: node scripts/check-pack.mjs   (after `bun run build:kits`)
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const kits = ['bootstrap', 'mui', 'tailwind', 'scss'].map((k) => ({
  dir: `packages/ui-${k}`,
  out: k === 'scss' ? 'scss/' : 'dist/',
  required:
    k === 'scss' ? ['scss/_index.scss'] : ['dist/index.js', 'dist/index.d.ts'],
}));
const targets = [
  {
    dir: '.',
    out: 'dist/',
    // The CLI (`bin` in package.json) ships next to the build output.
    also: ['bin/'],
    required: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/style.css',
      'dist/style.css.d.ts',
      'dist/schema.json',
      'bin/artisanform.mjs',
      'dist/schema.js',
      'dist/schema/index.d.ts',
    ],
  },
  ...kits,
];
const coreVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
const problems = [];

for (const { dir, out, also = [], required } of targets) {
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
  const label = pkg.name;
  const [{ files }] = JSON.parse(
    execSync('npm pack --dry-run --json', {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  );
  const paths = files.map((f) => f.path);

  // What `npm publish` itself would change: it silently drops or rewrites what
  // it considers invalid (a `bin` path starting with `./` lost the CLI in
  // 1.0.0-rc.3), and `npm pack` does not say so.
  const publish = spawnSync(
    'npm',
    ['publish', '--dry-run', '--ignore-scripts'],
    {
      cwd: dir,
      encoding: 'utf8',
    },
  );
  if (/auto-corrected/.test(publish.stderr ?? ''))
    problems.push(
      `${label}: npm publish would correct package.json (${(publish.stderr.match(/publish "[^\n]*/g) ?? []).join(' ')}); run \`npm pkg fix\` and commit it`,
    );

  if (pkg.version !== coreVersion)
    problems.push(`${label}: version ${pkg.version} != core ${coreVersion}`);
  if (pkg.publishConfig?.access !== 'public')
    problems.push(`${label}: publishConfig.access must be "public"`);
  for (const r of ['LICENSE', 'README.md', 'package.json', ...required]) {
    if (!paths.includes(r)) problems.push(`${label}: missing ${r}`);
  }
  for (const p of paths) {
    const allowed =
      p.startsWith(out) ||
      also.some((prefix) => p.startsWith(prefix)) ||
      ['LICENSE', 'README.md', 'package.json'].includes(p);
    if (!allowed) problems.push(`${label}: unexpected file ${p}`);
    if (/(__tests__|\.test\.|\.stories\.)/.test(p))
      problems.push(`${label}: test/story file ${p}`);
  }
  console.log(`${label}: ${paths.length} files`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('pack OK');
