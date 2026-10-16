import { defaultLabels } from '../commons/labels';
import {
  conditionFields,
  evaluateCondition,
  fromLegacyCondition,
} from '../schema/contract/conditions';
import type { ConditionV1 } from '../schema/contract/types';
import type {
  Condition,
  FieldSchema,
  FormSchema,
  StepSchema,
} from '../schema/legacy/types';

type Values = Record<string, unknown>;

/**
 * True when the condition's field currently holds one of the `equals` values (or any value when omitted).
 *
 * @deprecated 0.2.0 semantics, kept for compatibility; conditions are evaluated with `evaluateCondition`.
 */
export const matchesCondition = (cond: Condition, values: Values): boolean => {
  const value = values[cond.field];
  const current = Array.isArray(value)
    ? value.map(String)
    : [String(value ?? '')];
  const expected =
    cond.equals === undefined
      ? undefined
      : Array.isArray(cond.equals)
        ? cond.equals
        : [cond.equals];
  const hit = expected
    ? current.some((v) => expected.includes(v))
    : current.some((v) => v !== '');
  return cond.not ? !hit : hit;
};

/** The v1 condition of a step or field (0.2.0 `showIf` is translated). */
export const conditionOf = (el: {
  visibleWhen?: ConditionV1;
  showIf?: Condition;
}): ConditionV1 | undefined =>
  el.visibleWhen ?? (el.showIf ? fromLegacyCondition(el.showIf) : undefined);

const isVisible = (el: Parameters<typeof conditionOf>[0], values: Values) => {
  const cond = conditionOf(el);
  return !cond || evaluateCondition(cond, values);
};

/** Names of the fields any step or field condition reads (what visibility depends on). */
export const conditionNames = (scheme: FormSchema): string[] => {
  const names = new Set<string>();
  const add = (el: Parameters<typeof conditionOf>[0]) => {
    const cond = conditionOf(el);
    if (cond) for (const n of conditionFields(cond)) names.add(n);
  };
  for (const step of scheme.steps) {
    add(step);
    for (const f of fieldsOf(step)) add(f);
  }
  return [...names];
};

export const isStepVisible = (step: StepSchema, values: Values) =>
  isVisible(step, values);

export const isFieldVisible = (field: FieldSchema, values: Values) =>
  isVisible(field, values);

export const visibleSteps = (scheme: FormSchema, values: Values) =>
  scheme.steps.filter((s) => isStepVisible(s, values));

/** A step's fields; a `terms` step without any gets its acceptance checkbox. */
export const fieldsOf = (step: StepSchema): FieldSchema[] => {
  if (step.fields) return step.fields;
  if (step.kind !== 'terms') return [];
  return [
    {
      type: 'checkbox',
      name: (step.acceptName as string | undefined) ?? 'termsAccepted',
      label:
        (step.acceptLabel as string | undefined) ?? defaultLabels.acceptTerms,
      required: true,
    },
  ];
};

/** Form values a step stores for itself (outside its fields), e.g. a payment record. */
export const storedName = (step: StepSchema): string | undefined =>
  typeof step.resultName === 'string'
    ? step.resultName
    : step.kind === 'payment'
      ? 'payment'
      : undefined;

export const visibleFields = (step: StepSchema, values: Values) =>
  fieldsOf(step).filter((f) => isFieldVisible(f, values));
