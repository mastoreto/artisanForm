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

const buildField = (f: FieldSchema) => {
  const msg = 'Campo requerido';
  if (f.type === 'check') {
    const s = Yup.array().of(Yup.string().required());
    return f.required ? s.min(1, msg) : s;
  }
  if (f.type === 'number') {
    let n = Yup.number()
      .transform((v, original) => (original === '' ? undefined : v))
      .typeError('Número inválido');
    if (f.min !== undefined) n = n.min(f.min, `Mínimo ${f.min}`);
    if (f.max !== undefined) n = n.max(f.max, `Máximo ${f.max}`);
    return f.required ? n.required(msg) : n;
  }
  let s = Yup.string();
  // Length checks skip empty values so optional fields can stay blank.
  if (f.min) {
    const min = f.min;
    s = s.test('min', `Mínimo ${min} caracteres`, (v) => !v || v.length >= min);
  }
  if (f.max) {
    const max = f.max;
    s = s.test('max', `Máximo ${max} caracteres`, (v) => !v || v.length <= max);
  }
  if (f.type === 'email') s = s.email('Email inválido');
  if (f.pattern) {
    s = s.matches(new RegExp(f.pattern), {
      message: 'Formato inválido',
      excludeEmptyString: true,
    });
  }
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
