export interface FieldOption {
  value: string;
  label: string;
}

import type { StepLoopV1, StepTransitionV1 } from '../contract/steps';
import type { ConditionV1 } from '../contract/types';

/**
 * Shows an element only when `field` holds one of `equals` (any value if omitted).
 *
 * @deprecated 0.2.0 format, still supported: use `visibleWhen` (ConditionV1).
 */
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
  | 'array'
  | 'time'
  | 'datetime'
  | 'month'
  | 'daterange'
  | 'range'
  | 'rating'
  | 'otp'
  | 'combobox'
  | 'multiselect'
  | 'heading'
  | 'paragraph'
  | 'callout'
  | 'divider'
  | 'file'
  | 'image'
  | 'switch'
  | 'select'
  | 'dynamicSelect'
  | 'check'
  | 'radio';

/**
 * A field of the 0.2.0 schema shape.
 *
 * @deprecated Still fully supported (it is adapted to ArtisanSchemaV1 internally); prefer `ArtisanFieldV1` for new forms.
 */
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
  /** file/image: accepted types (native `accept`), max bytes per file, file count limits. */
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  minFiles?: number;
  /** Key of the `storage` adapter to use (default: the single/`default` one). */
  storage?: string;
  capture?: 'user' | 'environment';
  /** Input mask for text fields: `#` digit, `A` letter, `*` alphanumeric, others literal. */
  mask?: string;
  /** Adornments inside a text field (e.g. `$`). */
  prefix?: string;
  suffix?: string;
  /** daterange: name and label of the end date. */
  endName?: string;
  endLabel?: string;
  /** rating: number of stars. otp: number of characters. */
  length?: number;
  /** otp: allowed characters. */
  charset?: 'numeric' | 'alphanumeric';
  /** combobox/multiselect: async search by typed text (replaces `options`). */
  loadOptions?: (query: string) => Promise<FieldOption[]>;
  /** callout style. */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** In a form step: `half` shares a row with the next `half` field. */
  width?: 'full' | 'half';
  /** array: the fields of each row (nested arrays/conditions are not supported). */
  itemFields?: FieldSchema[];
  /** array: row count limits and the add button text. */
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  /** Number step. */
  step?: number | string;
  /** date: earliest / latest allowed value (YYYY-MM-DD). */
  minDate?: string;
  maxDate?: string;
  /** Cross-field rule: value must equal the value of this field (e.g. password confirmation). */
  sameAs?: string;
  /** Hidden (not rendered, validated or submitted) unless the condition holds. */
  showIf?: Condition;
  /** v1 condition; wins over `showIf`. Set by the schema adapter. */
  visibleWhen?: ConditionV1;
  /** Extra properties read by custom field types. */
  [extra: string]: unknown;
}

/** Per-step overrides for the wizard's navigation buttons. */
export interface StepControls {
  /** Hide the whole control bar. */
  hidden?: boolean;
  hidePrevious?: boolean;
  hideNext?: boolean;
  /** Keep "Next"/"Finish" visible but disabled. */
  nextDisabled?: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

/** Outcome of `beforeNext`: return `{ error }` to block with a message. */
export type BeforeNextResult = undefined | { error: string };

/**
 * A step of the 0.2.0 schema shape.
 *
 * @deprecated Still fully supported; prefer `ArtisanStepV1` for new forms.
 */
export interface StepSchema {
  /** Stable step id (derived for 0.2.0 schemas; explicit in v1). */
  id?: string;
  title: string;
  /** Step type; `form` (default) renders `fields`. See `defaultStepRegistry`. */
  kind?: string;
  fields?: FieldSchema[];
  /** The whole step is skipped unless the condition holds. */
  showIf?: Condition;
  /** v1 condition; wins over `showIf`. Set by the schema adapter. */
  visibleWhen?: ConditionV1;
  /** Runs after the step validates and before moving on; throw or return `{ error }` to stay. */
  beforeNext?: (
    values: Record<string, unknown>,
  ) => BeforeNextResult | Promise<BeforeNextResult>;
  /** Runs every time the step becomes the current one. */
  onEnter?: (values: Record<string, unknown>) => void;
  controls?: StepControls;
  /** v1 transitions, loop bound and revisit rule (see `StepBaseV1`). Set by the projection. */
  next?: StepTransitionV1[];
  loop?: StepLoopV1;
  revisit?: 'allow' | 'deny';
  /** Extra properties read by custom step kinds (e.g. `render` for `custom`). */
  [extra: string]: unknown;
}

/**
 * The 0.2.0 `scheme` shape.
 *
 * @deprecated Still fully supported; prefer `ArtisanSchemaV1` (see `defineForm`).
 */
export interface FormSchema {
  steps: StepSchema[];
}
