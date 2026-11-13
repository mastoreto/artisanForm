import type { ArtisanSchemaV1 } from './contract/define';
import type { ArtisanFieldV1 } from './contract/fields';
import { NATIVE_FIELD_TYPES, NATIVE_STEP_TYPES } from './contract/specs';
import type { ArtisanStepV1 } from './contract/steps';
import { type CustomTypeSpec, validateConfig } from './custom-types';
import type { NormalizedArtisanSchema } from './normalize';

/**
 * What a schema needs from the front end that renders it, and a way to check
 * it against what that front end has. A schema only NAMES hooks, wait
 * strategies, renderers, actions, option sources, payment providers, storage
 * adapters and custom types; the code lives in the app. These functions let
 * an API refuse a schema the deployed front cannot run when it is published,
 * instead of finding out as a render-time `unresolved-reference`.
 *
 * Pure and dependency-free (no React): they live in `artisanform/schema`.
 */

export const CAPABILITIES_CONTRACT = 'artisanform.capabilities/1';

/**
 * Optional behaviors a schema can depend on. A front that lacks one reports it
 * in `checkCapabilities`, so a schema written for a newer library is refused
 * instead of silently misbehaving. Additive: new entries never change old ones.
 */
export const FEATURES = [
  'transitions', // step `next`, `loop`, `revisit`
  'wait-options', // wait `timeoutMs`, `retry`, `cancellable`
  'options-source-choice', // `optionsSource` on select and radio
] as const;
export type Feature = (typeof FEATURES)[number];

/** The kinds of named reference a schema can hold. */
export const REF_KINDS = [
  'hooks',
  'waits',
  'renderers',
  'actions',
  'options',
  'dependentOptions',
  'paymentProviders',
  'storage',
] as const;
export type RefKind = (typeof REF_KINDS)[number];

/** One named reference and where in the schema it is. */
export interface Reference {
  kind: RefKind;
  id: string;
  /** Same path format as the parser's issues, e.g. `steps[1].strategy`. */
  path: string;
}

/** Everything a schema requires, as sorted unique ids. Store it with each revision. */
export interface Requirements extends Record<RefKind, string[]> {
  /** Every field `type` used (native and custom). */
  fieldTypes: string[];
  /** Every step `type` used (native and custom). */
  stepKinds: string[];
  features: Feature[];
}

/** What a front end offers. `describeCapabilities` produces it; an API stores it. */
export interface CapabilitiesManifest {
  contract: typeof CAPABILITIES_CONTRACT;
  fieldTypes: string[];
  stepKinds: string[];
  features: string[];
  refs: Record<RefKind, string[]>;
  /**
   * What the app declares about its custom (`x-…`) types, so the `config` of a
   * schema's custom fields and steps can be checked without the app's code.
   * Absent in manifests made before it existed.
   */
  customTypes?: CustomTypeSpec[];
}

/** Structural: an `ArtisanExtensions` object fits, and no React type is needed. */
export interface CapabilitySources {
  extensions?: {
    hooks?: object;
    waits?: object;
    renderers?: object;
    actions?: object;
    options?: object;
    dependentOptions?: object;
  };
  /** Ids of the registered payment plugins (`plugins.payments`). */
  paymentProviders?: readonly string[];
  /** Keys of the `storage` adapters. */
  storage?: readonly string[];
  /** Custom field types registered through the `fields` prop (`x-…`). */
  fieldTypes?: readonly string[];
  /** Custom step types registered through the `stepTypes` prop (`x-…`). */
  stepKinds?: readonly string[];
  /** Shape of the `config` of custom types; their names are added to the type lists. */
  customTypes?: readonly CustomTypeSpec[];
}

export type CapabilityIssue =
  | { code: 'unsupported-contract'; id: string; path: '' }
  | { code: 'missing-reference'; kind: RefKind; id: string; path: string }
  | { code: 'unsupported-field-type'; id: string; path: string }
  | { code: 'unsupported-step-kind'; id: string; path: string }
  | { code: 'invalid-config'; id: string; path: string; message: string }
  | { code: 'missing-feature'; id: string; path: '' };

const unique = (xs: Iterable<string>) => [...new Set(xs)].sort();

const keysOf = (o: object | undefined) => (o ? Object.keys(o) : []);

/** Whether this field type runs on the shared ids a schema may name. */
const fieldRefs = (f: ArtisanFieldV1, path: string, out: Reference[]) => {
  const add = (kind: RefKind, id: unknown, at: string) => {
    if (typeof id === 'string') out.push({ kind, id, path: at });
  };
  const loose = f as unknown as Record<string, unknown>;
  add('options', loose.optionsSource, `${path}.optionsSource`);
  add(
    'dependentOptions',
    loose.dependentOptionsSource,
    `${path}.dependentOptionsSource`,
  );
  add('storage', loose.storage, `${path}.storage`);
  if (f.type === 'array')
    f.itemFields.forEach((item, i) => {
      fieldRefs(item, `${path}.itemFields[${i}]`, out);
    });
};

const stepRefs = (s: ArtisanStepV1, path: string, out: Reference[]) => {
  const add = (kind: RefKind, id: unknown, at: string) => {
    if (typeof id === 'string') out.push({ kind, id, path: at });
  };
  add('hooks', s.hooks?.beforeNext, `${path}.hooks.beforeNext`);
  add('hooks', s.hooks?.onEnter, `${path}.hooks.onEnter`);
  switch (s.type) {
    case 'form':
      s.fields.forEach((f, i) => {
        fieldRefs(f, `${path}.fields[${i}]`, out);
      });
      break;
    case 'wait':
      add('waits', s.strategy, `${path}.strategy`);
      break;
    case 'custom':
      add('renderers', s.renderer, `${path}.renderer`);
      break;
    case 'payment':
      s.providers.forEach((p, i) => {
        add('paymentProviders', p, `${path}.providers[${i}]`);
      });
      break;
    case 'result':
      (s.actions ?? []).forEach((a, i) => {
        add('actions', a.action, `${path}.actions[${i}].action`);
      });
      break;
    default:
  }
};

/** Every named reference in the schema, with its location. */
export const listReferences = (
  input: ArtisanSchemaV1 | NormalizedArtisanSchema,
): Reference[] => {
  const schema = 'bindings' in input ? input.schema : input;
  const out: Reference[] = [];
  schema.steps.forEach((s, i) => {
    stepRefs(s, `steps[${i}]`, out);
  });
  return out;
};

const walkFields = (
  fields: readonly ArtisanFieldV1[],
  fn: (f: ArtisanFieldV1, path: string) => void,
  base: string,
) =>
  fields.forEach((f, i) => {
    const path = `${base}[${i}]`;
    fn(f, path);
    if (f.type === 'array') walkFields(f.itemFields, fn, `${path}.itemFields`);
  });

/** The optional behaviors the schema depends on. */
const featuresOf = (schema: ArtisanSchemaV1): Feature[] => {
  const used = new Set<Feature>();
  schema.steps.forEach((s) => {
    if (s.next || s.loop || s.revisit) used.add('transitions');
    if (
      s.type === 'wait' &&
      (s.timeoutMs !== undefined || s.retry || s.cancellable)
    )
      used.add('wait-options');
    if (s.type === 'form')
      walkFields(
        s.fields,
        (f) => {
          if (
            (f.type === 'select' || f.type === 'radio') &&
            'optionsSource' in f &&
            f.optionsSource
          )
            used.add('options-source-choice');
        },
        '',
      );
  });
  return FEATURES.filter((f) => used.has(f));
};

/** What the schema requires, as sorted unique ids (store it with each revision). */
export const collectReferences = (
  input: ArtisanSchemaV1 | NormalizedArtisanSchema,
): Requirements => {
  const schema = 'bindings' in input ? input.schema : input;
  const refs = listReferences(schema);
  const byKind = (kind: RefKind) =>
    unique(refs.filter((r) => r.kind === kind).map((r) => r.id));
  const fieldTypes = new Set<string>();
  schema.steps.forEach((s) => {
    if (s.type === 'form')
      walkFields(s.fields, (f) => fieldTypes.add(f.type), '');
  });
  return {
    hooks: byKind('hooks'),
    waits: byKind('waits'),
    renderers: byKind('renderers'),
    actions: byKind('actions'),
    options: byKind('options'),
    dependentOptions: byKind('dependentOptions'),
    paymentProviders: byKind('paymentProviders'),
    storage: byKind('storage'),
    fieldTypes: unique(fieldTypes),
    stepKinds: unique(schema.steps.map((s) => s.type)),
    features: featuresOf(schema),
  };
};

/** What this front end offers, from its registered extensions, plugins and adapters. */
export const describeCapabilities = (
  sources: CapabilitySources = {},
): CapabilitiesManifest => ({
  contract: CAPABILITIES_CONTRACT,
  fieldTypes: unique([
    ...NATIVE_FIELD_TYPES,
    ...(sources.fieldTypes ?? []),
    ...(sources.customTypes ?? [])
      .filter((t) => t.kind === 'field')
      .map((t) => t.type),
  ]),
  stepKinds: unique([
    ...NATIVE_STEP_TYPES,
    ...(sources.stepKinds ?? []),
    ...(sources.customTypes ?? [])
      .filter((t) => t.kind === 'step')
      .map((t) => t.type),
  ]),
  features: [...FEATURES],
  refs: {
    hooks: unique(keysOf(sources.extensions?.hooks)),
    waits: unique(keysOf(sources.extensions?.waits)),
    renderers: unique(keysOf(sources.extensions?.renderers)),
    actions: unique(keysOf(sources.extensions?.actions)),
    options: unique(keysOf(sources.extensions?.options)),
    dependentOptions: unique(keysOf(sources.extensions?.dependentOptions)),
    paymentProviders: unique(sources.paymentProviders ?? []),
    storage: unique(sources.storage ?? []),
  },
  ...(sources.customTypes?.length
    ? { customTypes: [...sources.customTypes] }
    : {}),
});

/**
 * Can a front end with this `manifest` run the schema? An empty list means
 * yes. Meant to run on the server when a revision is published, and in the
 * front before rendering a schema it just fetched.
 */
export const checkCapabilities = (
  input: ArtisanSchemaV1 | NormalizedArtisanSchema,
  manifest: CapabilitiesManifest,
): CapabilityIssue[] => {
  const schema = 'bindings' in input ? input.schema : input;
  if (manifest.contract !== CAPABILITIES_CONTRACT)
    return [
      { code: 'unsupported-contract', id: String(manifest.contract), path: '' },
    ];

  const issues: CapabilityIssue[] = [];
  for (const r of listReferences(schema))
    if (!manifest.refs[r.kind]?.includes(r.id))
      issues.push({
        code: 'missing-reference',
        kind: r.kind,
        id: r.id,
        path: r.path,
      });

  const fields = new Set(manifest.fieldTypes);
  const steps = new Set(manifest.stepKinds);
  const specs = new Map(
    (manifest.customTypes ?? []).map((t) => [`${t.kind}:${t.type}`, t]),
  );
  /** The `config` of a custom element against the shape its app declared. */
  const checkConfig = (
    kind: 'field' | 'step',
    type: string,
    config: unknown,
    path: string,
  ) => {
    const shape = specs.get(`${kind}:${type}`)?.config;
    if (!shape) return;
    for (const issue of validateConfig(shape, config ?? {}))
      issues.push({
        code: 'invalid-config',
        id: type,
        path: issue.path ? `${path}.config.${issue.path}` : `${path}.config`,
        message: issue.message,
      });
  };
  schema.steps.forEach((s, i) => {
    if (!steps.has(s.type))
      issues.push({
        code: 'unsupported-step-kind',
        id: s.type,
        path: `steps[${i}].type`,
      });
    else
      checkConfig(
        'step',
        s.type,
        (s as { config?: unknown }).config,
        `steps[${i}]`,
      );
    if (s.type === 'form')
      walkFields(
        s.fields,
        (f, path) => {
          if (!fields.has(f.type))
            issues.push({
              code: 'unsupported-field-type',
              id: f.type,
              path: `${path}.type`,
            });
          else
            checkConfig(
              'field',
              f.type,
              (f as { config?: unknown }).config,
              path,
            );
        },
        `steps[${i}].fields`,
      );
  });

  const features = new Set(manifest.features);
  for (const feature of featuresOf(schema))
    if (!features.has(feature))
      issues.push({ code: 'missing-feature', id: feature, path: '' });
  return issues;
};
