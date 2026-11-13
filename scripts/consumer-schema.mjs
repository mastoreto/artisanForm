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
import { canonicalize, checkSchema, compareSchemas, describeCapabilities, schemaHash, sensitiveAnswerKeys } from 'artisanform/schema';
// the single gate: contract, limits, and what the front can run
assert.equal(checkSchema(schema).ok, true);
assert.equal(checkSchema({ ...schema, steps: [] }).ok, false);
assert.deepEqual(checkSchema(schema, { limits: { maxSteps: 1 } }).issues.map((i) => i.code), ['too-many-steps']);
const needsHook = { ...schema, steps: [{ ...schema.steps[0], hooks: { onEnter: 'track' } }, schema.steps[1]] };
assert.deepEqual(checkSchema(needsHook, { manifest: describeCapabilities() }).issues.map((i) => i.code), ['missing-reference']);
assert.equal(checkSchema(needsHook, { manifest: describeCapabilities({ extensions: { hooks: { track: 1 } } }) }).ok, true);
// hash, canonical text and revision comparison
assert.equal(canonicalize({ b: 1, a: 2 }), '{"a":2,"b":1}');
assert.match(await schemaHash(schema), /^[0-9a-f]{64}$/);
const next = { ...schema, steps: [{ ...schema.steps[0], fields: [...schema.steps[0].fields, { type: 'tel', name: 'phone', sensitive: true }] }, schema.steps[1]] };
assert.deepEqual(compareSchemas(schema, next).added, ['phone']);
assert.equal(compareSchemas(schema, next).compatible, true);
assert.deepEqual(sensitiveAnswerKeys(next), ['phone']);
console.log('gate OK: checkSchema, schemaHash, compareSchemas');
`,
);
sh('node check.mjs', app);

// The JSON Schema ships as `artisanform/schema.json` and the CLI as a bin.
writeFileSync(
  join(app, 'ok.json'),
  JSON.stringify({
    schemaVersion: 1,
    id: 'cli',
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        fields: [{ type: 'text', name: 'n' }],
      },
    ],
  }),
);
writeFileSync(
  join(app, 'bad.json'),
  JSON.stringify({ schemaVersion: 1, id: 'cli', steps: [] }),
);
writeFileSync(
  join(app, 'assets.mjs'),
  `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const jsonSchema = createRequire(import.meta.url)('artisanform/schema.json');
assert.equal(jsonSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.ok(jsonSchema.$defs.field && jsonSchema.$defs.step);
console.log('json schema OK: artisanform/schema.json resolves');
`,
);
sh('node assets.mjs', app);
sh('npx --no-install artisanform validate ok.json', app);
let failed = false;
try {
  execSync('npx --no-install artisanform validate bad.json', {
    cwd: app,
    stdio: 'pipe',
  });
} catch (error) {
  failed = error.status === 1;
}
if (!failed) throw new Error('the CLI must exit 1 on an invalid schema');
console.log('cli OK: artisanform validate runs from the installed package');

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
