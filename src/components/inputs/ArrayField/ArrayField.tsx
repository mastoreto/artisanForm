import type { ReactNode } from 'react';
import { useFieldArray, useFormState } from 'react-hook-form';
import { cn } from '../../../commons/cn';
import { type ArtisanLabels, defaultLabels } from '../../../commons/labels';
import { errorAt } from '../../../engine/form/errors';

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
  const { fields: rows, append, remove } = useFieldArray({ name });
  const { errors } = useFormState({ name });
  const error = errorAt(errors, name) ?? null;
  const canAdd =
    !disabled && (maxItems === undefined || rows.length < maxItems);
  const canRemove = !disabled && rows.length > minItems;

  return (
    <fieldset className={cn('mb-4', className)}>
      <legend className="text-sm font-medium text-gray-700">{label}</legend>
      {helperText && <p className="text-sm text-gray-500">{helperText}</p>}
      <ul className="mt-2 space-y-3">
        {rows.map((row, i) => (
          <li key={row.id} className="rounded-md border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {labels.itemTitle(i + 1)}
              </span>
              <button
                type="button"
                className="text-sm underline disabled:opacity-50"
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
        className="mt-3 rounded border px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
      >
        {addLabel ?? labels.addItem}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" aria-live="polite">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default ArrayField;
