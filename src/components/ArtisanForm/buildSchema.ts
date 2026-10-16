import * as Yup from 'yup';
import { type ArtisanLabels, defaultLabels } from '../../commons/labels';
import { matchesCondition } from './conditions';
import type { Condition, FieldSchema, FormSchema } from './types';

const allFields = (scheme: FormSchema): FieldSchema[] =>
  scheme.steps.flatMap((step) => step.fields);

/** Form values a field owns (a dynamicSelect owns two). */
export const fieldNames = (f: FieldSchema): string[] =>
  f.dependentName ? [f.name, f.dependentName] : [f.name];

export const buildInitialValues = (scheme: FormSchema) =>
  Object.fromEntries(
    allFields(scheme).flatMap((f): [string, unknown][] => {
      if (f.type === 'check') return [[f.name, f.defaultValue ?? []]];
      const first =
        (f.defaultValue as string | undefined) ?? f.options?.[0]?.value ?? '';
      if (f.type === 'select') return [[f.name, first]];
      if (f.type === 'dynamicSelect' && f.dependentName) {
        return [
          [f.name, first],
          [f.dependentName, f.dependentOptions?.[first]?.[0]?.value ?? ''],
        ];
      }
      return [[f.name, f.defaultValue ?? '']];
    }),
  );

const buildField = (f: FieldSchema, labels: ArtisanLabels) => {
  const msg = labels.required;
  if (f.type === 'check') {
    const s = Yup.array().of(Yup.string().required());
    return f.required ? s.min(1, msg) : s;
  }
  if (f.type === 'number') {
    let n = Yup.number()
      .transform((v, original) => (original === '' ? undefined : v))
      .typeError(labels.invalidNumber);
    if (f.min !== undefined) n = n.min(f.min, labels.minValue(f.min));
    if (f.max !== undefined) n = n.max(f.max, labels.maxValue(f.max));
    return f.required ? n.required(msg) : n;
  }
  let s = Yup.string();
  // Length checks skip empty values so optional fields can stay blank.
  if (f.min) {
    const min = f.min;
    s = s.test('min', labels.minLength(min), (v) => !v || v.length >= min);
  }
  if (f.max) {
    const max = f.max;
    s = s.test('max', labels.maxLength(max), (v) => !v || v.length <= max);
  }
  if (f.type === 'email') s = s.email(labels.invalidEmail);
  if (f.sameAs) s = s.oneOf([Yup.ref(f.sameAs)], labels.mustMatch);
  if (f.pattern) {
    s = s.matches(new RegExp(f.pattern), {
      message: labels.invalidPattern,
      excludeEmptyString: true,
    });
  }
  return f.required ? s.required(msg) : s;
};

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
) =>
  Yup.object(
    Object.fromEntries(
      scheme.steps.flatMap((step) =>
        step.fields.flatMap((f) => {
          const conds = [step.showIf, f.showIf].filter(
            (c): c is Condition => !!c,
          );
          return fieldNames(f).map((n) => [
            n,
            withConditions(buildField(f, labels), conds),
          ]);
        }),
      ),
    ),
  );
