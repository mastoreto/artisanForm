import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The CLI runs the built library (dist/), so these tests need `bun run build`
// first (CI builds before testing).
const root = join(import.meta.dir, '../../..');
const built = existsSync(join(root, 'dist/schema.js'));

const run = (...args: string[]) => {
  const r = spawnSync('node', [join(root, 'bin/artisanform.mjs'), ...args], {
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
};

describe.skipIf(!built)('artisanform CLI', () => {
  let dir = '';
  const file = (name: string, content: unknown) => {
    const path = join(dir, name);
    writeFileSync(
      path,
      typeof content === 'string' ? content : JSON.stringify(content),
    );
    return path;
  };
  const schema = {
    schemaVersion: 1,
    id: 'f',
    steps: [
      {
        id: 'a',
        type: 'form',
        title: 'A',
        fields: [{ name: 'n', type: 'text' }],
      },
    ],
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'af-cli-'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('a valid schema exits 0', () => {
    const r = run('validate', file('ok.json', schema));
    expect(r.code).toBe(0);
    expect(r.out).toContain('ok (0 errors, 0 warnings)');
  });

  test('an invalid schema exits 1 and says where and why', () => {
    const r = run('validate', file('bad.json', { ...schema, steps: [] }));
    expect(r.code).toBe(1);
    expect(r.out).toContain('error empty-steps steps');
  });

  test('every file is checked, and one bad file fails the run', () => {
    const r = run(
      'validate',
      file('a.json', schema),
      file('b.json', { ...schema, extra: 1 }),
    );
    expect(r.code).toBe(1);
    expect(r.out).toContain('a.json: ok');
    expect(r.out).toContain('unknown-property');
  });

  test('broken JSON is a schema error, a missing file is a usage error', () => {
    const broken = run('validate', file('broken.json', '{ nope'));
    expect(broken.code).toBe(1);
    expect(broken.out).toContain('invalid-json');
    expect(run('validate', join(dir, 'missing.json')).code).toBe(2);
  });

  test('limits, policy and manifest go through to checkSchema', () => {
    const f = file('lim.json', schema);
    expect(run('validate', f, '--max-steps', '0').code).toBe(1);
    const withHook = file('hook.json', {
      ...schema,
      steps: [{ ...schema.steps[0], hooks: { onEnter: 'track' } }],
    });
    expect(run('validate', withHook).code).toBe(0);
    expect(
      run('validate', withHook, '--policy', file('p.json', { hooks: [] })).code,
    ).toBe(1);
    const manifest = file('m.json', {
      contract: 'artisanform.capabilities/1',
      fieldTypes: ['text'],
      stepKinds: ['form'],
      features: [],
      refs: {
        hooks: [],
        waits: [],
        renderers: [],
        actions: [],
        options: [],
        dependentOptions: [],
        paymentProviders: [],
        storage: [],
      },
    });
    const r = run('validate', withHook, '--manifest', manifest);
    expect(r.code).toBe(1);
    expect(r.out).toContain('missing-reference');
  });

  test('--json prints the machine-readable report', () => {
    const r = run('validate', file('j.json', schema), '--json');
    expect(JSON.parse(r.out)).toEqual([
      { file: join(dir, 'j.json'), ok: true, issues: [] },
    ]);
  });

  test('hash is stable and matches for equal content', () => {
    const a = run('hash', file('h1.json', { b: 1, a: [1, 2] }));
    const b = run('hash', file('h2.json', { a: [1, 2], b: 1 }));
    expect(a.code).toBe(0);
    expect(a.out.trim()).toMatch(/^[0-9a-f]{64}$/);
    expect(a.out).toBe(b.out);
  });

  test('json-schema prints the contract schema', () => {
    const r = run('json-schema');
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).$id).toBe(
      'https://unpkg.com/artisanform/dist/schema.json',
    );
  });

  test('wrong usage exits 2', () => {
    expect(run().code).toBe(2);
    expect(run('nope').code).toBe(2);
    expect(run('validate').code).toBe(2);
    expect(run('validate', 'x.json', '--bogus').code).toBe(2);
    expect(run('hash').code).toBe(2);
  });
});
