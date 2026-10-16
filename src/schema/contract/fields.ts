import type {
  ArrayValidationV1,
  ConditionV1,
  DateValidationV1,
  FieldUIConfig,
  FileValidationV1,
  JSONObject,
  JSONValue,
  NumberValidationV1,
  OptionV1,
  TextValidationV1,
} from './types';

/** Properties every field shares. */
export interface FieldBaseV1 {
  /** Stable identity of this field instance (optional; `name` is the value path). */
  id?: string;
  /** Path of the value in the form data. */
  name: string;
  label?: string;
  /** Help text under the field (0.2.0 `helperText`). */
  description?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: JSONValue;
  /** Hidden fields are neither rendered, validated nor submitted. */
  visibleWhen?: ConditionV1;
  ui?: FieldUIConfig;
}

// ---- Text family ----

export type TextFieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'password'
  | 'textarea';

export interface TextFieldV1 extends FieldBaseV1 {
  type: TextFieldType;
  placeholder?: string;
  /** `#` digit, `A` letter, `*` alphanumeric; other characters are literal. */
  mask?: string;
  prefix?: string;
  suffix?: string;
  autoComplete?: string;
  inputMode?:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search';
  readOnly?: boolean;
  /** Native limit that stops typing (use `validation.maxLength` for an error message). */
  maxLength?: number;
  validation?: TextValidationV1;
}

// ---- Numbers ----

export interface NumberFieldV1 extends FieldBaseV1 {
  type: 'number';
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  validation?: NumberValidationV1;
}

export interface RangeFieldV1 extends FieldBaseV1 {
  type: 'range';
  step?: number;
  validation?: NumberValidationV1;
}

export interface RatingFieldV1 extends FieldBaseV1 {
  type: 'rating';
  /** Number of stars. */
  length?: number;
}

export interface OtpFieldV1 extends FieldBaseV1 {
  type: 'otp';
  length?: number;
  charset?: 'numeric' | 'alphanumeric';
}

// ---- Dates ----

export interface DateFieldV1 extends FieldBaseV1 {
  type: 'date' | 'time' | 'datetime' | 'month';
  placeholder?: string;
  validation?: DateValidationV1;
}

/** Produces two values: `name` (start) and `endName` (end). */
export interface DateRangeFieldV1 extends FieldBaseV1 {
  type: 'daterange';
  placeholder?: string;
  endName?: string;
  endLabel?: string;
  validation?: DateValidationV1;
}

// ---- Choices ----

export interface ChoiceFieldV1 extends FieldBaseV1 {
  type: 'select' | 'radio' | 'check';
  options: OptionV1[];
}

/** Searchable choices; may search through a locally registered source. */
export interface SearchChoiceFieldV1 extends FieldBaseV1 {
  type: 'combobox' | 'multiselect';
  placeholder?: string;
  options?: OptionV1[];
  /** Id of a function in `extensions.options` (query → options). */
  optionsSource?: string;
}

/** Produces two values: `name` (parent) and `dependentName` (child). */
export interface DynamicSelectFieldV1 extends FieldBaseV1 {
  type: 'dynamicSelect';
  options: OptionV1[];
  dependentName?: string;
  /** Child options keyed by the parent's value. */
  dependentOptions?: Record<string, OptionV1[]>;
  /** Id of a function in `extensions.dependentOptions` (parent value → options). */
  dependentOptionsSource?: string;
}

// ---- Booleans ----

export interface BooleanFieldV1 extends FieldBaseV1 {
  type: 'checkbox' | 'switch';
}

// ---- Files ----

export interface FileFieldV1 extends FieldBaseV1 {
  type: 'file' | 'image';
  /** Native `accept` (types or extensions). */
  accept?: string;
  /** Key of the storage adapter in the `storage` prop. */
  storage?: string;
  capture?: 'user' | 'environment';
  validation?: FileValidationV1;
}

// ---- Repeatable rows ----

/** Rows are flat: no nested arrays and no `visibleWhen` inside rows (v1 limit). */
export type ArrayItemFieldV1 = Exclude<
  NativeFieldV1,
  ArrayFieldV1 | ContentFieldV1
>;

export interface ArrayFieldV1 extends FieldBaseV1 {
  type: 'array';
  itemFields: ArrayItemFieldV1[];
  addLabel?: string;
  validation?: ArrayValidationV1;
}

// ---- Display-only content (owns no values) ----

export interface ContentFieldV1 {
  type: 'heading' | 'paragraph' | 'callout' | 'divider';
  /** Content fields have no value, so `name` is just a stable key. */
  name: string;
  id?: string;
  text?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  visibleWhen?: ConditionV1;
  ui?: FieldUIConfig;
}

// ---- Custom (registered) types ----

/**
 * A field whose `type` is resolved through the field registry. Its own
 * settings live under `config` (JSON only). Custom type names must start
 * with `x-` so they can never collide with a future native type.
 */
export interface CustomFieldV1 extends FieldBaseV1 {
  type: `x-${string}`;
  config?: JSONObject;
}

export type NativeFieldV1 =
  | TextFieldV1
  | NumberFieldV1
  | RangeFieldV1
  | RatingFieldV1
  | OtpFieldV1
  | DateFieldV1
  | DateRangeFieldV1
  | ChoiceFieldV1
  | SearchChoiceFieldV1
  | DynamicSelectFieldV1
  | BooleanFieldV1
  | FileFieldV1
  | ArrayFieldV1
  | ContentFieldV1;

export type ArtisanFieldV1 = NativeFieldV1 | CustomFieldV1;

export type NativeFieldType = NativeFieldV1['type'];
