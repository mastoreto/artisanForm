import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../../commons/cn';
import { theme } from '../../../commons/theme';
import { useArtisanField } from '../../../engine/form/useArtisanField';

/** `#` digit, `A` letter, `*` alphanumeric; anything else is a literal. */
export const applyMask = (raw: string, mask: string): string => {
  let out = '';
  let i = 0;
  for (const m of mask) {
    if (i >= raw.length) break;
    if (m === '#' || m === 'A' || m === '*') {
      // Skip characters that cannot go in this slot.
      const ok = (c: string) =>
        m === '#'
          ? /\d/.test(c)
          : m === 'A'
            ? /[a-zA-Z]/.test(c)
            : /[a-zA-Z0-9]/.test(c);
      while (i < raw.length && !ok(raw[i])) i++;
      if (i >= raw.length) break;
      out += raw[i++];
    } else {
      out += m;
      if (raw[i] === m) i++;
    }
  }
  return out;
};

interface TextInputProps {
  id: string;
  name: string;
  label: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  helperText?: string;
  /** Input mask: `#` digit, `A` letter, `*` any alphanumeric; other characters are literal (e.g. `##-########-#`). */
  mask?: string;
  /** Adornments shown inside the field (e.g. a currency symbol). */
  prefix?: string;
  suffix?: string;
  /** Native attributes forwarded to the element (autoComplete, inputMode, maxLength…). */
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  type?: 'text' | 'email' | 'number' | 'tel' | 'url';
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
      mask,
      prefix,
      suffix,
      inputProps,
      type = 'text',
    },
    ref,
  ) => {
    const [field, meta] = useArtisanField<string>(name);
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
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
              {prefix}
            </span>
          )}
          <input
            {...inputProps}
            {...field}
            onChange={(e) => {
              if (mask) e.target.value = applyMask(e.target.value, mask);
              field.onChange(e);
            }}
            value={field.value ?? ''}
            type={type}
            id={id}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(classes.input, prefix && 'pl-8', suffix && 'pr-10')}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            ref={ref}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
              {suffix}
            </span>
          )}
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
  },
);

export default TextInput;
