// Checks what is REALLY on the npm registry for a version, not the working
// tree: downloads the tarball of each of the five packages and verifies that
// the files a release must contain are there and that `artisanform/schema`
// declares every export in the API snapshot. It exists because a stale build
// can be published by hand (0.3.0-beta.1 had broken kit typings; 1.0.0-rc.3
// shipped an old core `dist`) and every other check runs on local files.
// Usage: node scripts/verify-registry.mjs [version]   (default: package.json)
// Run it right after publishing; if it fails, publish a fixed version and
// `npm deprecate` the bad one.
import { execSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version =
  process.argv[2] ??
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

const packages = [
  {
    name: 'artisanform',
    files: [
      'dist/index.js',
      'dist/index.d.ts',
      'dist/schema.js',
      'dist/schema/index.d.ts',
      'dist/schema.json',
      'dist/builder.js',
      'dist/builder.css',
      'dist/style.css',
      'dist/style.css.d.ts',
      'dist/builder.css.d.ts',
      'bin/artisanform.mjs',
    ],
  },
  ...['bootstrap', 'mui', 'tailwind'].map((k) => ({
    name: `@beardartisans/ui-${k}`,
    files: ['dist/index.js', 'dist/index.d.ts'],
  })),
  { name: '@beardartisans/ui-scss', files: ['scss/_index.scss'] },
];

/** Every `.d.ts` under a directory, concatenated (types live in subfiles of the index). */
const declarations = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .map((e) =>
      e.isDirectory()
        ? declarations(join(dir, e.name))
        : e.name.endsWith('.d.ts')
          ? readFileSync(join(dir, e.name), 'utf8')
          : '',
    )
    .join('\n');

/** Export names of `artisanform/schema` from the API snapshot (`name: signature` lines). */
const schemaExports = readFileSync(join(root, 'api/schema.api.txt'), 'utf8')
  .split('\n')
  .map((l) => l.match(/^([A-Za-z_$][\w$]*):/)?.[1])
  .filter(Boolean);

const work = mkdtempSync(join(tmpdir(), 'af-registry-'));
const problems = [];

for (const { name, files } of packages) {
  const dir = join(work, name.replace(/[@/]/g, '_'));
  mkdirSync(dir, { recursive: true });
  try {
    execSync(
      `npm pack ${name}@${version} --prefer-online --pack-destination ${dir}`,
      {
        cwd: dir,
        stdio: 'ignore',
      },
    );
    execSync('tar -xzf *.tgz', { cwd: dir, stdio: 'ignore' });
  } catch {
    problems.push(
      `${name}@${version}: not on the registry (or not propagated yet: retry in a minute)`,
    );
    continue;
  }
  const pkg = JSON.parse(
    readFileSync(join(dir, 'package/package.json'), 'utf8'),
  );
  if (name === 'artisanform' && !pkg.bin?.artisanform)
    problems.push(
      `${name}@${version}: package.json has no \`bin\` (npm dropped the CLI)`,
    );
  if (pkg.version !== version)
    problems.push(`${name}: tarball is ${pkg.version}, expected ${version}`);
  for (const f of files)
    try {
      readFileSync(join(dir, 'package', f));
    } catch {
      problems.push(
        `${name}@${version}: missing ${f} (stale or incomplete build)`,
      );
    }
  if (name === 'artisanform') {
    let types = '';
    try {
      types = declarations(join(dir, 'package/dist/schema'));
    } catch {}
    const missing = schemaExports.filter(
      (n) => !new RegExp(`\\b${n.replace('$', '\\$')}\\b`).test(types),
    );
    if (missing.length)
      problems.push(
        `artisanform@${version}: the declarations under dist/schema lack ${missing.length} export(s): ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`,
      );
  }
  console.log(`checked ${name}@${version}`);
}
rmSync(work, { recursive: true, force: true });

if (problems.length) {
  console.error(
    `\nverify-registry FAILED for ${version}:\n- ${problems.join('\n- ')}`,
  );
  process.exit(1);
}
console.log(
  `verify-registry OK: the five packages at ${version} contain what a release must`,
);
