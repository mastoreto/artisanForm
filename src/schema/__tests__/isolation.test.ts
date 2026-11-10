import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PKGS =
  'react|react-dom|react\\/[^\'"]*|react-hook-form|@hookform\\/[^\'"]*|yup|zustand[^\'"]*';
// `from 'x'`, `import 'x'`, `import('x')` and `require('x')`.
const BANNED_PACKAGE = new RegExp(
  `(?:from\\s*|import\\s*\\(?\\s*|require\\s*\\(\\s*)['"](?:${PKGS})['"]`,
);
// Relative imports that reach the engine, the UI or the integrations.
const BANNED_LAYER =
  /(?:from\s*|import\s*\(?\s*|require\s*\(\s*)['"](?:\.\.?\/)+(?:engine|components|integrations|styles)(?:\/[^'"]*)?['"]/;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === '__tests__' ? [] : files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

test('the detectors catch every import form', () => {
  for (const line of [
    "import x from 'react';",
    "import 'react';",
    "const m = await import('react-hook-form');",
    "const m = require('zustand/middleware');",
    "export { a } from 'yup';",
  ])
    expect(BANNED_PACKAGE.test(line)).toBe(true);
  for (const line of [
    "import { a } from '../engine/form';",
    "import('../../components/ui');",
    "import '../integrations/payments';",
  ])
    expect(BANNED_LAYER.test(line)).toBe(true);
  expect(BANNED_PACKAGE.test("import { a } from './reactive';")).toBe(false);
  expect(BANNED_LAYER.test("import { a } from '../schema/parser';")).toBe(
    false,
  );
});

test('the contract and persistence layers do not depend on the form engine', () => {
  const root = join(import.meta.dir, '../..');
  const sources = ['schema', 'persistence'].flatMap((d) => {
    try {
      return files(join(root, d));
    } catch {
      return [];
    }
  });
  expect(sources.length).toBeGreaterThan(0);
  const offenders = sources.filter((f) => {
    const code = readFileSync(f, 'utf8');
    return BANNED_PACKAGE.test(code) || BANNED_LAYER.test(code);
  });
  expect(offenders).toEqual([]);
});
