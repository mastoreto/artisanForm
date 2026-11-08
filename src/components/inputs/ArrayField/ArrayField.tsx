import type { ReactNode } from 'react';
import { useFieldArray, useFormState } from 'react-hook-form';
import { type ArtisanLabels, defaultLabels } from '../../../commons/labels';
import { errorAt } from '../../../engine/form/errors';
import { useCx } from '../../ui/UiContext';

interface ArrayFieldProps {
  name: string;
  label: string;
  /** Values of a new, empty row. */
  emptyRow: () => Record<string, unknown>;
  /** Render the fields of row `index` (their names are `name.index.field`). */
  renderRow: (index: number) => ReactNode;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  disabled?: boolean;
  helperText?: string;
  className?: string;
  labels?: Pick<ArtisanLabels, 'addItem' | 'removeItem' | 'itemTitle'>;
}

/** Repeatable group of fields ("add another"). */
const ArrayField = ({
  name,
  label,
  emptyRow,
  renderRow,
  minItems = 0,
  maxItems,
  addLabel,
  disabled,
  helperText,
  className,
  labels = defaultLabels,
}: ArrayFieldProps) => {
  const cx = useCx();
  const { fields: rows, append, remove } = useFieldArray({ name });
  const { errors } = useFormState({ name });
  const error = errorAt(errors, name) ?? null;
  const canAdd =
    !disabled && (maxItems === undefined || rows.length < maxItems);
  const canRemove = !disabled && rows.length > minItems;

  return (
    <fieldset
      className={cx('field', className)}
      data-invalid={!!error || undefined}
    >
      <legend className={cx('groupLabel')}>{label}</legend>
      {helperText && <p className={cx('description')}>{helperText}</p>}
      <ul className={cx('arrayList')}>
        {rows.map((row, i) => (
          <li key={row.id} className={cx('arrayItem')}>
            <div className={cx('arrayItemHeader')}>
              <span className={cx('arrayItemTitle')}>
                {labels.itemTitle(i + 1)}
              </span>
              <button
                type="button"
                className={cx('link')}
                disabled={!canRemove}
                onClick={() => remove(i)}
                aria-label={labels.removeItem(i + 1)}
              >
                ×
              </button>
            </div>
            {renderRow(i)}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => append(emptyRow())}
        className={cx('smallButton')}
      >
        {addLabel ?? labels.addItem}
      </button>
      {error && (
        <p className={cx('error')} aria-live="polite">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default ArrayField;
