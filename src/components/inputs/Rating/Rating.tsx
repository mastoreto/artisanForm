import { useId } from 'react';
import { useArtisanField } from '../../../engine/form/useArtisanField';
import { FieldBox } from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

interface RatingProps {
  name: string;
  label: string;
  /** Number of stars (default 5). */
  max?: number;
  disabled?: boolean;
  helperText?: string;
  className?: string;
}

/** 1..max star rating exposed as a radio group; click the chosen star again to clear. */
const Rating = ({
  name,
  label,
  max = 5,
  disabled,
  helperText,
  className,
}: RatingProps) => {
  const [field, meta, helpers] = useArtisanField<number | string>(name);
  const value = Number(field.value) || 0;
  const error = meta.touched && meta.error ? meta.error : null;
  const labelId = useId();
  const cx = useCx();

  const choose = (n: number) => {
    helpers.setValue(n === value ? '' : n);
    helpers.setTouched();
  };

  return (
    <FieldBox
      id={name}
      label={label}
      helperText={helperText}
      error={error}
      errorCode={meta.code}
      className={className}
    >
      <span id={labelId} className={cx('label')}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={!!error}
        className={cx('rating')}
      >
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={`${n} / ${max}`}
            disabled={disabled}
            onClick={() => choose(n)}
            className={cx('star')}
            data-filled={n <= value || undefined}
          >
            ★
          </button>
        ))}
      </div>
      {helperText && <p className={cx('description')}>{helperText}</p>}
      {error && (
        <p className={cx('error')} aria-live="polite">
          {error}
        </p>
      )}
    </FieldBox>
  );
};

export default Rating;
