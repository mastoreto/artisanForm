export interface FieldOption {
  value: string;
  label: string;
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
}

export interface StepSchema {
  title: string;
  fields: FieldSchema[];
}

export interface FormSchema {
  steps: StepSchema[];
}
