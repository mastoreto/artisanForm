import { forwardRef, type InputHTMLAttributes } from 'react';
import { useArtisanField } from '../../../engine/form/useArtisanField';
import {
  describedBy as ariaDescribedBy,
  FieldBox,
  FieldError,
  FieldHelp,
  FieldLabel,
} from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

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
    const cx = useCx();
    const describedBy = ariaDescribedBy(id, { helperText, error });

    return (
      <FieldBox
        id={id}
        label={label}
        helperText={helperText}
        error={error}
        errorCode={meta.code}
      >
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <div className={cx('inputWrap')}>
          {prefix && (
            <span className={cx('adornment')} data-side="start">
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
            className={cx('input', className)}
            data-prefix={prefix ? '' : undefined}
            data-suffix={suffix ? '' : undefined}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            ref={ref}
          />
          {suffix && (
            <span className={cx('adornment')} data-side="end">
              {suffix}
            </span>
          )}
        </div>
        <FieldHelp id={id} text={helperText} />
        <FieldError id={id} error={error} />
      </FieldBox>
    );
  },
);

export default TextInput;
