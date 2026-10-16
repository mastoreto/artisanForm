export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldSchema {
  type:
    | 'text'
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
  min?: number;
}

export interface StepSchema {
  title: string;
  fields: FieldSchema[];
}

export interface FormSchema {
  steps: StepSchema[];
}
