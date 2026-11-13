import { expect, test } from 'bun:test';
import { canonicalize, schemaHash } from '../canonical';

test('key order does not matter, at any depth; array order does', () => {
  expect(canonicalize({ b: 1, a: { d: [3, 2], c: null } })).toBe(
    canonicalize({ a: { c: null, d: [3, 2] }, b: 1 }),
  );
  expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
});

test('undefined properties are dropped', () => {
  expect(canonicalize({ a: 1, b: undefined })).toBe('{"a":1}');
});

test('the hash is stable, hexadecimal and sensitive to content', async () => {
  const a = await schemaHash({ x: 1, y: [1, 2] });
  expect(a).toMatch(/^[0-9a-f]{64}$/);
  expect(await schemaHash({ y: [1, 2], x: 1 })).toBe(a);
  expect(await schemaHash({ x: 2, y: [1, 2] })).not.toBe(a);
  // SHA-256 of the canonical text of {} ("{}")
  expect(await schemaHash({})).toBe(
    '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a',
  );
});
