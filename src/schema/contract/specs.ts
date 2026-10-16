import type { NativeFieldType, NativeFieldV1 } from './fields';
import type { NativeStepType, NativeStepV1 } from './steps';

/** The field variant(s) of the union whose `type` includes `K`. */
export type FieldOf<K extends NativeFieldType> = NativeFieldV1 extends infer F
  ? F extends { type: infer T }
    ? K extends T
      ? F
      : never
    : never
  : never;

export type StepOf<K extends NativeStepType> = Extract<
  NativeStepV1,
  { type: K }
>;

const base = [
  'type',
  'id',
  'name',
  'label',
  'description',
  'required',
  'disabled',
  'defaultValue',
  'visibleWhen',
  'ui',
] as const;

const text = [
  ...base,
  'placeholder',
  'mask',
  'prefix',
  'suffix',
  'autoComplete',
  'inputMode',
  'readOnly',
  'maxLength',
  'validation',
] as const;

const dated = [...base, 'placeholder', 'validation'] as const;
const content = [
  'type',
  'name',
  'id',
  'text',
  'variant',
  'visibleWhen',
  'ui',
] as const;

/**
 * Properties each native field type accepts. The parser rejects the rest, and
 * the checks below make adding a type or a property without updating this
 * table a compile error.
 */
export const FIELD_KEYS = {
  text,
  email: text,
  tel: text,
  url: text,
  password: text,
  textarea: text,
  number: [...base, 'placeholder', 'prefix', 'suffix', 'step', 'validation'],
  range: [...base, 'step', 'validation'],
  rating: [...base, 'length'],
  otp: [...base, 'length', 'charset'],
  date: dated,
  time: dated,
  datetime: dated,
  month: dated,
  daterange: [...dated, 'endName', 'endLabel'],
  select: [...base, 'options'],
  radio: [...base, 'options'],
  check: [...base, 'options'],
  combobox: [...base, 'placeholder', 'options', 'optionsSource'],
  multiselect: [...base, 'placeholder', 'options', 'optionsSource'],
  dynamicSelect: [
    ...base,
    'options',
    'dependentName',
    'dependentOptions',
    'dependentOptionsSource',
  ],
  checkbox: base,
  switch: base,
  file: [...base, 'accept', 'storage', 'capture', 'validation'],
  image: [...base, 'accept', 'storage', 'capture', 'validation'],
  array: [...base, 'itemFields', 'addLabel', 'validation'],
  heading: content,
  paragraph: content,
  callout: content,
  divider: content,
} as const satisfies {
  [K in NativeFieldType]: readonly (keyof FieldOf<K>)[];
};

const stepBase = [
  'type',
  'id',
  'title',
  'visibleWhen',
  'ui',
  'controls',
  'hooks',
] as const;

export const STEP_KEYS = {
  form: [...stepBase, 'fields'],
  payment: [...stepBase, 'providers', 'resultName', 'summary'],
  wait: [...stepBase, 'strategy', 'message', 'resultName', 'failTo'],
  terms: [...stepBase, 'content', 'href', 'accept'],
  review: stepBase,
  result: [...stepBase, 'message', 'errorMessage', 'actions'],
  custom: [...stepBase, 'renderer', 'config'],
} as const satisfies {
  [K in NativeStepType]: readonly (keyof StepOf<K>)[];
};

// Completeness: every property of every variant must be listed above.
type MissingField = {
  [K in NativeFieldType]: Exclude<
    keyof FieldOf<K>,
    (typeof FIELD_KEYS)[K][number]
  >;
}[NativeFieldType];
type MissingStep = {
  [K in NativeStepType]: Exclude<
    keyof StepOf<K>,
    (typeof STEP_KEYS)[K][number]
  >;
}[NativeStepType];
export const specsAreComplete: [MissingField | MissingStep] extends [never]
  ? true
  : never = true;

export const NATIVE_FIELD_TYPES = Object.keys(FIELD_KEYS) as NativeFieldType[];
export const NATIVE_STEP_TYPES = Object.keys(STEP_KEYS) as NativeStepType[];

export const isNativeFieldType = (type: string): type is NativeFieldType =>
  Object.hasOwn(FIELD_KEYS, type);
export const isNativeStepType = (type: string): type is NativeStepType =>
  Object.hasOwn(STEP_KEYS, type);
export const isExtensionType = (type: string): type is `x-${string}` =>
  type.startsWith('x-') && type.length > 2;
