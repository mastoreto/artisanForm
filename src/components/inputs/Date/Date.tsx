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
        <input
          {...inputProps}
          {...field}
          value={field.value ?? ''}
          type={type}
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          className={cx('input', className)}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          ref={ref}
        />
        <FieldHelp id={id} text={helperText} />
        <FieldError id={id} error={error} />
      </FieldBox>
    );
  },
);

export default DateInput;
