import type { ArtisanSchemaV1 } from './contract/define';
import type { NativeFieldType } from './contract/fields';
import {
  FIELD_KEYS,
  isExtensionType,
  isNativeFieldType,
  isNativeStepType,
  STEP_KEYS,
} from './contract/specs';
import type { NativeStepType } from './contract/steps';
import type { SchemaIssue } from './contract/types';

/**
 * Which locally registered things a schema may reference. Used for schemas
 * that come from outside (an API, a database): a remote JSON is never trusted
 * just because it is valid JSON, so every reference must be allowed here.
 * A category that is not listed allows nothing (native field/step types are
 * always allowed).
 */
export interface SchemaPolicy {
  /** Custom (`x-…`) field types. */
  fieldTypes?: readonly string[];
  /** Custom (`x-…`) step types. */
  stepTypes?: readonly string[];
  optionsSources?: readonly string[];
  dependentOptionsSources?: readonly string[];
  waitStrategies?: readonly string[];
  hooks?: readonly string[];
  renderers?: readonly string[];
  actions?: readonly string[];
  paymentProviders?: readonly string[];
}

export interface ParseOptions {
  /** `trusted` (default) accepts any reference; an object restricts them. */
  policy?: 'trusted' | SchemaPolicy;
}

export type ParseResult<T> =
  | { success: true; schema: T; issues: SchemaIssue[] }
  | { success: false; issues: SchemaIssue[] };

const MAX_DEPTH = 32;
const MAX_PATTERN = 500;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

class Collector {
  issues: SchemaIssue[] = [];
  /** Returns `undefined` so callers can `return c.error(…)` to stop checking an element. */
  error(code: string, path: string, message: string): undefined {
    this.issues.push({ severity: 'error', code, path, message });
    return undefined;
  }
  warn(code: string, path: string, message: string) {
    this.issues.push({ severity: 'warning', code, path, message });
  }
}

// ---- generic value checks ----

const checkJSON = (v: unknown, path: string, c: Collector, depth = 0) => {
  if (depth > MAX_DEPTH) return c.error('too-deep', path, 'nested too deeply');
  if (v === null || ['string', 'boolean'].includes(typeof v)) return;
  if (typeof v === 'number') {
    if (!Number.isFinite(v))
      c.error('not-serializable', path, 'numbers must be finite');
    return;
  }
  if (Array.isArray(v)) {
    for (const [i, item] of v.entries())
      checkJSON(item, `${path}[${i}]`, c, depth + 1);
    return;
  }
  if (isObj(v)) {
    for (const [k, item] of Object.entries(v))
      checkJSON(item, `${path}.${k}`, c, depth + 1);
    return;
  }
  c.error(
    'not-serializable',
    path,
    `${typeof v === 'function' ? 'functions are' : 'this value is'} not JSON-serializable`,
  );
};

const need = {
  string: (v: unknown, p: string, c: Collector, empty = false) => {
    if (typeof v !== 'string' || (!empty && v === ''))
      c.error(
        'invalid-type',
        p,
        empty ? 'must be a string' : 'must be a non-empty string',
      );
  },
  bool: (v: unknown, p: string, c: Collector) => {
    if (typeof v !== 'boolean') c.error('invalid-type', p, 'must be a boolean');
  },
  num: (v: unknown, p: string, c: Collector) => {
    if (typeof v !== 'number' || !Number.isFinite(v))
      c.error('invalid-type', p, 'must be a finite number');
  },
  int: (v: unknown, p: string, c: Collector) => {
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0)
      c.error('invalid-type', p, 'must be a non-negative integer');
  },
  oneOf: (v: unknown, p: string, c: Collector, values: readonly unknown[]) => {
    if (!values.includes(v))
      c.error('invalid-value', p, `must be one of: ${values.join(', ')}`);
  },
  strings: (v: unknown, p: string, c: Collector) => {
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string' || x === ''))
      c.error('invalid-type', p, 'must be an array of non-empty strings');
  },
};

const checkKeys = (
  o: Obj,
  allowed: readonly string[],
  path: string,
  c: Collector,
) => {
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k))
      c.error(
        'unknown-property',
        `${path}.${k}`,
        `"${k}" is not a property of this element`,
      );
  }
};

// ---- parser ----

interface Refs {
  fieldNames: Set<string>;
  stepIds: Set<string>;
  fieldRefs: { name: string; path: string }[];
  stepRefs: { id: string; path: string }[];
}

const allowed = (list: readonly string[] | undefined, id: unknown) =>
  typeof id === 'string' && !!list?.includes(id);

export const parseArtisanSchema = (
  input: unknown,
  options: ParseOptions = {},
): ParseResult<ArtisanSchemaV1> => {
  const c = new Collector();
  const policy = options.policy ?? 'trusted';
  const trusted = policy === 'trusted';
  const pol: SchemaPolicy = trusted ? {} : policy;

  /** A reference to a locally registered thing, checked against the policy. */
  const reference = (
    id: unknown,
    list: readonly string[] | undefined,
    path: string,
    what: string,
  ) => {
    need.string(id, path, c);
    if (!trusted && typeof id === 'string' && !allowed(list, id))
      c.error(
        'policy-violation',
        path,
        `${what} "${id}" is not allowed for this schema source`,
      );
  };

  if (!isObj(input)) {
    c.error('invalid-type', '$', 'a schema must be a JSON object');
    return { success: false, issues: c.issues };
  }

  checkJSON(input, '$', c);

  // version
  if (input.schemaVersion === undefined) {
    c.error(
      'missing-version',
      'schemaVersion',
      'schemaVersion is required; a schema without it looks like a 0.2.0 FormSchema: pass it through normalizeArtisanSchema instead',
    );
  } else if (
    typeof input.schemaVersion === 'number' &&
    input.schemaVersion > 1
  ) {
    c.error(
      'unsupported-version',
      'schemaVersion',
      `schemaVersion ${input.schemaVersion} is newer than this library supports (1)`,
    );
  } else if (input.schemaVersion !== 1) {
    c.error('unsupported-version', 'schemaVersion', 'schemaVersion must be 1');
  }

  checkKeys(
    input,
    ['schemaVersion', 'id', 'revision', 'title', 'description', 'ui', 'steps'],
    '$',
    c,
  );
  need.string(input.id, 'id', c);
  if (input.revision !== undefined) need.int(input.revision, 'revision', c);
  if (input.title !== undefined) need.string(input.title, 'title', c, true);
  if (input.description !== undefined)
    need.string(input.description, 'description', c, true);
  if (input.ui !== undefined) {
    if (!isObj(input.ui)) c.error('invalid-type', 'ui', 'must be an object');
    else {
      checkKeys(input.ui, ['layout', 'density', 'labelPosition'], 'ui', c);
      if (input.ui.layout !== undefined)
        need.oneOf(input.ui.layout, 'ui.layout', c, ['vertical', 'horizontal']);
      if (input.ui.density !== undefined)
        need.oneOf(input.ui.density, 'ui.density', c, [
          'compact',
          'comfortable',
        ]);
      if (input.ui.labelPosition !== undefined)
        need.oneOf(input.ui.labelPosition, 'ui.labelPosition', c, [
          'top',
          'left',
        ]);
    }
  }

  const refs: Refs = {
    fieldNames: new Set(),
    stepIds: new Set(),
    fieldRefs: [],
    stepRefs: [],
  };
  const seenNames = new Map<string, string>();

  const claimName = (name: unknown, path: string) => {
    if (typeof name !== 'string' || name === '') return;
    const first = seenNames.get(name);
    if (first)
      c.error(
        'duplicate-name',
        path,
        `name "${name}" is already used at ${first}`,
      );
    else seenNames.set(name, path);
  };

  // ---- conditions ----
  const checkCondition = (cond: unknown, path: string, depth = 0) => {
    if (depth > MAX_DEPTH)
      return c.error('too-deep', path, 'condition nested too deeply');
    if (!isObj(cond))
      return c.error('invalid-type', path, 'a condition must be an object');
    if ('all' in cond || 'any' in cond) {
      const k = 'all' in cond ? 'all' : 'any';
      checkKeys(cond, [k], path, c);
      const list = cond[k];
      if (!Array.isArray(list))
        return c.error(
          'invalid-type',
          `${path}.${k}`,
          'must be an array of conditions',
        );
      for (const [i, item] of list.entries())
        checkCondition(item, `${path}.${k}[${i}]`, depth + 1);
      return;
    }
    if ('not' in cond) {
      checkKeys(cond, ['not'], path, c);
      return checkCondition(cond.not, `${path}.not`, depth + 1);
    }
    checkKeys(cond, ['field', 'operator', 'value', 'coerce'], path, c);
    need.string(cond.field, `${path}.field`, c);
    if (typeof cond.field === 'string')
      refs.fieldRefs.push({ name: cond.field, path: `${path}.field` });
    const ops = [
      'eq',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'in',
      'notIn',
      'filled',
      'empty',
    ];
    need.oneOf(cond.operator, `${path}.operator`, c, ops);
    if (cond.operator === 'filled' || cond.operator === 'empty') {
      if ('value' in cond)
        c.error(
          'unexpected-value',
          `${path}.value`,
          `"${cond.operator}" takes no value`,
        );
      if ('coerce' in cond)
        c.error(
          'unexpected-value',
          `${path}.coerce`,
          `"${cond.operator}" takes no coerce`,
        );
    } else if (ops.includes(cond.operator as string)) {
      if (!('value' in cond))
        c.error('missing-property', `${path}.value`, 'value is required');
      if (
        (cond.operator === 'in' || cond.operator === 'notIn') &&
        !Array.isArray(cond.value)
      )
        c.error(
          'invalid-type',
          `${path}.value`,
          `"${cond.operator}" needs an array`,
        );
    }
    if (cond.coerce !== undefined)
      need.oneOf(cond.coerce, `${path}.coerce`, c, ['string']);
  };

  // ---- fields ----
  const optionList = (v: unknown, path: string) => {
    if (!Array.isArray(v))
      return c.error(
        'invalid-type',
        path,
        'must be an array of { value, label }',
      );
    for (const [i, o] of v.entries()) {
      if (!isObj(o)) {
        c.error('invalid-type', `${path}[${i}]`, 'must be { value, label }');
        continue;
      }
      checkKeys(o, ['value', 'label'], `${path}[${i}]`, c);
      need.string(o.value, `${path}[${i}].value`, c, true);
      need.string(o.label, `${path}[${i}].label`, c, true);
    }
  };

  const validationKeys: Partial<Record<NativeFieldType, readonly string[]>> =
    {};
  for (const t of [
    'text',
    'email',
    'tel',
    'url',
    'password',
    'textarea',
  ] as const)
    validationKeys[t] = ['minLength', 'maxLength', 'pattern', 'sameAs'];
  for (const t of ['number', 'range'] as const)
    validationKeys[t] = ['min', 'max'];
  for (const t of ['date', 'time', 'datetime', 'month', 'daterange'] as const)
    validationKeys[t] = ['min', 'max'];
  validationKeys.array = ['minItems', 'maxItems'];
  validationKeys.file = ['maxSize', 'minFiles', 'maxFiles'];
  validationKeys.image = ['maxSize', 'minFiles', 'maxFiles'];

  const checkValidation = (v: unknown, type: NativeFieldType, path: string) => {
    if (!isObj(v)) return c.error('invalid-type', path, 'must be an object');
    const keys = validationKeys[type] ?? [];
    checkKeys(v, keys, path, c);
    for (const [k, val] of Object.entries(v)) {
      if (!keys.includes(k)) continue;
      if (k === 'pattern') {
        need.string(val, `${path}.pattern`, c);
        if (typeof val === 'string') {
          if (val.length > MAX_PATTERN)
            c.error(
              'invalid-pattern',
              `${path}.pattern`,
              `pattern longer than ${MAX_PATTERN} characters`,
            );
          else
            try {
              new RegExp(val);
            } catch {
              c.error(
                'invalid-pattern',
                `${path}.pattern`,
                'not a valid regular expression',
              );
            }
        }
      } else if (k === 'sameAs') {
        need.string(val, `${path}.sameAs`, c);
        if (typeof val === 'string')
          refs.fieldRefs.push({ name: val, path: `${path}.sameAs` });
      } else if (k === 'min' || k === 'max') {
        if (['date', 'time', 'datetime', 'month', 'daterange'].includes(type))
          need.string(val, `${path}.${k}`, c);
        else need.num(val, `${path}.${k}`, c);
      } else need.int(val, `${path}.${k}`, c);
    }
  };

  const commonField: Record<
    string,
    (v: unknown, p: string, f: Obj, type: string) => void
  > = {
    id: (v, p) => need.string(v, p, c),
    label: (v, p) => need.string(v, p, c, true),
    description: (v, p) => need.string(v, p, c, true),
    required: (v, p) => need.bool(v, p, c),
    disabled: (v, p) => need.bool(v, p, c),
    placeholder: (v, p) => need.string(v, p, c, true),
    mask: (v, p) => need.string(v, p, c),
    prefix: (v, p) => need.string(v, p, c, true),
    suffix: (v, p) => need.string(v, p, c, true),
    autoComplete: (v, p) => need.string(v, p, c),
    inputMode: (v, p) =>
      need.oneOf(v, p, c, [
        'none',
        'text',
        'tel',
        'url',
        'email',
        'numeric',
        'decimal',
        'search',
      ]),
    readOnly: (v, p) => need.bool(v, p, c),
    maxLength: (v, p) => need.int(v, p, c),
    step: (v, p) => need.num(v, p, c),
    length: (v, p) => need.int(v, p, c),
    charset: (v, p) => need.oneOf(v, p, c, ['numeric', 'alphanumeric']),
    endName: (v, p) => need.string(v, p, c),
    endLabel: (v, p) => need.string(v, p, c, true),
    accept: (v, p) => need.string(v, p, c),
    storage: (v, p) => need.string(v, p, c),
    capture: (v, p) => need.oneOf(v, p, c, ['user', 'environment']),
    dependentName: (v, p) => need.string(v, p, c),
    addLabel: (v, p) => need.string(v, p, c, true),
    text: (v, p) => need.string(v, p, c, true),
    variant: (v, p, _f, type) => {
      if (type === 'callout')
        need.oneOf(v, p, c, ['info', 'success', 'warning', 'error']);
      else need.string(v, p, c);
    },
    defaultValue: () => {}, // JSON-ness is checked globally
    visibleWhen: (v, p) => checkCondition(v, p),
    ui: (v, p) => {
      if (!isObj(v)) return c.error('invalid-type', p, 'must be an object');
      checkKeys(v, ['span', 'variant'], p, c);
      if (v.span !== undefined) need.oneOf(v.span, `${p}.span`, c, [1, 2]);
      if (v.variant !== undefined) need.string(v.variant, `${p}.variant`, c);
    },
  };

  const checkField = (f: unknown, path: string, inArray = false) => {
    if (!isObj(f))
      return c.error('invalid-type', path, 'a field must be an object');
    const type = f.type;
    if (typeof type !== 'string' || type === '')
      return c.error('invalid-type', `${path}.type`, 'type is required');

    let keys: readonly string[];
    if (isNativeFieldType(type)) {
      keys = FIELD_KEYS[type];
    } else if (isExtensionType(type)) {
      if (inArray)
        return c.error(
          'unsupported-in-array',
          `${path}.type`,
          'custom field types are not supported inside array rows in v1',
        );
      if (!trusted && !allowed(pol.fieldTypes, type))
        c.error(
          'policy-violation',
          `${path}.type`,
          `field type "${type}" is not allowed for this schema source`,
        );
      keys = [...FIELD_KEYS.checkbox, 'config'];
    } else {
      return c.error(
        'unknown-type',
        `${path}.type`,
        `unknown field type "${type}" (custom types must start with "x-")`,
      );
    }
    checkKeys(f, keys, path, c);
    need.string(f.name, `${path}.name`, c);
    claimName(f.name, `${path}.name`);

    for (const [k, v] of Object.entries(f)) {
      if (!keys.includes(k) || k === 'type' || k === 'name') continue;
      const p = `${path}.${k}`;
      if (k === 'validation') checkValidation(v, type as NativeFieldType, p);
      else if (k === 'config') {
        if (!isObj(v)) c.error('invalid-type', p, 'must be an object');
      } else if (k === 'options') optionList(v, p);
      else if (k === 'optionsSource')
        reference(v, pol.optionsSources, p, 'options source');
      else if (k === 'dependentOptionsSource')
        reference(v, pol.dependentOptionsSources, p, 'options source');
      else if (k === 'dependentOptions') {
        if (!isObj(v))
          c.error(
            'invalid-type',
            p,
            'must map each parent value to its options',
          );
        else
          for (const [pv, list] of Object.entries(v))
            optionList(list, `${p}.${pv}`);
      } else if (k === 'itemFields') {
        if (!Array.isArray(v) || v.length === 0)
          return c.error(
            'invalid-type',
            p,
            'must be a non-empty array of fields',
          );
        v.forEach((row, i) => {
          if (isObj(row) && row.visibleWhen !== undefined)
            c.error(
              'unsupported-in-array',
              `${p}[${i}].visibleWhen`,
              'conditions inside array rows are not supported in v1',
            );
          if (
            isObj(row) &&
            (row.type === 'array' ||
              ['heading', 'paragraph', 'callout', 'divider'].includes(
                String(row.type),
              ))
          )
            c.error(
              'unsupported-in-array',
              `${p}[${i}].type`,
              `"${String(row.type)}" is not supported inside array rows in v1`,
            );
          checkField(row, `${p}[${i}]`, true);
        });
      } else commonField[k]?.(v, p, f, type);
    }

    // required companions
    if (
      ['select', 'radio', 'check', 'dynamicSelect'].includes(type) &&
      f.options === undefined
    )
      c.error('missing-property', `${path}.options`, `"${type}" needs options`);
    if (
      ['combobox', 'multiselect'].includes(type) &&
      f.options === undefined &&
      f.optionsSource === undefined
    )
      c.error(
        'missing-property',
        `${path}.options`,
        `"${type}" needs options or an optionsSource`,
      );
    if (type === 'array' && f.itemFields === undefined)
      c.error(
        'missing-property',
        `${path}.itemFields`,
        'an array field needs itemFields',
      );

    // names this field owns (besides its own)
    if (type === 'dynamicSelect' && typeof f.name === 'string') {
      const child =
        typeof f.dependentName === 'string'
          ? f.dependentName
          : `${f.name}Dependent`;
      claimName(child, `${path}.dependentName`);
      refs.fieldNames.add(child);
    }
    if (type === 'daterange' && typeof f.name === 'string') {
      const end = typeof f.endName === 'string' ? f.endName : `${f.name}End`;
      claimName(end, `${path}.endName`);
      refs.fieldNames.add(end);
    }
    if (
      typeof f.name === 'string' &&
      !['heading', 'paragraph', 'callout', 'divider'].includes(type) &&
      !inArray
    )
      refs.fieldNames.add(f.name);
  };

  // ---- steps ----
  const stepCommon: Record<string, (v: unknown, p: string, s: Obj) => void> = {
    id: () => {},
    title: (v, p) => need.string(v, p, c, true),
    visibleWhen: (v, p) => checkCondition(v, p),
    ui: (v, p) => {
      if (!isObj(v)) return c.error('invalid-type', p, 'must be an object');
      checkKeys(v, ['columns'], p, c);
      if (v.columns !== undefined)
        need.oneOf(v.columns, `${p}.columns`, c, [1, 2]);
    },
    controls: (v, p) => {
      if (!isObj(v)) return c.error('invalid-type', p, 'must be an object');
      checkKeys(
        v,
        [
          'hidden',
          'hidePrevious',
          'hideNext',
          'nextDisabled',
          'nextLabel',
          'previousLabel',
        ],
        p,
        c,
      );
      for (const [k, val] of Object.entries(v)) {
        if (k.endsWith('Label')) need.string(val, `${p}.${k}`, c, true);
        else need.bool(val, `${p}.${k}`, c);
      }
    },
    hooks: (v, p) => {
      if (!isObj(v)) return c.error('invalid-type', p, 'must be an object');
      checkKeys(v, ['beforeNext', 'onEnter'], p, c);
      for (const [k, val] of Object.entries(v))
        reference(val, pol.hooks, `${p}.${k}`, 'hook');
    },
  };

  const checkStep = (s: unknown, path: string) => {
    if (!isObj(s))
      return c.error('invalid-type', path, 'a step must be an object');
    const type = s.type;
    if (typeof type !== 'string' || type === '')
      return c.error('invalid-type', `${path}.type`, 'type is required');

    let keys: readonly string[];
    if (isNativeStepType(type)) keys = STEP_KEYS[type as NativeStepType];
    else if (isExtensionType(type)) {
      if (!trusted && !allowed(pol.stepTypes, type))
        c.error(
          'policy-violation',
          `${path}.type`,
          `step type "${type}" is not allowed for this schema source`,
        );
      keys = [...STEP_KEYS.review, 'config'];
    } else {
      return c.error(
        'unknown-type',
        `${path}.type`,
        type === 'pending'
          ? '"pending" is called "wait" in v1'
          : `unknown step type "${type}" (custom types must start with "x-")`,
      );
    }
    checkKeys(s, keys, path, c);

    need.string(s.id, `${path}.id`, c);
    if (typeof s.id === 'string') {
      if (refs.stepIds.has(s.id))
        c.error(
          'duplicate-id',
          `${path}.id`,
          `step id "${s.id}" is used more than once`,
        );
      refs.stepIds.add(s.id);
    }
    if (s.title === undefined)
      c.error('missing-property', `${path}.title`, 'title is required');

    for (const [k, v] of Object.entries(s)) {
      if (!keys.includes(k) || k === 'type' || k === 'id') continue;
      const p = `${path}.${k}`;
      if (stepCommon[k]) stepCommon[k](v, p, s);
      else if (k === 'fields') {
        if (!Array.isArray(v))
          c.error('invalid-type', p, 'must be an array of fields');
        else for (const [i, f] of v.entries()) checkField(f, `${p}[${i}]`);
      } else if (k === 'providers') {
        if (!Array.isArray(v) || v.length === 0)
          c.error(
            'invalid-type',
            p,
            'must be a non-empty array of provider ids',
          );
        else
          for (const [i, id] of v.entries())
            reference(
              id,
              pol.paymentProviders,
              `${p}[${i}]`,
              'payment provider',
            );
      } else if (k === 'strategy')
        reference(v, pol.waitStrategies, p, 'wait strategy');
      else if (k === 'renderer') reference(v, pol.renderers, p, 'renderer');
      else if (k === 'failTo') {
        need.string(v, p, c);
        if (typeof v === 'string') refs.stepRefs.push({ id: v, path: p });
      } else if (k === 'resultName') {
        need.string(v, p, c);
        if (typeof v === 'string') {
          claimName(v, p);
          refs.fieldNames.add(v);
        }
      } else if (k === 'accept') {
        if (!isObj(v)) c.error('invalid-type', p, 'must be an object');
        else {
          checkKeys(v, ['name', 'label'], p, c);
          if (v.name !== undefined) need.string(v.name, `${p}.name`, c);
          if (v.label !== undefined)
            need.string(v.label, `${p}.label`, c, true);
        }
      } else if (k === 'actions') {
        if (!Array.isArray(v)) c.error('invalid-type', p, 'must be an array');
        else
          for (const [i, a] of v.entries()) {
            if (!isObj(a)) {
              c.error('invalid-type', `${p}[${i}]`, 'must be an object');
              continue;
            }
            checkKeys(a, ['label', 'href', 'action'], `${p}[${i}]`, c);
            need.string(a.label, `${p}[${i}].label`, c, true);
            if (a.href !== undefined) need.string(a.href, `${p}[${i}].href`, c);
            if (a.action !== undefined)
              reference(a.action, pol.actions, `${p}[${i}].action`, 'action');
          }
      } else if (k === 'config') {
        if (!isObj(v)) c.error('invalid-type', p, 'must be an object');
      } else need.string(v, p, c, true); // message, errorMessage, summary, content, href
    }

    if (type === 'form' && s.fields === undefined)
      c.error('missing-property', `${path}.fields`, 'a form step needs fields');
    if (type === 'wait' && s.strategy === undefined)
      c.error(
        'missing-property',
        `${path}.strategy`,
        'a wait step needs a strategy',
      );
    if (type === 'payment' && s.providers === undefined)
      c.error(
        'missing-property',
        `${path}.providers`,
        'a payment step needs providers',
      );
    if (type === 'custom' && s.renderer === undefined)
      c.error(
        'missing-property',
        `${path}.renderer`,
        'a custom step needs a renderer',
      );
    if (type === 'payment' && s.resultName === undefined) {
      claimName('payment', `${path}`);
      refs.fieldNames.add('payment');
    }
    if (type === 'terms') {
      const accept =
        isObj(s.accept) && typeof s.accept.name === 'string'
          ? s.accept.name
          : 'termsAccepted';
      claimName(accept, `${path}.accept`);
      refs.fieldNames.add(accept);
    }
  };

  if (!Array.isArray(input.steps))
    c.error('invalid-type', 'steps', 'steps must be an array');
  else if (input.steps.length === 0)
    c.error('empty-steps', 'steps', 'a schema needs at least one step');
  else for (const [i, s] of input.steps.entries()) checkStep(s, `steps[${i}]`);

  for (const r of refs.fieldRefs) {
    if (!refs.fieldNames.has(r.name))
      c.error(
        'unknown-field-reference',
        r.path,
        `"${r.name}" is not a field of this schema`,
      );
  }
  for (const r of refs.stepRefs) {
    if (!refs.stepIds.has(r.id))
      c.error(
        'unknown-step-reference',
        r.path,
        `"${r.id}" is not a step of this schema`,
      );
  }

  const hasErrors = c.issues.some((i) => i.severity === 'error');
  return hasErrors
    ? { success: false, issues: c.issues }
    : {
        success: true,
        schema: input as unknown as ArtisanSchemaV1,
        issues: c.issues,
      };
};
