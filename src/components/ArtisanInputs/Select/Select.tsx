import { useField } from 'formik';
import { forwardRef } from 'react';
import { cn } from '../../../commons/cn';

interface SelectProps {
  name: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ name, options, disabled, className }, ref) => {
    const [field] = useField<string>(name);

    return (
      <div className="relative inline-block w-full">
        <select
          {...field}
          value={field.value ?? ''}
          ref={ref}
          disabled={disabled}
          className={cn(
            'block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline disabled:bg-gray-100 disabled:text-gray-500 transition ease-in-out duration-150',
            className,
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg
            aria-hidden="true"
            className="fill-current h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    );
  },
);

export default Select;
