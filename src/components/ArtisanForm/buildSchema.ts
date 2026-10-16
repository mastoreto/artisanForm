import * as Yup from 'yup';
import type { FieldSchema, FormSchema } from './types';

const allFields = (scheme: FormSchema): FieldSchema[] =>
  scheme.steps.flatMap((step) => step.fields);

/** Form values a field owns (a dynamicSelect owns two). */
export const fieldNames = (f: FieldSchema): string[] =>
  f.dependentName ? [f.name, f.dependentName] : [f.name];

export const buildInitialValues = (scheme: FormSchema) =>
  Object.fromEntries(
    allFields(scheme).flatMap((f): [string, unknown][] => {
      if (f.type === 'check') return [[f.name, []]];
      const first = f.options?.[0]?.value ?? '';
      if (f.type === 'select') return [[f.name, first]];
      if (f.type === 'dynamicSelect' && f.dependentName) {
        return [
          [f.name, first],
          [f.dependentName, f.dependentOptions?.[first]?.[0]?.value ?? ''],
        ];
      }
      return [[f.name, '']];
    }),
  );

const buildField = (f: FieldSchema) => {
  const msg = 'Campo requerido';
  if (f.type === 'check') {
    const s = Yup.array().of(Yup.string().required());
    return f.required ? s.min(1, msg) : s;
  }
  let s = Yup.string();
  if (f.min) s = s.min(f.min, `Mínimo ${f.min} caracteres`);
  return f.required ? s.required(msg) : s;
};

export const buildValidationSchema = (scheme: FormSchema) =>
  Yup.object(
    Object.fromEntries(
      allFields(scheme).flatMap((f) =>
        fieldNames(f).map((n) => [n, buildField(f)]),
      ),
    ),
  );
