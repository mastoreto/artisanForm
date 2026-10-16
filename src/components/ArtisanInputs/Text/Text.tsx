import { forwardRef } from 'react';
import { useField } from 'formik';
import { cn } from '../../../commons/cn';

interface TextInputProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  helperText?: string;
  type?: 'text' | 'email' | 'number';
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      id,
      name,
      label,
      placeholder,
      className,
      disabled,
      helperText,
      type = 'text',
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
        'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500',
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
          <p className="mt-2 text-sm text-red-600" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default TextInput;
