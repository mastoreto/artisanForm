import { describe, expect, test } from 'bun:test';
import { canJumpTo, resolveBack, resolveNext, usesFlow } from '../transitions';

const steps = [
  {
    id: 'plan',
    next: [
      {
        when: { field: 'plan', operator: 'eq' as const, value: 'pro' },
        to: 'pay',
      },
      { to: 'review' },
    ],
  },
  { id: 'pay', revisit: 'deny' as const },
  { id: 'review', next: [{ to: 'plan' }] },
  { id: 'edit', loop: { max: 2 } },
  { id: 'end' },
];

describe('resolveNext', () => {
  test('first matching edge wins, an unconditional edge is the default', () => {
    expect(resolveNext(steps, 0, { plan: 'pro' }, [])).toBe(1);
    expect(resolveNext(steps, 0, { plan: 'free' }, [])).toBe(2);
  });

  test('no edge means the next visible step', () => {
    expect(resolveNext(steps, 3, {}, [])).toBe(4);
  });

  test('a target that is not visible is skipped', () => {
    const visible = steps.filter((s) => s.id !== 'pay');
    expect(resolveNext(visible, 0, { plan: 'pro' }, [])).toBe(1); // review
  });

  test('a way back needs loop.max and stops once it is used up', () => {
    // review → plan is a re-entry of plan, which has no loop: falls back to linear
    expect(resolveNext(steps, 2, {}, ['plan'])).toBe(3);
    const looping = [
      { id: 'a', loop: { max: 1 } },
      { id: 'b', next: [{ to: 'a' }] },
      { id: 'c' },
    ];
    expect(resolveNext(looping, 1, {}, ['a'])).toBe(0); // 1st re-entry
    expect(resolveNext(looping, 1, {}, ['a', 'b', 'a'])).toBe(2); // used up
  });

  test('a deny step is never entered again', () => {
    const s = [
      { id: 'a', next: [{ to: 'p' }] },
      { id: 'p', revisit: 'deny' as const, loop: { max: 5 } },
      { id: 'b' },
    ];
    expect(resolveNext(s, 0, {}, [])).toBe(1);
    expect(resolveNext(s, 0, {}, ['p'])).toBe(1); // linear fallback, not the edge
  });

  test('result steps are not transition targets', () => {
    const s = [
      { id: 'a', next: [{ to: 'r' }] },
      { id: 'b' },
      { id: 'r', kind: 'result' },
    ];
    expect(resolveNext(s, 0, {}, [])).toBe(1);
  });
});

describe('resolveBack and canJumpTo', () => {
  test('back goes to the last step left', () => {
    expect(resolveBack(steps, ['plan', 'review'])).toEqual({
      index: 2,
      history: ['plan'],
    });
    expect(resolveBack(steps, [])).toBeNull();
  });

  test('back stops at a deny step', () => {
    expect(resolveBack(steps, ['plan', 'pay'])).toBeNull();
  });

  test('a jump cannot cross a finished deny step', () => {
    expect(canJumpTo(steps, ['plan', 'review'], 'plan')).toBe(true);
    expect(canJumpTo(steps, ['plan', 'pay', 'review'], 'plan')).toBe(false);
    expect(canJumpTo(steps, ['plan', 'pay', 'review'], 'review')).toBe(true);
    expect(canJumpTo(steps, ['plan', 'pay'], 'pay')).toBe(false);
  });
});

test('usesFlow is false for linear schemas', () => {
  expect(usesFlow({ steps: [{ id: 'a', title: 'A' }] })).toBe(false);
  expect(usesFlow({ steps: [{ id: 'a', title: 'A', revisit: 'deny' }] })).toBe(
    true,
  );
});
