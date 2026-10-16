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

export interface FieldSchema {
  type:
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
  name: string;
  label: string;
  placeholder?: string;
  options?: FieldOption[];
  /** dynamicSelect: name of the dependent field and its options per parent value. */
  dependentName?: string;
  dependentOptions?: Record<string, FieldOption[]>;
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
