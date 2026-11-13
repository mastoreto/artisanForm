import type { JSONValue } from './contract/types';

/**
 * A deliberately tiny, declarative subset of JSON Schema to describe the
 * `config` of a custom (`x-…`) field or step. It is plain data, so an app can
 * publish it in its capabilities manifest and a backend can check a schema's
 * `config` without running any of the app's code. The same object is valid
 * JSON Schema, so other languages and database validators can read it too.
 */
export interface ConfigShape {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  enum?: readonly JSONValue[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  /** Shape of every item of an `array`. */
  items?: ConfigShape;
  /** Shape of the known keys of an `object`. */
  properties?: Readonly<Record<string, ConfigShape>>;
  /** Keys an `object` must have. */
  required?: readonly string[];
  /** `false` rejects keys that are not in `properties` (default: allowed). */
  additionalProperties?: boolean;
}

/** What an app declares about one custom type so schemas that use it can be verified. */
export interface CustomTypeSpec {
  /** The schema `type`, starting with `x-`. */
  type: string;
  /** A field type (`fields`) or a step type (`stepTypes`). */
  kind: 'field' | 'step';
  /** Shape of the element's `config`. Omit to accept any JSON. */
  config?: ConfigShape;
  description?: string;
}

export interface ConfigIssue {
  /** Relative to the config: `size`, `sizes[1]`. Empty for the config itself. */
  path: string;
  message: string;
}

const kindOf = (v: unknown): string =>
  v === null
    ? 'null'
    : Array.isArray(v)
      ? 'array'
      : Number.isInteger(v)
        ? 'integer'
        : typeof v;

const matchesType = (type: NonNullable<ConfigShape['type']>, v: unknown) =>
  type === 'number'
    ? typeof v === 'number' && Number.isFinite(v)
    : type === 'integer'
      ? Number.isInteger(v)
      : type === 'array'
        ? Array.isArray(v)
        : type === 'object'
          ? typeof v === 'object' && v !== null && !Array.isArray(v)
          : typeof v === type;

const join = (path: string, key: string | number) =>
  typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key;

/**
 * Checks a value against a {@link ConfigShape}. Returns every problem found,
 * with paths relative to the value, and never throws.
 */
export const validateConfig = (
  shape: ConfigShape,
  value: unknown,
  path = '',
): ConfigIssue[] => {
  const out: ConfigIssue[] = [];
  const fail = (message: string, at = path) => out.push({ path: at, message });

  if (shape.type && !matchesType(shape.type, value)) {
    fail(`expected ${shape.type}, got ${kindOf(value)}`);
    return out;
  }
  if (
    shape.enum &&
    !shape.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))
  )
    fail(
      `must be one of ${shape.enum.map((e) => JSON.stringify(e)).join(', ')}`,
    );

  if (typeof value === 'number') {
    if (shape.minimum !== undefined && value < shape.minimum)
      fail(`must be at least ${shape.minimum}`);
    if (shape.maximum !== undefined && value > shape.maximum)
      fail(`must be at most ${shape.maximum}`);
  }
  if (typeof value === 'string') {
    if (shape.minLength !== undefined && value.length < shape.minLength)
      fail(`must have at least ${shape.minLength} characters`);
    if (shape.maxLength !== undefined && value.length > shape.maxLength)
      fail(`must have at most ${shape.maxLength} characters`);
  }
  if (Array.isArray(value) && shape.items) {
    const items = shape.items;
    value.forEach((item, i) => {
      out.push(...validateConfig(items, item, join(path, i)));
    });
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (shape.properties || shape.required || shape.additionalProperties === false)
  ) {
    const obj = value as Record<string, unknown>;
    for (const key of shape.required ?? [])
      if (obj[key] === undefined) fail('is required', join(path, key));
    for (const [key, v] of Object.entries(obj)) {
      const sub = shape.properties?.[key];
      if (sub) out.push(...validateConfig(sub, v, join(path, key)));
      else if (shape.additionalProperties === false)
        fail('is not a known key', join(path, key));
    }
  }
  return out;
};
