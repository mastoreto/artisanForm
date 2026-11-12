// Gate to run before `npm publish`, by hand or from the Release workflow.
// It catches what went wrong in 0.3.0-beta.1, where three kits were published
// with broken typings because they were built where `artisanform` did not
// resolve to this repo:
//   1. every kit resolves `artisanform` to the repo root;
//   2. every `dist` is newer than its sources (no stale build is packed);
//   3. every published `.d.ts` type-checks where the kit lives;
//   4. the packed core and kits install, type-check and build in a clean app.
// Usage: node scripts/prepublish-check.mjs [--skip-consumer]   (after the builds)
//        node scripts/prepublish-check.mjs --self-test
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KITS = ['bootstrap', 'mui', 'tailwind', 'scss'];
const SLACK_MS = 1000;

/** Problem text when `artisanform` does not resolve to `repo` from `kitDir`. */
export const checkKitLink = (kitDir, repo) => {
  const linked = join(kitDir, 'node_modules', 'artisanform');
  let target = null;
  try {
    target = existsSync(linked)
      ? realpathSync(linked)
      : dirname(
          createRequire(join(kitDir, 'x.js')).resolve(
            'artisanform/package.json',
          ),
        );
  } catch {
    // unresolved: reported below
  }
  if (target && realpathSync(target) === realpathSync(repo)) return null;
  return `${kitDir}: \`artisanform\` resolves to ${target ?? 'nothing'}, not to the repo root. Run \`bun install\` and rebuild (see docs/releasing.md).`;
};

const sources = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(p);
    return /\.(test|stories)\./.test(e.name) ? [] : [p];
  });

/** Problem text when `built` is older than the newest file under `srcDir`. */
export const checkFresh = (built, srcDir) => {
  if (!existsSync(built)) return `${built} is missing: build first.`;
  const builtAt = statSync(built).mtimeMs;
  const newest = sources(srcDir)
    .map((f) => ({ f, t: statSync(f).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  return newest && newest.t > builtAt + SLACK_MS
    ? `${built} is older than ${newest.f}: rebuild before publishing.`
    : null;
};

/** Type-checks a published declaration file in the context of its package. */
const checkDeclarations = (pkgDir, file) => {
  const tsc = join(root, 'node_modules', '.bin', 'tsc');
  try {
    execSync(
      `${tsc} --ignoreConfig --noEmit --strict --skipLibCheck false --module esnext --moduleResolution bundler --target es2022 --jsx react-jsx ${file}`,
      { cwd: pkgDir, encoding: 'utf8', stdio: 'pipe' },
    );
    return null;
  } catch (e) {
    return `${join(pkgDir, file)} does not type-check:\n${String(e.stdout ?? e.message).trim()}`;
  }
};

const selfTest = () => {
  const dir = mkdtempSync(join(tmpdir(), 'af-gate-'));
  try {
    const repo = join(dir, 'repo');
    const kit = join(dir, 'kit');
    const empty = join(dir, 'empty');
    for (const d of [repo, join(kit, 'node_modules'), empty]) {
      mkdirSync(d, { recursive: true });
    }
    writeFileSync(join(repo, 'package.json'), '{"name":"artisanform"}');

    // A link to a directory that has no `artisanform` is what broke beta.1.
    symlinkSync(empty, join(kit, 'node_modules', 'artisanform'));
    assert.ok(checkKitLink(kit, repo), 'a wrong link must be reported');
    rmSync(join(kit, 'node_modules', 'artisanform'));
    symlinkSync(repo, join(kit, 'node_modules', 'artisanform'));
    assert.equal(checkKitLink(kit, repo), null, 'a right link must pass');

    // A dist older than its sources must be reported.
    const src = join(dir, 'src');
    mkdirSync(src);
    writeFileSync(join(src, 'a.ts'), '');
    writeFileSync(join(dir, 'out.js'), '');
    const old = new Date(Date.now() - 60_000);
    utimesSync(join(dir, 'out.js'), old, old);
    assert.ok(
      checkFresh(join(dir, 'out.js'), src),
      'a stale build must be reported',
    );
    const now = new Date();
    utimesSync(join(dir, 'out.js'), now, now);
    assert.equal(
      checkFresh(join(dir, 'out.js'), src),
      null,
      'a fresh build passes',
    );
    console.log('self-test OK');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const run = () => {
  const problems = [];
  const core = checkFresh(join(root, 'dist/index.js'), join(root, 'src'));
  if (core) problems.push(core);

  for (const k of KITS) {
    const dir = join(root, 'packages', `ui-${k}`);
    const link = checkKitLink(dir, root);
    if (link) problems.push(link);
    if (k === 'scss') continue; // Sass only: nothing is compiled
    const fresh = checkFresh(join(dir, 'dist/index.js'), join(dir, 'src'));
    if (fresh) problems.push(fresh);
    else if (!link) {
      const decl = checkDeclarations(dir, 'dist/index.d.ts');
      if (decl) problems.push(decl);
    }
  }

  if (problems.length) {
    console.error(`${problems.join('\n\n')}\n\nprepublish check FAILED`);
    process.exit(1);
  }
  console.log('links, freshness and declarations OK');

  if (!process.argv.includes('--skip-consumer')) {
    for (const react of ['19', '18']) {
      execSync(`node scripts/consumer-test.mjs ${react}`, {
        cwd: root,
        stdio: 'inherit',
      });
    }
  }
  console.log('prepublish check OK');
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) selfTest();
  else run();
}
