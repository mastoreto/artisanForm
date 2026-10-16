import { expect, test } from 'bun:test';
import { resolveStep } from '../navigation';

const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('stays on the same step when it is still visible, even if it moved', () => {
  expect(resolveStep(steps, 2, 'b')).toBe(1);
});

test('a vanished step falls to the same position, clamped to the end', () => {
  expect(resolveStep(steps, 1, 'gone')).toBe(1);
  expect(resolveStep(steps, 5, 'gone')).toBe(2);
  expect(resolveStep(steps, -3)).toBe(0);
});

test('no steps resolves to 0', () => {
  expect(resolveStep([], 4, 'a')).toBe(0);
});
