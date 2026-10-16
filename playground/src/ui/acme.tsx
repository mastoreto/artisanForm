import type {
  ArtisanComponents,
  ArtisanControlsProps,
  ArtisanFieldWrapperProps,
  ArtisanInputProps,
  ArtisanStepperProps,
} from 'artisanform';
import './acme.css';

/**
 * A made-up design system ("Acme"): plain components that know nothing about
 * ArtisanForm's engine. Wrapping shadcn/ui, MUI, Chakra or Mantine controls
 * follows the same pattern: map `ArtisanInputProps` to the library's props.
 */
const AcmeField = ({
  children,
  label,
  id,
  description,
  error,
}: ArtisanFieldWrapperProps) => (
  <div className="acme-field" data-invalid={!!error}>
    <label className="acme-label" htmlFor={id}>
      {label}
    </label>
    {children}
    {description && (
      <small className="acme-help" id={`${id}-help`}>
        {description}
      </small>
    )}
    {error && (
      <small className="acme-error" id={`${id}-error`} role="alert">
        {error.message}
      </small>
    )}
  </div>
);

const AcmeText = (p: ArtisanInputProps<string>) => (
  <input
    className="acme-input"
    id={p.id}
    name={p.name}
    value={p.value ?? ''}
    placeholder={p.placeholder}
    disabled={p.disabled}
    readOnly={p.readOnly}
    required={p.required}
    {...p.aria}
    onChange={(e) => p.onChange(e.target.value)}
    onBlur={p.onBlur}
  />
);

const AcmeSelect = (p: ArtisanInputProps<string>) => (
  <select
    className="acme-input"
    id={p.id}
    value={p.value ?? ''}
    {...p.aria}
    onChange={(e) => p.onChange(e.target.value)}
    onBlur={p.onBlur}
  >
    {p.options?.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);

const AcmeStepper = ({ steps }: ArtisanStepperProps) => (
  <ol className="acme-stepper" aria-label="Progress">
    {steps.map((s) => (
      <li
        key={s.id}
        data-state={s.state}
        aria-current={s.state === 'current' ? 'step' : undefined}
      >
        {s.title}
      </li>
    ))}
  </ol>
);

const AcmeControls = (p: ArtisanControlsProps) => (
  <div className="acme-controls">
    {!p.isFirst && (
      <button
        type="button"
        className="acme-btn acme-btn--ghost"
        onClick={p.onPrevious}
      >
        ← {p.labels.previous}
      </button>
    )}
    <button
      type="button"
      className="acme-btn"
      onClick={p.onNext}
      disabled={p.isSubmitting}
    >
      {p.isLast ? p.labels.submit : `${p.labels.next} →`}
    </button>
  </div>
);

export const acme: ArtisanComponents = {
  FieldWrapper: AcmeField,
  Stepper: AcmeStepper,
  Controls: AcmeControls,
  inputs: { text: AcmeText, email: AcmeText, select: AcmeSelect },
};
