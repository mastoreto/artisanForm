export interface FieldOption {
  value: string;
  label: string;
}

/** Shows an element only when `field` holds one of `equals` (any value if omitted). */
export interface Condition {
  field: string;
  equals?: string | string[];
  /** Negates the condition. */
  not?: boolean;
}

/** Field types shipped with the library; custom ones come from a field registry. */
export type BuiltInFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'password'
  | 'date'
  | 'select'
  | 'dynamicSelect'
  | 'check'
  | 'radio';

export interface FieldSchema {
  /** A built-in type, or any key of a custom registry passed via `fields`. */
  type: string;
  name: string;
  label: string;
  placeholder?: string;
  options?: FieldOption[];
  /** dynamicSelect: name of the dependent field and its options per parent value. */
  dependentName?: string;
  dependentOptions?: Record<string, FieldOption[]>;
  /** dynamicSelect: async alternative to `dependentOptions`. */
  loadDependentOptions?: (parentValue: string) => Promise<FieldOption[]>;
  required?: boolean;
  /** Text: min length. Number: min value. */
  min?: number;
  /** Text: max length. Number: max value. */
  max?: number;
  /** Regular expression source the text must match. */
  pattern?: string;
  /** Initial value (array for `check`). */
  defaultValue?: string | string[];
  disabled?: boolean;
  helperText?: string;
  /** Cross-field rule: value must equal the value of this field (e.g. password confirmation). */
  sameAs?: string;
  /** Hidden (not rendered, validated or submitted) unless the condition holds. */
  showIf?: Condition;
  /** Extra properties read by custom field types. */
  [extra: string]: unknown;
}

export interface StepSchema {
  title: string;
  /** The whole step is skipped unless the condition holds. */
  showIf?: Condition;
  fields: FieldSchema[];
}

export interface FormSchema {
  steps: StepSchema[];
}
