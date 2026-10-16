import { forwardRef } from 'react';
import { useField } from 'formik';
import { cn } from '../../../commons/cn';

interface DateInputProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ id, name, label, placeholder, className }, ref) => {
    const [field, meta] = useField<string>(name);
    const error = meta.touched && meta.error ? meta.error : null;

    const classes = {
      input: cn(
        'mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm',
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
          type="date"
          id={id}
          placeholder={placeholder}
          className={classes.input}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          ref={ref}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  },
);

export default DateInput;
