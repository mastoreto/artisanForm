import type { JSONValue } from './types';

/** True when `v` is plain JSON data (no functions, class instances, NaN, undefined in arrays…). */
export const isJSONValue = (v: unknown, depth = 0): v is JSONValue => {
  if (depth > 64) return false;
  if (v === null || typeof v === 'string' || typeof v === 'boolean')
    return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every((x) => isJSONValue(x, depth + 1));
  if (typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return false;
    return Object.values(v as object).every((x) => isJSONValue(x, depth + 1));
  }
  return false;
};

/** Deep copy of JSON data (never shares references with the input). */
export const cloneJSON = <T>(v: T): T => structuredClone(v);
