import { evaluateCondition } from '../contract/conditions';
import type { ArtisanSchemaV1 } from '../contract/define';
import type { ArtisanFieldV1 } from '../contract/fields';
import type { ConditionV1, JSONValue, OptionV1 } from '../contract/types';
import type { NormalizedArtisanSchema } from '../normalize';

/**
 * Validates the VALUES a client submitted against a v1 schema, with no React,
 * Yup or form engine: it runs in Node, a worker or any JS runtime.
 *
 * Hand-written on purpose, like the parser: no `eval`, no `new Function`, no
 * validator generated from the schema. Messages are not produced here: every
 * issue carries a stable `code` and its `params`, and the UI layer formats it.
 *
 * It mirrors the visibility rules of the form engine (a hidden field or step is
 * not validated and not submitted) and is deliberately STRICTER than the
 * browser where that is safe, because a server must not trust the client:
 * values are type-checked (numbers are numbers, not numeric strings), choices
 * must be among the options, dates must be well formed, OTP/rating limits and
 * file metadata are enforced. The list of differences lives in
 * `docs/schema-v1.md`.
 */

export type IssueCode =
  | 'required'
  | 'type'
  | 'tooLong'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'unsafePattern'
  | 'mustMatch'
  | 'invalidEmail'
  | 'invalidUrl'
  | 'invalidPhone'
  | 'invalidNumber'
  | 'minValue'
  | 'maxValue'
  | 'invalidDate'
  | 'minDate'
  | 'maxDate'
  | 'endBeforeStart'
  | 'invalidOption'
  | 'invalidLength'
  | 'invalidCharset'
  | 'outOfRange'
  | 'minItems'
  | 'maxItems'
  | 'minFiles'
  | 'maxFiles'
  | 'invalidFile'
  | 'fileTooLarge'
  | 'fileType'
  | 'custom';

export interface ValidationIssue {
  /** Where, in the shape of the values: `email`, `jobs[1].company`. */
  path: string;
  code: IssueCode;
  params?: Record<string, JSONValue>;
}

export interface ValidateOptions {
  /** Also return the values without hidden fields, hidden steps and unknown keys. */
  prune?: boolean;
  /**
   * The options of every `optionsSource` / `dependentOptionsSource` the
   * schema names, by source id. A field whose source is not listed is not
   * checked for membership (the server does not know its options).
   */
  dynamicOptions?: Record<string, readonly string[]>;
  /** Rules of custom `x-*` field types. A custom type without one is not validated. */
  customTypes?: Record<
    string,
    (value: unknown, field: ArtisanFieldV1) => ValidationIssue[] | undefined
  >;
  /**
   * Longest string accepted for any text value (default 10 000). Beyond it the
   * value is rejected before any `pattern` runs.
   */
  maxStringLength?: number;
  /**
   * Most items accepted in any one list: the rows of an `array`, the choices of
   * a `check`/`multiselect` and the files of an upload (default 1 000). A
   * ceiling against abuse, not a form rule: a schema's own `maxItems` /
   * `maxFiles` still apply below it.
   */
  maxItems?: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
  /** Present with `prune: true`. */
  values?: Record<string, unknown>;
}

type Values = Record<string, unknown>;
type Add = (
  path: string,
  code: IssueCode,
  params?: Record<string, JSONValue>,
) => void;

// ---- Regex handling: `pattern` comes from the schema, so it is untrusted ----

const MAX_CACHED = 500;
const cache = new Map<string, RegExp | null>();

/** Nested quantifiers (`(a+)+`, `(.*)*`) are the classic catastrophic shape. */
const looksCatastrophic = (src: string): boolean =>
  /\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)\s*[+*{]/.test(src);

/** Compiles once; `null` means unusable (invalid or catastrophic). */
const compile = (src: string): RegExp | null => {
  const hit = cache.get(src);
  if (hit !== undefined) return hit;
  let re: RegExp | null = null;
  if (!looksCatastrophic(src)) {
    try {
      re = new RegExp(src);
    } catch {
      re = null;
    }
  }
  if (cache.size >= MAX_CACHED) cache.clear();
  cache.set(src, re);
  return re;
};

// The same patterns Yup applies in the browser (Yup 1.x), so both sides agree.
const EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PHONE = /^[+()\d\s.-]{6,}$/;
const DATE_SHAPE: Record<string, RegExp> = {
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  time: /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
  datetime:
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
  month: /^\d{4}-(0[1-9]|1[0-2])$/,
};

/** `2026-02-31` has the right shape but is not a day: round-trip it. */
const realDay = (v: string): boolean => {
  const day = v.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return true; // time or month: the shape is enough
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === day;
};

const isUrl = (v: string): boolean => {
  try {
    const u = new URL(v);
    return (
      ['http:', 'https:', 'ftp:'].includes(u.protocol) && u.hostname !== ''
    );
  } catch {
    return false;
  }
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Empty as the engine reads it: nothing, `''`, or no items. */
const isEmpty = (v: unknown): boolean =>
  v === undefined ||
  v === null ||
  v === '' ||
  (Array.isArray(v) && v.length === 0);

const optionValues = (opts: readonly OptionV1[] | undefined) =>
  opts?.map((o) => o.value);

// ---- Rules per field type ----

interface Ctx {
  values: Values;
  opts: ValidateOptions;
  add: Add;
  max: number;
  maxItems: number;
}

/** Checks a string value against the shared text rules. Returns false to stop. */
const textRules = (
  path: string,
  v: unknown,
  f: {
    validation?: {
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      sameAs?: string;
    };
  },
  c: Ctx,
): v is string => {
  if (typeof v !== 'string') {
    c.add(path, 'type', { expected: 'string' });
    return false;
  }
  if (v.length > c.max) {
    c.add(path, 'tooLong', { max: c.max });
    return false;
  }
  const t = f.validation;
  if (v === '') return true; // length and pattern skip empty values, like Yup
  if (t?.minLength !== undefined && v.length < t.minLength)
    c.add(path, 'minLength', { min: t.minLength });
  if (t?.maxLength !== undefined && v.length > t.maxLength)
    c.add(path, 'maxLength', { max: t.maxLength });
  if (t?.pattern !== undefined) {
    const re = compile(t.pattern);
    if (!re) c.add(path, 'unsafePattern');
    else if (!re.test(v)) c.add(path, 'pattern');
  }
  return true;
};

const numberRules = (
  path: string,
  v: unknown,
  f: { validation?: { min?: number; max?: number } },
  c: Ctx,
) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    c.add(path, 'invalidNumber');
    return;
  }
  const t = f.validation;
  if (t?.min !== undefined && v < t.min)
    c.add(path, 'minValue', { min: t.min });
  if (t?.max !== undefined && v > t.max)
    c.add(path, 'maxValue', { max: t.max });
};

/** Shape and bounds of one ISO date-like string. */
const dateRules = (
  path: string,
  v: unknown,
  kind: string,
  f: { validation?: { min?: string; max?: string } },
  c: Ctx,
): v is string => {
  if (typeof v !== 'string') {
    c.add(path, 'type', { expected: 'string' });
    return false;
  }
  if (v === '') return true;
  if (!DATE_SHAPE[kind]?.test(v) || !realDay(v)) {
    c.add(path, 'invalidDate');
    return false;
  }
  const t = f.validation;
  if (t?.min !== undefined && v < t.min) c.add(path, 'minDate', { min: t.min });
  if (t?.max !== undefined && v > t.max) c.add(path, 'maxDate', { max: t.max });
  return true;
};

/** Is `item` allowed by an `accept` list such as `image/*,.pdf`? */
const accepted = (accept: string, name: string, type: string | undefined) =>
  accept
    .split(',')
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean)
    .some((a) =>
      a.startsWith('.')
        ? name.toLowerCase().endsWith(a)
        : a.endsWith('/*')
          ? (type ?? '').toLowerCase().startsWith(a.slice(0, -1))
          : (type ?? '').toLowerCase() === a,
    );

const fileRules = (
  path: string,
  v: unknown,
  f: Extract<ArtisanFieldV1, { type: 'file' | 'image' }>,
  c: Ctx,
) => {
  if (!Array.isArray(v)) {
    c.add(path, 'type', { expected: 'array' });
    return;
  }
  if (v.length > c.maxItems) {
    c.add(path, 'maxItems', { max: c.maxItems });
    return;
  }
  const t = f.validation;
  const accept = f.accept ?? (f.type === 'image' ? 'image/*' : undefined);
  const min = t?.minFiles ?? (f.required ? 1 : 0);
  if (v.length < min)
    c.add(path, f.required && !t?.minFiles ? 'required' : 'minFiles', { min });
  if (t?.maxFiles !== undefined && v.length > t.maxFiles)
    c.add(path, 'maxFiles', { max: t.maxFiles });
  v.forEach((item, i) => {
    const p = `${path}[${i}]`;
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.size !== 'number' ||
      !Number.isFinite(item.size) ||
      item.size < 0
    ) {
      c.add(p, 'invalidFile');
      return;
    }
    if (t?.maxSize !== undefined && item.size > t.maxSize)
      c.add(p, 'fileTooLarge', { max: t.maxSize });
    if (accept && !accepted(accept, item.name, item.type as string | undefined))
      c.add(p, 'fileType', { accept });
  });
};

/** `value` is one of `options` (or, for a source, of its known options). */
const inOptions = (
  value: string,
  options: readonly string[] | undefined,
): boolean => options === undefined || options.includes(value);

const optionsFor = (
  f: { options?: OptionV1[]; optionsSource?: string },
  c: Ctx,
): readonly string[] | undefined => {
  if (f.options) return optionValues(f.options);
  return f.optionsSource ? c.opts.dynamicOptions?.[f.optionsSource] : undefined;
};

/** Validates one field. `row` is the object the field lives in (the form or an array row). */
const validateField = (
  f: ArtisanFieldV1,
  row: Values,
  prefix: string,
  c: Ctx,
  out: Values | undefined,
): void => {
  const at = (name: string) => (prefix ? `${prefix}.${name}` : name);
  const path = at(f.name);
  const v = row[f.name];

  const keep = (name: string, value: unknown) => {
    if (out && value !== undefined) out[name] = value;
  };

  switch (f.type) {
    // Display-only content owns no value.
    case 'heading':
    case 'paragraph':
    case 'callout':
    case 'divider':
      return;
    case 'checkbox':
    case 'switch': {
      if (v !== undefined && typeof v !== 'boolean')
        c.add(path, 'type', { expected: 'boolean' });
      else if (f.required && v !== true) c.add(path, 'required');
      keep(f.name, v);
      return;
    }
    case 'file':
    case 'image': {
      // An empty list still has to satisfy `required` and `minFiles`.
      fileRules(path, v ?? [], f, c);
      keep(f.name, v);
      return;
    }
    case 'array': {
      if (v !== undefined && !Array.isArray(v)) {
        c.add(path, 'type', { expected: 'array' });
        return;
      }
      const rows = (v ?? []) as unknown[];
      if (rows.length > c.maxItems) {
        c.add(path, 'maxItems', { max: c.maxItems });
        return;
      }
      const t = f.validation;
      if (t?.minItems !== undefined && rows.length < t.minItems)
        c.add(path, 'minItems', { min: t.minItems });
      if (t?.maxItems !== undefined && rows.length > t.maxItems)
        c.add(path, 'maxItems', { max: t.maxItems });
      const kept: Values[] = [];
      rows.forEach((r, i) => {
        if (!isRecord(r)) {
          c.add(`${path}[${i}]`, 'type', { expected: 'object' });
          return;
        }
        const sub: Values | undefined = out ? {} : undefined;
        for (const item of f.itemFields)
          validateField(item, r, `${path}[${i}]`, c, sub);
        if (sub) kept.push(sub);
      });
      if (out && v !== undefined) out[f.name] = kept;
      return;
    }
    default:
  }

  // Everything below is a single value that can be left empty.
  if (isEmpty(v)) {
    if (f.required) c.add(path, 'required');
    keep(f.name, v);
    if (f.type === 'daterange') {
      const end = f.endName ?? `${f.name}End`;
      if (f.required && isEmpty(row[end])) c.add(at(end), 'required');
      keep(end, row[end]);
    }
    return;
  }

  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'password':
      textRules(path, v, f, c);
      break;
    case 'email':
      if (textRules(path, v, f, c) && !EMAIL.test(v))
        c.add(path, 'invalidEmail');
      break;
    case 'url':
      if (textRules(path, v, f, c) && !isUrl(v)) c.add(path, 'invalidUrl');
      break;
    case 'tel':
      if (textRules(path, v, f, c) && !PHONE.test(v))
        c.add(path, 'invalidPhone');
      break;
    case 'number':
    case 'range':
      numberRules(path, v, f, c);
      break;
    case 'rating': {
      const max = f.length ?? 5;
      if (typeof v !== 'number' || !Number.isInteger(v))
        c.add(path, 'invalidNumber');
      else if (v < 1 || v > max) c.add(path, 'outOfRange', { min: 1, max });
      break;
    }
    case 'otp': {
      const length = f.length ?? 6;
      if (typeof v !== 'string') c.add(path, 'type', { expected: 'string' });
      else if (v.length !== length) c.add(path, 'invalidLength', { length });
      else if (
        !(f.charset === 'alphanumeric' ? /^[a-zA-Z0-9]+$/ : /^\d+$/).test(v)
      )
        c.add(path, 'invalidCharset');
      break;
    }
    case 'date':
    case 'time':
    case 'datetime':
    case 'month':
      dateRules(path, v, f.type, f, c);
      break;
    case 'daterange': {
      const end = f.endName ?? `${f.name}End`;
      const startOk = dateRules(path, v, 'date', f, c);
      const e = row[end];
      if (isEmpty(e)) {
        if (f.required) c.add(at(end), 'required');
      } else if (
        dateRules(at(end), e, 'date', f, c) &&
        startOk &&
        e < (v as string)
      )
        c.add(at(end), 'endBeforeStart');
      keep(end, e);
      break;
    }
    case 'select':
    case 'radio':
    case 'combobox': {
      if (textRules(path, v, {}, c) && !inOptions(v, optionsFor(f, c)))
        c.add(path, 'invalidOption');
      break;
    }
    case 'check':
    case 'multiselect': {
      if (!Array.isArray(v)) c.add(path, 'type', { expected: 'array' });
      else if (v.length > c.maxItems)
        c.add(path, 'maxItems', { max: c.maxItems });
      else {
        const allowed = optionsFor(f, c);
        v.forEach((item, i) => {
          if (typeof item !== 'string')
            c.add(`${path}[${i}]`, 'type', { expected: 'string' });
          else if (!inOptions(item, allowed))
            c.add(`${path}[${i}]`, 'invalidOption');
        });
      }
      break;
    }
    case 'dynamicSelect': {
      if (typeof v !== 'string') {
        c.add(path, 'type', { expected: 'string' });
        break;
      }
      if (!inOptions(v, optionValues(f.options))) c.add(path, 'invalidOption');
      if (f.dependentName) {
        const child = row[f.dependentName];
        const childPath = at(f.dependentName);
        if (isEmpty(child)) {
          if (f.required) c.add(childPath, 'required');
        } else if (typeof child !== 'string')
          c.add(childPath, 'type', { expected: 'string' });
        else if (
          f.dependentOptions &&
          !inOptions(child, optionValues(f.dependentOptions[v]) ?? [])
        )
          c.add(childPath, 'invalidOption');
        keep(f.dependentName, child);
      }
      break;
    }
    default: {
      // A custom `x-*` type: only a rule supplied by the caller can check it.
      const custom = c.opts.customTypes?.[f.type];
      for (const issue of custom?.(v, f) ?? [])
        c.add(issue.path, issue.code, issue.params);
    }
  }

  // `sameAs` compares against another value of the same row.
  const other = (f as { validation?: { sameAs?: string } }).validation?.sameAs;
  if (other !== undefined && v !== row[other]) c.add(path, 'mustMatch');
  keep(f.name, v);
};

const hidden = (cond: ConditionV1 | undefined, values: Values) =>
  cond !== undefined && !evaluateCondition(cond, values);

/** Validates submitted `values` against a v1 (or normalized) schema. */
export const validateValues = (
  input: ArtisanSchemaV1 | NormalizedArtisanSchema,
  values: unknown,
  opts: ValidateOptions = {},
): ValidationResult => {
  const schema = 'bindings' in input ? input.schema : input;
  const issues: ValidationIssue[] = [];
  const add: Add = (path, code, params) =>
    issues.push(params ? { path, code, params } : { path, code });

  if (!isRecord(values)) {
    add('', 'type', { expected: 'object' });
    return { ok: false, issues };
  }

  const c: Ctx = {
    values,
    opts,
    add,
    max: opts.maxStringLength ?? 10_000,
    maxItems: opts.maxItems ?? 1_000,
  };
  const out: Values | undefined = opts.prune ? {} : undefined;

  for (const step of schema.steps) {
    if (hidden(step.visibleWhen, values)) continue;
    if (step.type === 'terms') {
      const name = step.accept?.name ?? 'termsAccepted';
      if (values[name] !== true) add(name, 'required');
      if (out && values[name] !== undefined) out[name] = values[name];
      continue;
    }
    if (step.type !== 'form') continue;
    for (const f of step.fields) {
      if (hidden(f.visibleWhen, values)) continue;
      validateField(f, values, '', c, out);
    }
  }

  return out
    ? { ok: issues.length === 0, issues, values: out }
    : { ok: issues.length === 0, issues };
};
