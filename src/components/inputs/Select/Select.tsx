import { forwardRef } from 'react';
import { useArtisanField } from '../../../engine/form/useArtisanField';
import { useCx } from '../../ui/UiContext';

interface SelectProps {
  name: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ name, options, disabled, className }, ref) => {
    const [field, meta] = useArtisanField<string>(name);
    const cx = useCx();

    return (
      <div className={cx('selectWrap')}>
        <select
          {...field}
          id={name}
          aria-invalid={!!meta.error}
          value={field.value ?? ''}
          ref={ref}
          disabled={disabled}
          className={cx('select', className)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={cx('selectIcon')}>
          <svg
            aria-hidden="true"
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
