import { useField } from 'formik';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../../commons/cn';
import { theme } from '../../../commons/theme';

interface DateInputProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  helperText?: string;
  /** Native input type (default `date`). */
  type?: 'date' | 'time' | 'datetime-local' | 'month';
  /** Native attributes forwarded to the element (autoComplete, inputMode, maxLength…). */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      id,
      name,
      label,
      placeholder,
      className,
      disabled,
      helperText,
      inputProps,
      type = 'date',
    },
    ref,
  ) => {
    const [field, meta] = useField<string>(name);
    const error = meta.touched && meta.error ? meta.error : null;
    const describedBy =
      [error && `${id}-error`, helperText && `${id}-help`]
        .filter(Boolean)
        .join(' ') || undefined;

    const classes = {
      input: cn(
        'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none sm:text-sm disabled:bg-gray-100 disabled:text-gray-500',
        theme.focusRing,
        theme.focusBorder,
        error && 'border-red-500',
        className,
      ),
    };

    return (
      <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          {...inputProps}
          {...field}
          value={field.value ?? ''}
          type={type}
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={classes.input}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          ref={ref}
        />
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
  },
);

export default DateInput;
