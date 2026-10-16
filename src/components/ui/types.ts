import type { ComponentType, ReactNode } from 'react';
import type { ArtisanLabels } from '../../commons/labels';
import type { FieldSchema } from '../../schema/legacy/types';

export interface ArtisanFieldError {
  /** What failed (the validation rule, e.g. `required`, `min`, `typeError`). */
  code: string;
  message: string;
}

/**
 * What a replacement input receives. It never sees the form engine: read
 * `value`, call `onChange(value)` / `onBlur()`, and wire the accessibility
 * attributes from `aria`.
 *
 * Accessibility is yours: associate the label with the control (`htmlFor` =
 * `id`), spread `aria` on the control, and render `description` / `error`
 * with `descriptionId` / `errorId` (or provide a `FieldWrapper` that does).
 * `aria-invalid` is also what moves focus to the first invalid field.
 */
export interface ArtisanInputProps<TValue = unknown> {
  id: string;
  name: string;
  value: TValue;
  onChange(value: TValue): void;
  onBlur(): void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  label: string;
  description?: string;
  placeholder?: string;
  /** For select-like types (`select`, `radio`, `check`, `combobox`, `multiselect`). */
  options?: { value: string; label: string }[];
  /** Present once the field was touched (or "Next" was tried) and is invalid. */
  error?: ArtisanFieldError;
  aria: {
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  };
  descriptionId?: string;
  errorId?: string;
  /** The field definition from the schema, read-only (extras such as `mask`, `min`, `uiVariant`). */
  field: Readonly<FieldSchema>;
}

/** Value each overridable field type holds. */
export interface InputValueByType {
  text: string;
  email: string;
  tel: string;
  url: string;
  password: string;
  textarea: string;
  date: string;
  time: string;
  datetime: string;
  month: string;
  select: string;
  radio: string;
  combobox: string;
  otp: string;
  number: number | string;
  range: number | string;
  rating: number | string;
  checkbox: boolean;
  switch: boolean;
  check: string[];
  multiselect: string[];
}

export type OverridableInputType = keyof InputValueByType;

export type ArtisanInputComponents = {
  [K in OverridableInputType]?: ComponentType<
    ArtisanInputProps<InputValueByType[K]>
  >;
};

export interface ArtisanFieldWrapperProps {
  id: string;
  label: string;
  description?: string;
  error?: ArtisanFieldError;
  invalid: boolean;
  className?: string;
  /** The control. When you provide this wrapper, the default inputs skip their own label/description/error. */
  children: ReactNode;
}

export interface ArtisanStepperProps {
  steps: {
    id: string;
    title: string;
    state: 'done' | 'current' | 'upcoming';
  }[];
  /** Index of the current step among `steps`. */
  current: number;
  labels: ArtisanLabels;
}

export interface ArtisanControlsProps {
  /** Validates the step, runs its hooks and moves on (submits on the last step). */
  onNext(): void;
  onPrevious(): void;
  isFirst: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  nextDisabled?: boolean;
  hidePrevious?: boolean;
  hideNext?: boolean;
  /** Message of a blocked transition (`beforeNext`) or a failed submit. */
  error: string | null;
  labels: Pick<ArtisanLabels, 'previous' | 'next' | 'submit'>;
}

export interface ArtisanStepHeaderProps {
  title: string;
  index: number;
  total: number;
}

export interface ArtisanFormErrorProps {
  message: string;
}

/** Every piece of the default UI that can be replaced (all optional). */
export interface ArtisanComponents {
  Stepper?: ComponentType<ArtisanStepperProps>;
  Controls?: ComponentType<ArtisanControlsProps>;
  FieldWrapper?: ComponentType<ArtisanFieldWrapperProps>;
  StepHeader?: ComponentType<ArtisanStepHeaderProps>;
  FormError?: ComponentType<ArtisanFormErrorProps>;
  /** Replace the control of single-value field types, by field `type`. */
  inputs?: ArtisanInputComponents;
}
