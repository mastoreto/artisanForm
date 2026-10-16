import type { ArtisanSchemaV1 } from './define';
import { ArtisanSchemaError } from './errors';
import { cloneJSON } from './json';
import { adaptLegacySchema, type LegacyFormSchema } from './legacy';
import { parseArtisanSchema } from './parser';
import type { SchemaIssue } from './types';

export interface NormalizeOptions {
  /** Form id for schemas that have none (0.2.0 schemas). */
  id?: string;
  revision?: number;
}

export interface NormalizedArtisanSchema {
  /** The v1 schema with every default applied; pure JSON and itself a valid v1 schema. */
  schema: ArtisanSchemaV1;
  /**
   * Functions and non-JSON content a 0.2.0 schema carried (`beforeNext`,
   * `loadOptions`, `render`, a `wait` strategy, JSX…), by the ids `schema`
   * refers to. Empty for plain v1 schemas.
   */
  bindings: Record<string, unknown>;
  /**
   * True when the schema can be sent as JSON and rebuilt elsewhere without
   * losing anything: no bindings and nothing dropped during adaptation.
   */
  portable: boolean;
  source: 'v1' | 'legacy';
  /** Warnings from adapting a 0.2.0 schema (never errors: legacy never throws). */
  issues: SchemaIssue[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Defaults that reproduce today's look: vertical form, 2-column grid, full-width fields. */
const withDefaults = (schema: ArtisanSchemaV1): ArtisanSchemaV1 => {
  const out = cloneJSON(schema);
  out.ui = {
    layout: 'vertical',
    density: 'comfortable',
    labelPosition: 'top',
    ...out.ui,
  };
  for (const step of out.steps) {
    if (step.type !== 'form') continue;
    step.ui = { columns: 2, ...step.ui };
    for (const field of step.fields) field.ui = { span: 2, ...field.ui };
  }
  return out;
};

const DROPPED = new Set([
  'unknown-legacy-property',
  'ignored-legacy-property',
  'invalid-legacy-reference',
]);

/**
 * Turns any supported input into the single internal representation: a
 * complete, serializable v1 schema (+ bindings for 0.2.0 functions).
 *
 * Deterministic and idempotent (`normalize(normalize(x).schema)` equals
 * `normalize(x).schema`), it never mutates its input, runs no callbacks, makes
 * no requests and knows nothing about Formik, Yup or React.
 *
 * - A v1 schema is validated (throws `ArtisanSchemaError` if invalid) and given defaults.
 * - A 0.2.0 `FormSchema` is adapted: `kind`→`type`, `showIf`→`visibleWhen`,
 *   `width`→`ui.span`, `helperText`→`description`, ids derived from titles,
 *   functions extracted to bindings. It never throws; what could not be
 *   represented is reported in `issues`.
 */
export const normalizeArtisanSchema = (
  input: ArtisanSchemaV1 | LegacyFormSchema,
  options: NormalizeOptions = {},
): NormalizedArtisanSchema => {
  if (isRecord(input) && 'schemaVersion' in input) {
    const parsed = parseArtisanSchema(input);
    if (!parsed.success) throw new ArtisanSchemaError(parsed.issues);
    return {
      schema: withDefaults(parsed.schema),
      bindings: {},
      portable: true,
      source: 'v1',
      issues: parsed.issues,
    };
  }

  if (!isRecord(input) || !Array.isArray(input.steps)) {
    throw new ArtisanSchemaError([
      {
        severity: 'error',
        code: 'invalid-type',
        path: '$',
        message:
          'expected a v1 schema or a 0.2.0 FormSchema ({ steps: [...] })',
      },
    ]);
  }

  const adapted = adaptLegacySchema(input as LegacyFormSchema, options);
  // Surface anything the v1 contract would reject (e.g. a condition on an
  // unknown field) as warnings: 0.2.0 forms keep running.
  const check = parseArtisanSchema(adapted.schema);
  const issues = [
    ...adapted.issues,
    ...(check.success
      ? []
      : check.issues.map((i) => ({ ...i, severity: 'warning' as const }))),
  ];
  return {
    schema: withDefaults(adapted.schema),
    bindings: adapted.bindings,
    portable:
      Object.keys(adapted.bindings).length === 0 &&
      !issues.some((i) => DROPPED.has(i.code)),
    source: 'legacy',
    issues,
  };
};
