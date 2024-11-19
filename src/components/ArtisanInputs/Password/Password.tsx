import { forwardRef, useState } from 'react';
import { cn } from '../../../commons/cn';

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ id, label, value, onChange, placeholder, className }, ref) => {
    const [error, setError] = useState<string | null>('Error Message');

    const classes = {
      input: cn(
        `mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${className}`,
      ),
    };

    return (
      <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          type="password"
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={classes.input}
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

export default TextInput;
