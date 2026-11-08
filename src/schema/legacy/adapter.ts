import { fromLegacyCondition } from '../contract/conditions';
import type { ArtisanSchemaV1 } from '../contract/define';
import type { ArtisanFieldV1 } from '../contract/fields';
import { isJSONValue } from '../contract/json';
import { isNativeFieldType } from '../contract/specs';
import type { ArtisanStepV1 } from '../contract/steps';
import type { JSONObject, JSONValue, SchemaIssue } from '../contract/types';
import type { FieldSchema, FormSchema, StepSchema } from './types';

/** The 0.2.0 schema shape (`scheme` prop). Deprecated but fully supported. */
export type LegacyFormSchema = FormSchema;

export interface LegacyResult {
  schema: ArtisanSchemaV1;
  /** Functions and non-JSON content pulled out of the schema, by the ids it references. */
  bindings: Record<string, unknown>;
  issues: SchemaIssue[];
  /** Original step order → derived ids (needed to map `failTo` indexes). */
  stepIds: string[];
}

const TEXT = new Set(['text', 'email', 'tel', 'url', 'password', 'textarea']);
const DATE = new Set(['date', 'time', 'datetime', 'month', 'daterange']);
const CONTENT = new Set(['heading', 'paragraph', 'callout', 'divider']);

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Deterministic step ids from titles (`Personal data` → `personal-data`),
 * falling back to `<type>-<position>`; collisions get `-2`, `-3`…. Reordering
 * or retitling steps changes the ids, which is why v1 asks for explicit ones.
 */
export const deriveStepIds = (
  steps: { title?: string; type: string }[],
): string[] => {
  const used = new Set<string>();
  return steps.map((s, i) => {
    const base = slug(s.title ?? '') || `${s.type}-${i + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return id;
  });
};

const stepType = (kind: string | undefined) => {
  if (kind === undefined || kind === 'form') return 'form';
  if (kind === 'pending') return 'wait';
  if (['payment', 'terms', 'review', 'result', 'custom'].includes(kind))
    return kind;
  return kind.startsWith('x-') ? kind : `x-${kind}`;
};

export const adaptLegacySchema = (
  legacy: LegacyFormSchema,
  opts: { id?: string; revision?: number } = {},
): LegacyResult => {
  const issues: SchemaIssue[] = [];
  const bindings: Record<string, unknown> = {};
  const warn = (code: string, path: string, message: string) =>
    issues.push({ severity: 'warning', code, path, message });

  const bind = (id: string, value: unknown, path: string) => {
    bindings[id] = value;
    warn(
      'extracted-binding',
      path,
      `not JSON data: moved to a runtime binding "${id}" (the schema stays valid but needs its bindings to run)`,
    );
    return id;
  };

  const types = legacy.steps.map((s) => ({
    title: s.title,
    type: stepType(s.kind),
  }));
  const stepIds = deriveStepIds(types);

  // ---- fields ----
  const mapField = (
    f: FieldSchema,
    path: string,
    stepId: string,
    inRow = false,
  ): ArtisanFieldV1 | null => {
    const out: Record<string, unknown> = { type: f.type, name: f.name };
    const type = f.type;
    const known = new Set<string>(['type', 'name']);
    const take = (...keys: string[]) => {
      for (const k of keys) {
        known.add(k);
        if ((f as Record<string, unknown>)[k] !== undefined)
          out[k] = (f as Record<string, unknown>)[k];
      }
    };
    const native = isNativeFieldType(type);

    if (!native) {
      // Custom registered type: `x-<name>`; extra props go to `config`.
      out.type = type.startsWith('x-') ? type : `x-${type}`;
      const config: JSONObject = {};
      for (const [k, v] of Object.entries(f)) {
        if (
          [
            'type',
            'name',
            'label',
            'required',
            'disabled',
            'defaultValue',
            'helperText',
            'showIf',
            'width',
          ].includes(k)
        )
          continue;
        if (typeof v === 'function' || !isJSONValue(v)) {
          bind(`legacy:${stepId}:${f.name}:${k}`, v, `${path}.${k}`);
        } else config[k] = v;
      }
      if (Object.keys(config).length > 0) out.config = config;
      take('label', 'required', 'disabled', 'defaultValue');
    } else if (CONTENT.has(type)) {
      known.add('label');
      known.add('variant');
      if (f.label !== undefined && type !== 'divider') out.text = f.label;
      if (type === 'callout' && f.variant !== undefined)
        out.variant = f.variant;
    } else {
      take('label', 'required', 'disabled', 'defaultValue');
    }

    if (f.helperText !== undefined) {
      out.description = f.helperText;
    }
    known.add('helperText');

    if (native && !CONTENT.has(type)) {
      take(
        'placeholder',
        'mask',
        'prefix',
        'suffix',
        'autoComplete',
        'inputMode',
        'readOnly',
        'maxLength',
      );
      take(
        'options',
        'endName',
        'endLabel',
        'dependentName',
        'dependentOptions',
        'length',
        'charset',
        'accept',
        'storage',
        'capture',
        'addLabel',
      );
      if (f.step !== undefined) out.step = Number(f.step);
      known.add('step');

      // validation by family
      const validation: Record<string, unknown> = {};
      known.add('min');
      known.add('max');
      for (const k of [
        'minItems',
        'maxItems',
        'minDate',
        'maxDate',
        'pattern',
        'sameAs',
        'minFiles',
        'maxFiles',
        'maxSize',
      ])
        known.add(k);
      if (TEXT.has(type)) {
        if (f.min !== undefined) validation.minLength = f.min;
        if (f.max !== undefined) validation.maxLength = f.max;
        if (f.pattern !== undefined) validation.pattern = f.pattern;
        if (f.sameAs !== undefined) validation.sameAs = f.sameAs;
      } else if (type === 'number' || type === 'range') {
        if (f.min !== undefined) validation.min = f.min;
        if (f.max !== undefined) validation.max = f.max;
      } else if (DATE.has(type)) {
        if (f.minDate !== undefined) validation.min = f.minDate;
        if (f.maxDate !== undefined) validation.max = f.maxDate;
      } else if (type === 'array') {
        if (f.minItems !== undefined) validation.minItems = f.minItems;
        if (f.maxItems !== undefined) validation.maxItems = f.maxItems;
      } else if (type === 'file' || type === 'image') {
        if (f.minFiles !== undefined) validation.minFiles = f.minFiles;
        if (f.maxFiles !== undefined) validation.maxFiles = f.maxFiles;
        if (f.maxSize !== undefined) validation.maxSize = f.maxSize;
      }
      if (Object.keys(validation).length > 0) out.validation = validation;

      if (typeof f.loadOptions === 'function') {
        out.optionsSource = bind(
          `legacy:${stepId}:${f.name}:loadOptions`,
          f.loadOptions,
          `${path}.loadOptions`,
        );
      }
      if (typeof f.loadDependentOptions === 'function') {
        out.dependentOptionsSource = bind(
          `legacy:${stepId}:${f.name}:loadDependentOptions`,
          f.loadDependentOptions,
          `${path}.loadDependentOptions`,
        );
      }
      known.add('loadOptions');
      known.add('loadDependentOptions');

      if (type === 'array') {
        known.add('itemFields');
        out.itemFields = (f.itemFields ?? [])
          .map((row, i) =>
            mapField(row, `${path}.itemFields[${i}]`, stepId, true),
          )
          .filter((r): r is ArtisanFieldV1 => r !== null);
      }
    }

    // presentation / visibility
    known.add('showIf');
    known.add('width');
    if (f.showIf) {
      if (inRow)
        warn(
          'ignored-legacy-property',
          `${path}.showIf`,
          'conditions inside array rows never applied in 0.2.0; dropped',
        );
      else out.visibleWhen = fromLegacyCondition(f.showIf);
    }
    if (f.width === 'half') out.ui = { span: 1 };
    else if (f.width === 'full') out.ui = { span: 2 };

    if (native) {
      for (const k of Object.keys(f)) {
        if (!known.has(k))
          warn(
            'unknown-legacy-property',
            `${path}.${k}`,
            `"${k}" is not part of the v1 contract for "${type}"; dropped`,
          );
      }
    }
    return out as unknown as ArtisanFieldV1;
  };

  // ---- steps ----
  const steps: ArtisanStepV1[] = legacy.steps.map((s: StepSchema, i) => {
    const path = `steps[${i}]`;
    const type = types[i].type;
    const id = stepIds[i];
    const x = s as Record<string, unknown>;
    const out: Record<string, unknown> = { id, type, title: s.title ?? '' };
    const known = new Set<string>([
      'kind',
      'title',
      'showIf',
      'controls',
      'beforeNext',
      'onEnter',
      'fields',
    ]);

    if (s.showIf) out.visibleWhen = fromLegacyCondition(s.showIf);
    if (s.controls) out.controls = { ...s.controls };
    const hooks: Record<string, string> = {};
    if (typeof s.beforeNext === 'function')
      hooks.beforeNext = bind(
        `legacy:${id}:beforeNext`,
        s.beforeNext,
        `${path}.beforeNext`,
      );
    if (typeof s.onEnter === 'function')
      hooks.onEnter = bind(
        `legacy:${id}:onEnter`,
        s.onEnter,
        `${path}.onEnter`,
      );
    if (Object.keys(hooks).length > 0) out.hooks = hooks;

    const text = (key: string, as = key) => {
      known.add(key);
      const v = x[key];
      if (v === undefined) return;
      if (typeof v === 'string') out[as] = v;
      else bind(`legacy:${id}:${key}`, v, `${path}.${key}`);
    };

    if (type === 'form') {
      out.fields = (s.fields ?? [])
        .map((f, j) => mapField(f, `${path}.fields[${j}]`, id))
        .filter((f): f is ArtisanFieldV1 => f !== null);
    } else if (type === 'terms') {
      text('content');
      text('href');
      known.add('acceptName');
      known.add('acceptLabel');
      const accept: Record<string, string> = {};
      if (typeof x.acceptName === 'string') accept.name = x.acceptName;
      if (typeof x.acceptLabel === 'string') accept.label = x.acceptLabel;
      if (Object.keys(accept).length > 0) out.accept = accept;
      if (s.fields) {
        // Legacy allowed custom fields in a terms step; v1 terms steps have none.
        warn(
          'ignored-legacy-property',
          `${path}.fields`,
          'a terms step with its own fields is not representable in v1; dropped (the default acceptance checkbox applies)',
        );
      }
    } else if (type === 'payment') {
      known.add('provider');
      known.add('providers');
      out.providers = Array.isArray(x.providers)
        ? x.providers
        : x.provider
          ? [x.provider]
          : [];
      text('summary');
      text('resultName');
    } else if (type === 'wait') {
      known.add('wait');
      known.add('failTo');
      if (x.wait !== undefined)
        out.strategy = bind(`legacy:${id}:wait`, x.wait, `${path}.wait`);
      text('message');
      text('resultName');
      if (typeof x.failTo === 'number') {
        const target = stepIds[x.failTo];
        if (target) out.failTo = target;
        else
          warn(
            'invalid-legacy-reference',
            `${path}.failTo`,
            `index ${x.failTo} is not a step; dropped`,
          );
      }
    } else if (type === 'result') {
      text('message');
      text('errorMessage');
      known.add('actions');
      if (Array.isArray(x.actions)) {
        out.actions = (
          x.actions as { label: string; href?: string; onClick?: () => void }[]
        ).map((a, j) => {
          const action: Record<string, string> = { label: a.label };
          if (a.href !== undefined) action.href = a.href;
          if (typeof a.onClick === 'function')
            action.action = bind(
              `legacy:${id}:action:${j}`,
              a.onClick,
              `${path}.actions[${j}].onClick`,
            );
          return action;
        });
      }
    } else if (type === 'custom') {
      known.add('render');
      if (typeof x.render === 'function')
        out.renderer = bind(`legacy:${id}:render`, x.render, `${path}.render`);
      else out.renderer = `legacy:${id}:render`;
    }

    // Custom step kinds read arbitrary props: keep them under `config`.
    if (type === 'custom' || type.startsWith('x-')) {
      const config: JSONObject = {};
      for (const [k, v] of Object.entries(x)) {
        if (known.has(k)) continue;
        if (typeof v === 'function' || !isJSONValue(v))
          bind(`legacy:${id}:${k}`, v, `${path}.${k}`);
        else config[k] = v as JSONValue;
      }
      if (Object.keys(config).length > 0) out.config = config;
    } else {
      for (const k of Object.keys(x)) {
        if (!known.has(k))
          warn(
            'unknown-legacy-property',
            `${path}.${k}`,
            `"${k}" is not part of the v1 contract for "${type}"; dropped`,
          );
      }
    }
    return out as unknown as ArtisanStepV1;
  });

  // Legacy never enforced unique names; v1 does, so flag them instead of failing.
  const seen = new Map<string, string>();
  steps.forEach((s, i) => {
    if (s.type !== 'form') return;
    s.fields.forEach((f, j) => {
      if (CONTENT.has(f.type)) return;
      const first = seen.get(f.name);
      if (first)
        warn(
          'duplicate-name',
          `steps[${i}].fields[${j}].name`,
          `name "${f.name}" was already used at ${first}; values overwrite each other (as in 0.2.0)`,
        );
      else seen.set(f.name, `steps[${i}].fields[${j}]`);
    });
  });

  const schema: ArtisanSchemaV1 = {
    schemaVersion: 1,
    id: opts.id ?? 'legacy-form',
    ...(opts.revision !== undefined ? { revision: opts.revision } : {}),
    steps,
  };
  return { schema, bindings, issues, stepIds };
};
