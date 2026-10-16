export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldSchema {
  type: 'text' | 'password' | 'date' | 'select' | 'check' | 'radio';
  name: string;
  label: string;
  placeholder?: string;
  options?: FieldOption[];
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
