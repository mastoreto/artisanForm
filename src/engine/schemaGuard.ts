import {
  ArtisanSchemaError,
  checkCapabilities,
  lintSchema,
  type NormalizedArtisanSchema,
  type SchemaIssue,
  toSchemaIssue,
} from '../schema';
import type { FormSchema } from '../schema/legacy/types';
import type { RuntimeProjection } from './project';
import { describeRegistrations, type Registrations } from './registrations';

/** What the form renders from when its schema cannot run: no steps, nothing to submit. */
export const BLOCKED_PROJECTION: RuntimeProjection = {
  scheme: { steps: [] } as unknown as FormSchema,
  formId: 'invalid-schema',
  ui: {},
  stepIds: [],
  key: 'invalid-schema',
  issues: [],
};

/** The issues of a failure while preparing the schema; never rethrows. */
export const issuesOf = (error: unknown): SchemaIssue[] =>
  error instanceof ArtisanSchemaError
    ? error.issues
    : [
        {
          severity: 'error',
          code: 'invalid-schema',
          path: '$',
          message: error instanceof Error ? error.message : String(error),
        },
      ];

/** Extension references the projection already resolves (and reports) itself. */
const RESOLVED_BY_PROJECTION = new Set([
  'hooks',
  'waits',
  'renderers',
  'actions',
  'options',
  'dependentOptions',
]);

/**
 * Everything wrong or doubtful about the schema a form was given, from the
 * contract, the references the app did not register, the `config` of custom
 * types and lint. Errors stop the form (`ArtisanForm` shows a panel); warnings
 * only report. A 0.2.0 schema never blocks: its form keeps running and what
 * was not understood stays a warning.
 */
export const collectSchemaIssues = ({
  normalized,
  parseIssues,
  projectionIssues,
  registrations,
}: {
  normalized: NormalizedArtisanSchema | null;
  parseIssues: SchemaIssue[];
  projectionIssues: SchemaIssue[];
  registrations: Registrations;
}): SchemaIssue[] => {
  const out = [...parseIssues];
  if (!normalized) return [...out, ...projectionIssues];
  out.push(...normalized.issues, ...projectionIssues);

  const manifest = describeRegistrations(registrations);
  // Names that came with a 0.2.0 schema (its functions) count as registered.
  const bound = Object.keys(normalized.bindings);
  for (const kind of RESOLVED_BY_PROJECTION)
    manifest.refs[kind as 'hooks'] = [
      ...manifest.refs[kind as 'hooks'],
      ...bound,
    ];
  for (const issue of checkCapabilities(normalized, manifest)) {
    if (
      issue.code === 'missing-reference' &&
      RESOLVED_BY_PROJECTION.has(issue.kind)
    )
      continue;
    const found = toSchemaIssue(issue);
    out.push(
      normalized.source === 'legacy'
        ? { ...found, severity: 'warning' }
        : found,
    );
  }
  out.push(...lintSchema(normalized.schema));
  return out;
};
