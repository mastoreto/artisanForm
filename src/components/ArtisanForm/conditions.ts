import type { Condition, FieldSchema, FormSchema, StepSchema } from './types';

type Values = Record<string, unknown>;

/** True when the condition's field currently holds one of the `equals` values (or any value when omitted). */
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

export const isStepVisible = (step: StepSchema, values: Values) =>
  !step.showIf || matchesCondition(step.showIf, values);

export const isFieldVisible = (field: FieldSchema, values: Values) =>
  !field.showIf || matchesCondition(field.showIf, values);

export const visibleSteps = (scheme: FormSchema, values: Values) =>
  scheme.steps.filter((s) => isStepVisible(s, values));

export const visibleFields = (step: StepSchema, values: Values) =>
  (step.fields ?? []).filter((f) => isFieldVisible(f, values));
