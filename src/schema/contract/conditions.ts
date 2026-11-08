import type {
  ComparisonConditionV1,
  ConditionV1,
  JSONValue,
  PresenceConditionV1,
} from './types';

type Values = Record<string, unknown>;

const toText = (v: unknown): string =>
  v === null || v === undefined ? '' : String(v);

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (
    typeof a === 'object' &&
    typeof b === 'object' &&
    a !== null &&
    b !== null &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        deepEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
      )
    );
  }
  return false;
};

/** `filled`: not undefined/null/''; arrays are filled when some item is. */
export const isFilled = (v: unknown): boolean =>
  Array.isArray(v)
    ? v.some(isFilled)
    : v !== undefined && v !== null && v !== '';

const norm = (v: unknown, coerce: boolean): unknown =>
  coerce ? (Array.isArray(v) ? v.map(toText) : toText(v)) : v;

const equal = (actual: unknown, expected: unknown, coerce: boolean) =>
  deepEqual(norm(actual, coerce), norm(expected, coerce));

/** Scalar ∈ list; an array value matches when any of its items is in the list. */
const isIn = (actual: unknown, list: JSONValue, coerce: boolean) => {
  if (!Array.isArray(list)) return false;
  const items = Array.isArray(actual) ? actual : [actual];
  return items.some((item) => list.some((c) => equal(item, c, coerce)));
};

const order = (actual: unknown, expected: JSONValue): number | null => {
  if (typeof actual === 'number' && typeof expected === 'number')
    return actual - expected;
  if (typeof actual === 'string' && typeof expected === 'string')
    return actual < expected ? -1 : actual > expected ? 1 : 0;
  return null; // different or unsupported types never compare
};

const compare = (cond: ComparisonConditionV1, actual: unknown): boolean => {
  const coerce = cond.coerce === 'string';
  switch (cond.operator) {
    case 'eq':
      return equal(actual, cond.value, coerce);
    case 'neq':
      return !equal(actual, cond.value, coerce);
    case 'in':
      return isIn(actual, cond.value, coerce);
    case 'notIn':
      return !isIn(actual, cond.value, coerce);
    default: {
      const l = coerce ? toText(actual) : actual;
      const r = coerce ? toText(cond.value) : cond.value;
      const diff = order(l, r as JSONValue);
      if (diff === null) return false;
      if (cond.operator === 'gt') return diff > 0;
      if (cond.operator === 'gte') return diff >= 0;
      if (cond.operator === 'lt') return diff < 0;
      return diff <= 0;
    }
  }
};

const isPresence = (
  cond: ComparisonConditionV1 | PresenceConditionV1,
): cond is PresenceConditionV1 =>
  cond.operator === 'filled' || cond.operator === 'empty';

/**
 * Pure and deterministic: no code is executed. A missing field reads as
 * `undefined`. See `docs/schema-v1.md` for the full table of rules.
 */
export const evaluateCondition = (
  cond: ConditionV1,
  values: Values,
): boolean => {
  if ('all' in cond) return cond.all.every((c) => evaluateCondition(c, values));
  if ('any' in cond) return cond.any.some((c) => evaluateCondition(c, values));
  if ('not' in cond) return !evaluateCondition(cond.not, values);
  const actual = values[cond.field];
  if (isPresence(cond))
    return (cond.operator === 'filled') === isFilled(actual);
  return compare(cond, actual);
};

/** Every field name a condition refers to (the parser verifies they exist). */
export const conditionFields = (cond: ConditionV1): string[] => {
  if ('all' in cond) return cond.all.flatMap(conditionFields);
  if ('any' in cond) return cond.any.flatMap(conditionFields);
  if ('not' in cond) return conditionFields(cond.not);
  return [cond.field];
};

/**
 * 0.2.0 `showIf` → v1. `equals` becomes a string-coerced `in` (that is how
 * 0.2.0 compared), no `equals` becomes `filled`, `not` becomes `{ not }`.
 */
export const fromLegacyCondition = (legacy: {
  field: string;
  equals?: string | string[];
  not?: boolean;
}): ConditionV1 => {
  const base: ConditionV1 =
    legacy.equals === undefined
      ? { field: legacy.field, operator: 'filled' }
      : {
          field: legacy.field,
          operator: 'in',
          value: Array.isArray(legacy.equals) ? legacy.equals : [legacy.equals],
          coerce: 'string',
        };
  return legacy.not ? { not: base } : base;
};
