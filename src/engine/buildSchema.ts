import * as Yup from 'yup';
import { type ArtisanLabels, defaultLabels } from '../commons/labels';
import {
  defaultFieldRegistry,
  definitionOf,
  type FieldRegistry,
} from '../components/fields/registry';
import {
  conditionFields,
  evaluateCondition,
} from '../schema/contract/conditions';
import type { ConditionV1 } from '../schema/contract/types';
import type { FieldSchema, FormSchema } from '../schema/legacy/types';
import { conditionOf, fieldsOf } from './conditions';

const allFields = (scheme: FormSchema): FieldSchema[] =>
  scheme.steps.flatMap((step) => fieldsOf(step));

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
const withConditions = (schema: Yup.AnySchema, conds: ConditionV1[]) =>
  conds.reduce((acc, cond) => {
    // Compound conditions can read several fields: depend on all of them.
    const deps = [...new Set(conditionFields(cond))];
    return acc.when(deps, {
      is: (...vals: unknown[]) =>
        evaluateCondition(
          cond,
          Object.fromEntries(deps.map((d, i) => [d, vals[i]])),
        ),
      then: (s: Yup.AnySchema) => s,
      otherwise: () => Yup.mixed().notRequired(),
    });
  }, schema);

export const buildValidationSchema = (
  scheme: FormSchema,
  labels: ArtisanLabels = defaultLabels,
  registry: FieldRegistry = defaultFieldRegistry,
) =>
  Yup.object(
    Object.fromEntries(
      scheme.steps.flatMap((step) =>
        fieldsOf(step).flatMap((f) => {
          const conds = [conditionOf(step), conditionOf(f)].filter(
            (c): c is ConditionV1 => !!c,
          );
          return Object.entries(
            definitionOf(registry, f).rules(f, labels, registry),
          ).map(([name, schema]) => [name, withConditions(schema, conds)]);
        }),
      ),
    ),
  );
