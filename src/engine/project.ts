import { ArtisanSchemaError } from '../schema/contract/errors';
import type { FormUIConfig, SchemaIssue } from '../schema/contract/types';
import type { FormSchema } from '../schema/legacy/types';
import type { NormalizedArtisanSchema } from '../schema/normalize';
import type { ArtisanExtensions, OnUnresolved } from './extensions';

type Obj = Record<string, unknown>;

export interface RuntimeProjection {
  /** The shape the wizard engine consumes (0.2.0 `FormSchema` plus step ids and v1 conditions). */
  scheme: FormSchema;
  formId: string;
  revision?: number;
  /** Semantic UI settings of the form (`layout`, `density`, `labelPosition`). */
  ui: FormUIConfig;
  /** Step ids in schema order. */
  stepIds: string[];
  /** Changes only when the schema's content changes (not when its identity does). */
  key: string;
  /** Warnings: what does not stop the form (a missing options source leaves its field without options). */
  issues: SchemaIssue[];
}

export interface ProjectionRegistries {
  fieldTypes: readonly string[];
  stepKinds: readonly string[];
}

const TEXT = new Set(['text', 'email', 'tel', 'url', 'password', 'textarea']);
const DATE = new Set(['date', 'time', 'datetime', 'month', 'daterange']);

/** v1 `x-name` → the registry key actually present (`x-name`, or the 0.2.0 `name`). */
const resolveType = (type: string, keys: readonly string[]) =>
  type.startsWith('x-') && !keys.includes(type) && keys.includes(type.slice(2))
    ? type.slice(2)
    : type;

/**
 * Turns the normalized v1 schema into what the engine runs today. This is the
 * only place that knows both shapes; swapping the form/validation libraries later changes the
 * engine side, not the contract.
 */
export const projectToRuntime = (
  normalized: NormalizedArtisanSchema,
  ext: ArtisanExtensions | undefined,
  registries: ProjectionRegistries,
  onUnresolved?: OnUnresolved,
  /** Identity of the content when it differs from `schema` (e.g. a translated copy). */
  contentKey?: string,
): RuntimeProjection => {
  const { schema, bindings } = normalized;
  const issues: SchemaIssue[] = [];
  const stepIds = schema.steps.map((s) => s.id);

  const resolve = (
    group: keyof ArtisanExtensions,
    id: string,
    path: string,
  ): unknown => {
    const found =
      (ext?.[group] as Record<string, unknown> | undefined)?.[id] ??
      bindings[id];
    if (
      found === undefined &&
      onUnresolved?.({ group, id, path }) !== 'ignore'
    ) {
      issues.push({
        // Options are loaded on demand: without a loader the field just has none.
        severity:
          group === 'options' || group === 'dependentOptions'
            ? 'warning'
            : 'error',
        code: 'unresolved-reference',
        path,
        message: `"${id}" is not registered in extensions.${group}`,
      });
    }
    return found;
  };

  const projectField = (
    f: Obj,
    path: string,
    stepId: string,
    columns: number,
    top: boolean,
  ): Obj => {
    const type = String(f.type);
    const out: Obj = {
      type: resolveType(type, registries.fieldTypes),
      name: f.name,
    };
    const {
      type: _t,
      name: _n,
      id: _id,
      label,
      text,
      description,
      validation,
      ui,
      config,
      itemFields,
      optionsSource,
      dependentOptionsSource,
      visibleWhen,
      ...rest
    } = f;
    out.label = (text ?? label ?? '') as string;
    if (description !== undefined) out.helperText = description;
    Object.assign(out, rest);
    // Custom renderers may read `ui.variant`; the default UI ignores it.
    if ((ui as Obj | undefined)?.variant !== undefined)
      out.uiVariant = (ui as Obj).variant;
    if (config && typeof config === 'object') Object.assign(out, config);

    const v = (validation ?? {}) as Obj;
    if (TEXT.has(type)) {
      if (v.minLength !== undefined) out.min = v.minLength;
      if (v.maxLength !== undefined) out.max = v.maxLength;
      if (v.pattern !== undefined) out.pattern = v.pattern;
      if (v.sameAs !== undefined) out.sameAs = v.sameAs;
    } else if (type === 'number' || type === 'range') {
      if (v.min !== undefined) out.min = v.min;
      if (v.max !== undefined) out.max = v.max;
    } else if (DATE.has(type)) {
      if (v.min !== undefined) out.minDate = v.min;
      if (v.max !== undefined) out.maxDate = v.max;
    } else {
      for (const k of [
        'minItems',
        'maxItems',
        'maxSize',
        'minFiles',
        'maxFiles',
      ]) {
        if (v[k] !== undefined) out[k] = v[k];
      }
    }

    if (top) {
      const span = (ui as Obj | undefined)?.span;
      out.width = columns === 2 && span === 1 ? 'half' : 'full';
    }
    if (visibleWhen) out.visibleWhen = visibleWhen;
    if (typeof optionsSource === 'string')
      out.loadOptions = resolve(
        'options',
        optionsSource,
        `${path}.optionsSource`,
      );
    if (typeof dependentOptionsSource === 'string')
      out.loadDependentOptions = resolve(
        'dependentOptions',
        dependentOptionsSource,
        `${path}.dependentOptionsSource`,
      );
    if (Array.isArray(itemFields))
      out.itemFields = itemFields.map((row, i) =>
        projectField(
          row as Obj,
          `${path}.itemFields[${i}]`,
          stepId,
          columns,
          false,
        ),
      );

    // Function props a 0.2.0 custom field carried come back as they were.
    const prefix = `legacy:${stepId}:${String(f.name)}:`;
    for (const [key, value] of Object.entries(bindings)) {
      if (!key.startsWith(prefix)) continue;
      const prop = key.slice(prefix.length);
      if (prop !== 'loadOptions' && prop !== 'loadDependentOptions')
        out[prop] = value;
    }
    return out;
  };

  const HANDLED = new Set([
    'beforeNext',
    'onEnter',
    'render',
    'wait',
    'summary',
    'content',
    'message',
    'errorMessage',
  ]);

  const steps = schema.steps.map((s, i) => {
    const path = `steps[${i}]`;
    const step = s as unknown as Obj;
    const type = String(step.type);
    const out: Obj = {
      id: step.id,
      title: step.title,
      kind:
        type === 'wait' ? 'pending' : resolveType(type, registries.stepKinds),
    };
    if (step.visibleWhen) out.visibleWhen = step.visibleWhen;
    if (step.controls) out.controls = step.controls;
    if (step.next !== undefined) out.next = step.next;
    if (step.loop !== undefined) out.loop = step.loop;
    if (step.revisit !== undefined) out.revisit = step.revisit;

    const hooks = (step.hooks ?? {}) as Record<string, string>;
    if (hooks.beforeNext)
      out.beforeNext = resolve(
        'hooks',
        hooks.beforeNext,
        `${path}.hooks.beforeNext`,
      );
    if (hooks.onEnter)
      out.onEnter = resolve('hooks', hooks.onEnter, `${path}.hooks.onEnter`);

    // 0.2.0 may have JSX where v1 has text: the adapter parked it in bindings.
    const textProp = (key: string) => {
      if (step[key] !== undefined) out[key] = step[key];
      else if (bindings[`legacy:${step.id}:${key}`] !== undefined)
        out[key] = bindings[`legacy:${step.id}:${key}`];
    };

    if (type === 'form') {
      const columns =
        ((step.ui as Obj | undefined)?.columns as number | undefined) ?? 2;
      out.fields = ((step.fields as Obj[]) ?? []).map((f, j) =>
        projectField(f, `${path}.fields[${j}]`, String(step.id), columns, true),
      );
    } else if (type === 'payment') {
      out.providers = step.providers;
      if (step.resultName !== undefined) out.resultName = step.resultName;
      textProp('summary');
    } else if (type === 'wait') {
      out.wait = resolve('waits', String(step.strategy), `${path}.strategy`);
      if (step.message !== undefined) out.message = step.message;
      if (step.resultName !== undefined) out.resultName = step.resultName;
      for (const key of ['timeoutMs', 'retry', 'cancellable'])
        if (step[key] !== undefined) out[key] = step[key];
      // A step id: the wizard resolves it against the visible steps at
      // navigation time (an index in the full list would drift when a step is hidden).
      if (typeof step.failTo === 'string' && stepIds.includes(step.failTo))
        out.failTo = step.failTo;
    } else if (type === 'terms') {
      textProp('content');
      if (step.href !== undefined) out.href = step.href;
      const accept = step.accept as Obj | undefined;
      if (accept?.name !== undefined) out.acceptName = accept.name;
      if (accept?.label !== undefined) out.acceptLabel = accept.label;
    } else if (type === 'result') {
      textProp('message');
      textProp('errorMessage');
      if (Array.isArray(step.actions)) {
        out.actions = (step.actions as Obj[]).map((a, j) => {
          const action: Obj = { label: a.label };
          if (a.href !== undefined) action.href = a.href;
          if (typeof a.action === 'string')
            action.onClick = resolve(
              'actions',
              a.action,
              `${path}.actions[${j}].action`,
            );
          return action;
        });
      }
    } else if (type === 'custom') {
      if (typeof step.renderer === 'string')
        out.render = resolve('renderers', step.renderer, `${path}.renderer`);
    }

    if (step.config && typeof step.config === 'object')
      Object.assign(out, step.config);
    // Function props a 0.2.0 custom step carried come back as they were.
    const prefix = `legacy:${step.id}:`;
    for (const [key, value] of Object.entries(bindings)) {
      if (!key.startsWith(prefix)) continue;
      const prop = key.slice(prefix.length);
      if (!prop.includes(':') && !HANDLED.has(prop)) out[prop] = value;
    }
    return out;
  });

  if (issues.some((i) => i.severity === 'error'))
    throw new ArtisanSchemaError(issues);

  return {
    scheme: { steps } as unknown as FormSchema,
    formId: schema.id,
    revision: schema.revision,
    ui: schema.ui ?? {},
    stepIds,
    key: contentKey ?? JSON.stringify(schema),
    issues,
  };
};
