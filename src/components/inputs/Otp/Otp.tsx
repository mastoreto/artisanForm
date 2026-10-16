import { useRef } from 'react';
import { cn } from '../../../commons/cn';
import { useArtisanField } from '../../../engine/form/useArtisanField';

interface OtpProps {
  id: string;
  name: string;
  label: string;
  /** Number of characters (default 6). */
  length?: number;
  /** `numeric` (default) or `alphanumeric`. */
  charset?: 'numeric' | 'alphanumeric';
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

/** One box per character with auto-advance, backspace and paste. */
const Otp = ({
  id,
  name,
  label,
  length = 6,
  charset = 'numeric',
  disabled,
  helperText,
  className,
}: OtpProps) => {
  const [field, meta, helpers] = useArtisanField<string>(name);
  const error = meta.touched && meta.error ? meta.error : null;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => (field.value ?? '')[i] ?? '');
  const allowed = (c: string) =>
    charset === 'numeric' ? /^\d$/.test(c) : /^[a-zA-Z0-9]$/.test(c);

  const write = (next: string[]) =>
    helpers.setValue(next.join('').slice(0, length));

  const onChange = (i: number, raw: string) => {
    const typed = Array.from(raw).filter(allowed);
    if (typed.length === 0) return;
    const next = [...chars];
    typed.forEach((c, k) => {
      if (i + k < length) next[i + k] = c;
    });
    write(next);
    refs.current[Math.min(i + typed.length, length - 1)]?.focus();
  };

  const onKeyDown = (i: number, key: string) => {
    if (key === 'Backspace') {
      const next = [...chars];
      if (next[i]) {
        next[i] = '';
        write(next);
      } else if (i > 0) {
        next[i - 1] = '';
        write(next);
        refs.current[i - 1]?.focus();
      }
    } else if (key === 'ArrowLeft') refs.current[i - 1]?.focus();
    else if (key === 'ArrowRight') refs.current[i + 1]?.focus();
  };

  return (
    <div className={cn('mb-4', className)}>
      <span
        id={`${id}-label`}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-1 flex gap-2"
      >
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={i === 0 ? id : `${id}-${i}`}
            value={c}
            inputMode={charset === 'numeric' ? 'numeric' : 'text'}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`${label} ${i + 1}/${length}`}
            aria-invalid={!!error}
            disabled={disabled}
            maxLength={length}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e.key)}
            onFocus={(e) => e.target.select()}
            onBlur={() => helpers.setTouched()}
            className={cn(
              'h-10 w-10 rounded-md border text-center text-lg',
              error ? 'border-red-500' : 'border-gray-300',
            )}
          />
        ))}
      </div>
      {helperText && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
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

export default Otp;
