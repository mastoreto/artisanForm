import { expect, test } from 'bun:test';
import { matchesCondition } from '../components/ArtisanForm/conditions';
import {
  conditionFields,
  evaluateCondition,
  fromLegacyCondition,
  isFilled,
} from './conditions';
import type { ConditionV1 } from './types';

const ev = (c: ConditionV1, values: Record<string, unknown>) =>
  evaluateCondition(c, values);

test('eq / neq are strict (no implicit coercion)', () => {
  const eq: ConditionV1 = { field: 'a', operator: 'eq', value: 5 };
  expect(ev(eq, { a: 5 })).toBe(true);
  expect(ev(eq, { a: '5' })).toBe(false);
  expect(ev({ ...eq, operator: 'neq' }, { a: '5' })).toBe(true);
  expect(ev({ field: 'a', operator: 'eq', value: null }, { a: null })).toBe(
    true,
  );
  // null and undefined are different things
  expect(ev({ field: 'a', operator: 'eq', value: null }, {})).toBe(false);
  expect(
    ev({ field: 'a', operator: 'eq', value: ['x', 'y'] }, { a: ['x', 'y'] }),
  ).toBe(true);
  expect(
    ev({ field: 'a', operator: 'eq', value: ['x', 'y'] }, { a: ['y', 'x'] }),
  ).toBe(false);
});

test('gt / gte / lt / lte compare number↔number and string↔string only', () => {
  const c = (
    operator: 'gt' | 'gte' | 'lt' | 'lte',
    value: number | string,
  ): ConditionV1 => ({
    field: 'n',
    operator,
    value,
  });
  expect(ev(c('gt', 3), { n: 4 })).toBe(true);
  expect(ev(c('gte', 4), { n: 4 })).toBe(true);
  expect(ev(c('lt', 4), { n: 4 })).toBe(false);
  expect(ev(c('lte', 4), { n: 4 })).toBe(true);
  expect(ev(c('gt', '2030-01-01'), { n: '2031-01-01' })).toBe(true);
  // different types never compare, in either direction
  expect(ev(c('gt', 3), { n: '4' })).toBe(false);
  expect(ev(c('lt', 3), { n: '2' })).toBe(false);
  expect(ev(c('gte', 3), {})).toBe(false);
  expect(ev(c('gt', 3), { n: null })).toBe(false);
});

test('in / notIn: scalar membership and array intersection', () => {
  const inA: ConditionV1 = { field: 'a', operator: 'in', value: ['x', 'y'] };
  expect(ev(inA, { a: 'x' })).toBe(true);
  expect(ev(inA, { a: 'z' })).toBe(false);
  expect(ev(inA, { a: ['z', 'y'] })).toBe(true);
  expect(ev(inA, { a: [] })).toBe(false);
  expect(ev(inA, {})).toBe(false);
  expect(ev({ ...inA, operator: 'notIn' }, { a: 'z' })).toBe(true);
  expect(ev({ ...inA, operator: 'notIn' }, { a: ['z', 'y'] })).toBe(false);
  // a non-array list never matches
  expect(ev({ field: 'a', operator: 'in', value: 'x' }, { a: 'x' })).toBe(
    false,
  );
});

test('filled / empty', () => {
  for (const v of ['a', 0, false, ['x'], 5]) expect(isFilled(v)).toBe(true);
  for (const v of [undefined, null, '', [], [''], [null]])
    expect(isFilled(v)).toBe(false);
  expect(ev({ field: 'a', operator: 'filled' }, { a: 'x' })).toBe(true);
  expect(ev({ field: 'a', operator: 'empty' }, {})).toBe(true);
  expect(ev({ field: 'a', operator: 'empty' }, { a: 0 })).toBe(false);
});

test('all / any / not compose, with the documented empty cases', () => {
  const yes: ConditionV1 = { field: 'a', operator: 'eq', value: 1 };
  const no: ConditionV1 = { field: 'a', operator: 'eq', value: 2 };
  const v = { a: 1 };
  expect(ev({ all: [yes, yes] }, v)).toBe(true);
  expect(ev({ all: [yes, no] }, v)).toBe(false);
  expect(ev({ any: [no, yes] }, v)).toBe(true);
  expect(ev({ any: [no, no] }, v)).toBe(false);
  expect(ev({ not: no }, v)).toBe(true);
  expect(ev({ not: { all: [yes, no] } }, v)).toBe(true);
  expect(ev({ all: [] }, v)).toBe(true);
  expect(ev({ any: [] }, v)).toBe(false);
});

test('coerce: "string" compares as strings and reads null/undefined as empty', () => {
  const c: ConditionV1 = {
    field: 'a',
    operator: 'in',
    value: ['5', ''],
    coerce: 'string',
  };
  expect(ev(c, { a: 5 })).toBe(true);
  expect(ev(c, { a: null })).toBe(true);
  expect(ev(c, {})).toBe(true);
  expect(ev(c, { a: 6 })).toBe(false);
});

test('a condition is plain JSON and its fields can be listed', () => {
  const c: ConditionV1 = {
    all: [
      { field: 'a', operator: 'filled' },
      {
        not: {
          any: [
            { field: 'b', operator: 'eq', value: 'x' },
            { field: 'c', operator: 'gt', value: 1 },
          ],
        },
      },
    ],
  };
  expect(JSON.parse(JSON.stringify(c))).toEqual(c);
  expect(conditionFields(c)).toEqual(['a', 'b', 'c']);
});

test('fromLegacyCondition reproduces 0.2.0 matchesCondition for every value shape', () => {
  const samples: unknown[] = [
    undefined,
    null,
    '',
    ' ',
    'a',
    'b',
    'a,b',
    0,
    1,
    5,
    '5',
    true,
    false,
    [],
    [''],
    ['a'],
    ['b'],
    ['a', 'b'],
    [5],
    ['5'],
  ];
  const legacy = [
    { field: 'f' },
    { field: 'f', not: true },
    { field: 'f', equals: 'a' },
    { field: 'f', equals: 'a', not: true },
    { field: 'f', equals: ['a', 'b'] },
    { field: 'f', equals: ['a', 'b'], not: true },
    { field: 'f', equals: '5' },
    { field: 'f', equals: '' },
    { field: 'f', equals: [] as string[] },
  ];
  for (const cond of legacy) {
    for (const value of samples) {
      const values = { f: value };
      expect({
        cond,
        value,
        got: ev(fromLegacyCondition(cond), values),
      }).toEqual({
        cond,
        value,
        got: matchesCondition(cond, values),
      });
    }
  }
});
