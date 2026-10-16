import * as Yup from 'yup';
import { type ArtisanLabels, defaultLabels } from '../../commons/labels';
import { matchesCondition } from './conditions';
import {
  defaultFieldRegistry,
  definitionOf,
  type FieldRegistry,
} from './fields';
import type { Condition, FieldSchema, FormSchema } from './types';

const allFields = (scheme: FormSchema): FieldSchema[] =>
  scheme.steps.flatMap((step) => step.fields);

/** Form value names a field owns (a dynamicSelect owns two). */
export const fieldNames = (
  f: FieldSchema,
  registry: FieldRegistry = defaultFieldRegistry,
): string[] => Object.keys(definitionOf(registry, f).initialValues(f));

export const buildInitialValues = (
  scheme: FormSchema,
  registry: FieldRegistry = defaultFieldRegistry,
) =>
  Object.assign(
    {},
    ...allFields(scheme).map((f) => definitionOf(registry, f).initialValues(f)),
  ) as Record<string, unknown>;

/** Disables a field's rules whenever any of its conditions is not met. */
const withConditions = (schema: Yup.AnySchema, conds: Condition[]) =>
  conds.reduce(
    (acc, cond) =>
      acc.when(cond.field, {
        is: (value: unknown) => matchesCondition(cond, { [cond.field]: value }),
        then: (s: Yup.AnySchema) => s,
        otherwise: () => Yup.mixed().notRequired(),
      }),
    schema,
  );

export const buildValidationSchema = (
  scheme: FormSchema,
  labels: ArtisanLabels = defaultLabels,
  registry: FieldRegistry = defaultFieldRegistry,
) =>
  Yup.object(
    Object.fromEntries(
      scheme.steps.flatMap((step) =>
        step.fields.flatMap((f) => {
          const conds = [step.showIf, f.showIf].filter(
            (c): c is Condition => !!c,
          );
          return Object.entries(definitionOf(registry, f).rules(f, labels)).map(
            ([name, schema]) => [name, withConditions(schema, conds)],
          );
        }),
      ),
    ),
  );
