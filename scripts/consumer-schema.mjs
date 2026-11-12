// Proves `artisanform/schema` works where React does not exist: a plain Node
// project that installs the packed core WITHOUT its peers (no React, Yup,
// React Hook Form or Zustand), imports the entry, validates values at runtime
// and type-checks against its declarations with `moduleResolution: NodeNext`.
// Usage: node scripts/consumer-schema.mjs   (after `bun run build`)
//        ARTISAN_SPEC=1.0.0 node scripts/consumer-schema.mjs   (from the registry)
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = mkdtempSync(join(tmpdir(), 'af-schema-consumer-'));
const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });
const spec = process.env.ARTISAN_SPEC;

let dep = spec ?? '';
if (!spec) {
  mkdirSync(join(work, 'pack'));
  sh(`npm pack --pack-destination ${join(work, 'pack')}`, root);
  const tgz = readdirSync(join(work, 'pack')).find((f) => f.endsWith('.tgz'));
  dep = `file:../pack/${tgz}`;
}

const app = join(work, 'app');
mkdirSync(app);
writeFileSync(
  join(app, 'package.json'),
  JSON.stringify(
    {
      name: 'schema-consumer',
      private: true,
      type: 'module',
      dependencies: { artisanform: dep },
    },
    null,
    2,
  ),
);
// Peers are skipped on purpose: this is what a backend without React looks like.
sh('npm install --no-audit --no-fund --legacy-peer-deps', app);

for (const absent of [
  'react',
  'react-dom',
  'yup',
  'react-hook-form',
  'zustand',
]) {
  if (existsSync(join(app, 'node_modules', absent)))
    throw new Error(`${absent} is installed: the check would prove nothing`);
}

writeFileSync(
  join(app, 'check.mjs'),
  `import assert from 'node:assert/strict';
import { normalizeArtisanSchema, parseArtisanSchema, validateValues } from 'artisanform/schema';

const schema = {
  schemaVersion: 1,
  id: 'consumer',
  steps: [
    { id: 'a', type: 'form', title: 'A', fields: [
      { type: 'email', name: 'email', required: true },
      { type: 'select', name: 'plan', required: true, options: [{ value: 'pro', label: 'Pro' }] },
      { type: 'text', name: 'company', required: true, visibleWhen: { field: 'plan', operator: 'eq', value: 'team' } },
    ] },
    { id: 'done', type: 'result', title: 'Done' },
  ],
};

const parsed = parseArtisanSchema(schema);
assert.equal(parsed.success, true);
assert.doesNotThrow(() => normalizeArtisanSchema(schema));

assert.deepEqual(validateValues(schema, { email: 'a@b.co', plan: 'pro' }).issues, []);
const bad = validateValues(schema, { email: 'nope', plan: 'gold' });
assert.deepEqual(bad.issues.map((i) => i.path + ':' + i.code).sort(), ['email:invalidEmail', 'plan:invalidOption']);
assert.deepEqual(validateValues(schema, { email: 'a@b.co', plan: 'pro', x: 1 }, { prune: true }).values, { email: 'a@b.co', plan: 'pro' });
console.log('runtime OK: artisanform/schema works without React, Yup, RHF or Zustand');
`,
);
sh('node check.mjs', app);

writeFileSync(
  join(app, 'check.ts'),
  `import { validateValues, type ArtisanSchemaV1, type ValidationIssue } from 'artisanform/schema';

const schema: ArtisanSchemaV1 = {
  schemaVersion: 1,
  id: 'typed',
  steps: [{ id: 'a', type: 'form', title: 'A', fields: [{ type: 'text', name: 'n' }] }],
};
const issues: ValidationIssue[] = validateValues(schema, { n: 'x' }).issues;
export default issues;
`,
);
writeFileSync(
  join(app, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      module: 'nodenext',
      moduleResolution: 'nodenext',
      target: 'es2022',
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      types: [],
    },
    files: ['check.ts'],
  }),
);
sh(`${join(root, 'node_modules', '.bin', 'tsc')} -p tsconfig.json`, app);
console.log('types OK: the declarations resolve without React types');

if (!process.env.KEEP) rmSync(work, { recursive: true, force: true });
console.log('consumer-schema OK');
