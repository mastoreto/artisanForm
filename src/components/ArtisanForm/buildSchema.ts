import * as Yup from 'yup';
import type { FieldSchema, FormSchema } from './types';

const allFields = (scheme: FormSchema): FieldSchema[] =>
  scheme.steps.flatMap((step) => step.fields);

export const buildInitialValues = (scheme: FormSchema) =>
  Object.fromEntries(
    allFields(scheme).map((f) => [
      f.name,
      f.type === 'check'
        ? []
        : f.type === 'select'
          ? (f.options?.[0]?.value ?? '')
          : '',
    ]),
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
    Object.fromEntries(allFields(scheme).map((f) => [f.name, buildField(f)])),
  );
