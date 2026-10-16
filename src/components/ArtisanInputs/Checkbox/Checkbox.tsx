import { useField } from 'formik';
import { cn } from '../../../commons/cn';
import { theme } from '../../../commons/theme';

interface CheckboxProps {
  id: string;
  name: string;
  label: string;
  /** `switch` renders a toggle; both hold a boolean. */
  variant?: 'checkbox' | 'switch';
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

const Checkbox = ({
  id,
  name,
  label,
  variant = 'checkbox',
  disabled,
  helperText,
  className,
}: CheckboxProps) => {
  const [field, meta, helpers] = useField<boolean>(name);
  const checked = !!field.value;
  const error = meta.touched && meta.error ? meta.error : null;
  const describedBy =
    [error && `${id}-error`, helperText && `${id}-help`]
      .filter(Boolean)
      .join(' ') || undefined;

  const toggle = (next: boolean) => {
    helpers.setValue(next);
    helpers.setTouched(true, false);
  };

  return (
    <div className={cn('mb-4', className)}>
      <div className="flex items-center gap-3">
        {variant === 'switch' ? (
          <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            disabled={disabled}
            onClick={() => toggle(!checked)}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
              checked ? theme.bg : 'bg-gray-300',
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                checked && 'translate-x-5',
              )}
            />
          </button>
        ) : (
          <input
            type="checkbox"
            id={id}
            name={name}
            checked={checked}
            onChange={(e) => toggle(e.target.checked)}
            onBlur={field.onBlur}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn('h-4 w-4 rounded border-gray-300', theme.accent)}
          />
        )}
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      </div>
      {helperText && (
        <p className="mt-1 text-sm text-gray-500" id={`${id}-help`}>
          {helperText}
        </p>
      )}
      {error && (
        <p
          className="mt-2 text-sm text-red-600"
          id={`${id}-error`}
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Checkbox;
