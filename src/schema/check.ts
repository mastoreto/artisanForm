import {
  type CapabilitiesManifest,
  type CapabilityIssue,
  checkCapabilities,
  collectReferences,
  type Requirements,
} from './capabilities';
import type { ArtisanSchemaV1 } from './contract/define';
import type { SchemaIssue } from './contract/types';
import { lintSchema } from './lint';
import {
  type ParseOptions,
  parseArtisanSchema,
  type SchemaLimits,
  type SchemaPolicy,
} from './parser';

export interface CheckOptions {
  /** Which references a schema from outside may use (see `SchemaPolicy`). */
  policy?: 'trusted' | SchemaPolicy;
  limits?: SchemaLimits;
  /** What the front end can run (from `describeCapabilities`); omit to skip that check. */
  manifest?: CapabilitiesManifest;
  /** Semantic warnings from `lintSchema` (default true). */
  lint?: boolean;
}

export interface CheckResult {
  /** No issue has `severity: 'error'`. Warnings do not make a schema fail. */
  ok: boolean;
  /** The schema as received, present once it parsed. */
  schema?: ArtisanSchemaV1;
  /** Errors and warnings, in the order found. */
  issues: SchemaIssue[];
  /** What the schema asks of the front end (store it with the revision). */
  references?: Requirements;
}

const describe = (i: CapabilityIssue): string => {
  switch (i.code) {
    case 'unsupported-contract':
      return `the capabilities manifest uses an unknown contract "${i.id}"`;
    case 'missing-reference':
      return `"${i.id}" is not registered in ${i.kind}`;
    case 'unsupported-field-type':
      return `the field type "${i.id}" is not registered`;
    case 'unsupported-step-kind':
      return `the step type "${i.id}" is not registered`;
    case 'invalid-config':
      return `${i.id}: ${i.message}`;
    case 'missing-feature':
      return `the front end lacks the feature "${i.id}"`;
  }
};

/**
 * Whether a missing thing stops the form from working (error) or only
 * degrades one element, which keeps rendering with its own notice (warning).
 * Shared by the backend, the CLI and `<ArtisanForm>` so they report the same.
 */
export const capabilitySeverity = (i: CapabilityIssue): 'error' | 'warning' => {
  if (i.code === 'missing-reference')
    return i.kind === 'options' ||
      i.kind === 'dependentOptions' ||
      i.kind === 'storage'
      ? 'warning'
      : 'error';
  if (i.code === 'unsupported-field-type') return 'warning';
  return 'error';
};

/** A capability issue in the shape every other schema issue has. */
export const toSchemaIssue = (i: CapabilityIssue): SchemaIssue => ({
  severity: capabilitySeverity(i),
  code: i.code,
  path: i.path,
  message: describe(i),
});

/**
 * The one gate for a schema: parse (contract, policy, limits), lint, and check
 * it against what the front end can run, including the `config` of custom
 * types. It never throws, so it fits wherever a schema enters or leaves a
 * system: a backend saving or publishing one, a CI step, or the form that is
 * about to render it. Each part is also exported on its own.
 */
export const checkSchema = (
  input: unknown,
  options: CheckOptions = {},
): CheckResult => {
  const parseOptions: ParseOptions = {
    policy: options.policy,
    limits: options.limits,
  };
  let parsed: ReturnType<typeof parseArtisanSchema>;
  try {
    parsed = parseArtisanSchema(input, parseOptions);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          severity: 'error',
          code: 'invalid-type',
          path: '$',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
  if (!parsed.success) return { ok: false, issues: parsed.issues };

  const schema = parsed.schema;
  const issues = [...parsed.issues];
  if (options.lint !== false) issues.push(...lintSchema(schema));
  if (options.manifest)
    issues.push(
      ...checkCapabilities(schema, options.manifest).map(toSchemaIssue),
    );
  return {
    ok: !issues.some((i) => i.severity === 'error'),
    schema,
    issues,
    references: collectReferences(schema),
  };
};
