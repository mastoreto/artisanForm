import { expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN =
  /from\s+['"](react|react-dom|react\/[^'"]*|formik|yup|zustand[^'"]*)['"]/;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

test('the contract and persistence layers do not depend on the form engine', () => {
  const root = join(import.meta.dir, '..');
  const offenders = ['schema', 'persistence']
    .flatMap((d) => {
      try {
        return files(join(root, d));
      } catch {
        return [];
      }
    })
    .filter((f) => FORBIDDEN.test(readFileSync(f, 'utf8')));
  expect(offenders).toEqual([]);
});
