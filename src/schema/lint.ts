import { answerKeys } from './answers';
import { conditionFields } from './contract/conditions';
import type { ArtisanSchemaV1 } from './contract/define';
import type { ArtisanFieldV1 } from './contract/fields';
import type { ConditionV1, OptionV1, SchemaIssue } from './contract/types';

/**
 * Semantic warnings that the parser does not raise because the schema is valid
 * to the contract, yet probably not what its author meant. Never errors: a
 * schema that lints is still a schema.
 *
 * - `forward-field-reference`: a condition reads a field of a LATER step, which
 *   cannot have an answer yet.
 * - `default-not-an-option`: a `defaultValue` that is not one of the options.
 * - `duplicate-option`: two options with the same `value`.
 */
export const lintSchema = (schema: ArtisanSchemaV1): SchemaIssue[] => {
  const out: SchemaIssue[] = [];
  const warn = (code: string, path: string, message: string) =>
    out.push({ severity: 'warning', code, path, message });

  // Step index of the step that asks each answer key.
  const stepOf = new Map<string, number>();
  schema.steps.forEach((step, i) => {
    if (step.type !== 'form') return;
    for (const field of step.fields)
      for (const key of answerKeys(field))
        if (!stepOf.has(key)) stepOf.set(key, i);
  });

  const checkCondition = (cond: ConditionV1, at: number, path: string) => {
    for (const name of conditionFields(cond)) {
      const where = stepOf.get(name);
      if (where !== undefined && where > at)
        warn(
          'forward-field-reference',
          path,
          `reads "${name}", which a later step (steps[${where}]) asks`,
        );
    }
  };

  const checkOptions = (
    field: ArtisanFieldV1,
    options: readonly OptionV1[],
    path: string,
  ) => {
    const seen = new Set<string>();
    options.forEach((o, i) => {
      if (seen.has(o.value))
        warn(
          'duplicate-option',
          `${path}.options[${i}]`,
          `the option value "${o.value}" is repeated`,
        );
      seen.add(o.value);
    });
    const def = (field as { defaultValue?: unknown }).defaultValue;
    const defaults = Array.isArray(def) ? def : def === undefined ? [] : [def];
    for (const d of defaults)
      if (typeof d === 'string' && !seen.has(d))
        warn(
          'default-not-an-option',
          `${path}.defaultValue`,
          `"${d}" is not one of the options`,
        );
  };

  schema.steps.forEach((step, i) => {
    const base = `steps[${i}]`;
    if (step.visibleWhen)
      checkCondition(step.visibleWhen, i, `${base}.visibleWhen`);
    step.next?.forEach((edge, e) => {
      if (edge.when) checkCondition(edge.when, i, `${base}.next[${e}].when`);
    });
    if (step.type !== 'form') return;
    step.fields.forEach((field, f) => {
      const path = `${base}.fields[${f}]`;
      if (field.visibleWhen)
        checkCondition(field.visibleWhen, i, `${path}.visibleWhen`);
      const options = (field as { options?: readonly OptionV1[] }).options;
      if (Array.isArray(options)) checkOptions(field, options, path);
    });
  });
  return out;
};
