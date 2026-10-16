/**
 * Public, serializable building blocks of ArtisanSchema v1.
 *
 * Nothing in `src/schema` may import React, Formik, Yup or Zustand: the
 * contract must survive an engine migration untouched (enforced by a test and
 * a Biome rule).
 */

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue =
  | JSONPrimitive
  | JSONValue[]
  | { [key: string]: JSONValue };
export type JSONObject = { [key: string]: JSONValue };

export interface OptionV1 {
  value: string;
  label: string;
}

// ---- UI: semantic and deliberately small (no CSS, no Tailwind classes) ----

export interface FormUIConfig {
  layout?: 'vertical' | 'horizontal';
  density?: 'compact' | 'comfortable';
  labelPosition?: 'top' | 'left';
}

export interface StepUIConfig {
  /** Grid columns for the step's fields. */
  columns?: 1 | 2;
}

export interface FieldUIConfig {
  /** Columns the field spans in a 2-column step. */
  span?: 1 | 2;
  /** Free name a custom renderer may interpret. */
  variant?: string;
}

// ---- Conditions: declarative, deterministic, no code ----

export type ComparisonOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn';

export interface ComparisonConditionV1 {
  /** Name of the field whose current value is tested. */
  field: string;
  operator: ComparisonOperator;
  /** `in`/`notIn` need an array. */
  value: JSONValue;
  /**
   * Opt-in: compare as strings (`null`/`undefined` become `''`). Used to
   * reproduce 0.2.0 `showIf`; plain v1 comparisons are strict.
   */
  coerce?: 'string';
}

export interface PresenceConditionV1 {
  field: string;
  /** `filled`: not undefined, null, '' or an array without filled items. */
  operator: 'filled' | 'empty';
}

export type ConditionV1 =
  | ComparisonConditionV1
  | PresenceConditionV1
  | { all: ConditionV1[] }
  | { any: ConditionV1[] }
  | { not: ConditionV1 };

// ---- Validation hints (engine-neutral: no Yup, no RHF) ----

export interface TextValidationV1 {
  minLength?: number;
  maxLength?: number;
  /** Regular expression source. */
  pattern?: string;
  /** Must equal the value of this field (e.g. password confirmation). */
  sameAs?: string;
}

export interface NumberValidationV1 {
  min?: number;
  max?: number;
}

/** ISO strings (`YYYY-MM-DD`, `HH:mm`, …) compared lexicographically. */
export interface DateValidationV1 {
  min?: string;
  max?: string;
}

export interface ArrayValidationV1 {
  minItems?: number;
  maxItems?: number;
}

export interface FileValidationV1 {
  /** Bytes per file. */
  maxSize?: number;
  minFiles?: number;
  maxFiles?: number;
}

// ---- Diagnostics shared by the parser and the normalizer ----

export interface SchemaIssue {
  severity: 'error' | 'warning';
  /** Stable machine-readable code, e.g. `duplicate-id`. */
  code: string;
  /** JSON-pointer-like path, e.g. `steps[1].fields[0].type`. */
  path: string;
  message: string;
}
