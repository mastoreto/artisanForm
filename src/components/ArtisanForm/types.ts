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
  | 'tel'
  | 'url'
  | 'password'
  | 'date'
  | 'checkbox'
  | 'switch'
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
  defaultValue?: string | string[] | boolean;
  disabled?: boolean;
  helperText?: string;
  /** Native attributes (text-like fields). */
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
  maxLength?: number;
  /** Number step. */
  step?: number | string;
  /** date: earliest / latest allowed value (YYYY-MM-DD). */
  minDate?: string;
  maxDate?: string;
  /** Cross-field rule: value must equal the value of this field (e.g. password confirmation). */
  sameAs?: string;
  /** Hidden (not rendered, validated or submitted) unless the condition holds. */
  showIf?: Condition;
  /** Extra properties read by custom field types. */
  [extra: string]: unknown;
}

/** Per-step overrides for the wizard's navigation buttons. */
export interface StepControls {
  /** Hide the whole control bar. */
  hidden?: boolean;
  hidePrevious?: boolean;
  hideNext?: boolean;
  /** Keep "Siguiente"/"Finalizar" visible but disabled. */
  nextDisabled?: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

/** Outcome of `beforeNext`: return `{ error }` to block with a message. */
export type BeforeNextResult = undefined | { error: string };

export interface StepSchema {
  title: string;
  /** Step type; `form` (default) renders `fields`. See `defaultStepRegistry`. */
  kind?: string;
  fields?: FieldSchema[];
  /** The whole step is skipped unless the condition holds. */
  showIf?: Condition;
  /** Runs after the step validates and before moving on; throw or return `{ error }` to stay. */
  beforeNext?: (
    values: Record<string, unknown>,
  ) => BeforeNextResult | Promise<BeforeNextResult>;
  /** Runs every time the step becomes the current one. */
  onEnter?: (values: Record<string, unknown>) => void;
  controls?: StepControls;
  /** Extra properties read by custom step kinds (e.g. `render` for `custom`). */
  [extra: string]: unknown;
}

export interface FormSchema {
  steps: StepSchema[];
}
