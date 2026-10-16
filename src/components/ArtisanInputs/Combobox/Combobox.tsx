import { useField } from 'formik';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../../commons/cn';
import { type ArtisanLabels, defaultLabels } from '../../../commons/labels';
import { theme } from '../../../commons/theme';

interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  id: string;
  name: string;
  label: string;
  /** Static options (filtered as you type). */
  options?: Option[];
  /** Async search: called (debounced) with the typed text. Replaces `options`. */
  loadOptions?: (query: string) => Promise<Option[]>;
  /** Several values (chips) instead of one. */
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
  className?: string;
  labels?: Pick<ArtisanLabels, 'noResults' | 'searching' | 'removeFile'>;
}

/** Searchable select (WAI-ARIA combobox + listbox); `multiple` shows chips. */
const Combobox = ({
  id,
  name,
  label,
  options = [],
  loadOptions,
  multiple = false,
  placeholder,
  disabled,
  helperText,
  className,
  labels = defaultLabels,
}: ComboboxProps) => {
  const [field, meta, helpers] = useField<string | string[]>(name);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<Option[]>(options);
  const [searching, setSearching] = useState(false);
  // Async options come and go: remember every label seen to render chips.
  const known = useRef(new Map<string, string>());
  for (const o of [...options, ...found]) known.current.set(o.value, o.label);

  const selected = multiple
    ? ((field.value as string[] | undefined) ?? [])
    : field.value
      ? [field.value as string]
      : [];
  const error = meta.touched && meta.error ? meta.error : null;
  const labelOf = (v: string) => known.current.get(v) ?? v;

  useEffect(() => {
    if (!loadOptions) {
      const q = query.trim().toLowerCase();
      setFound(options.filter((o) => !q || o.label.toLowerCase().includes(q)));
      return;
    }
    let stale = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await loadOptions(query);
        if (!stale) setFound(result);
      } catch {
        if (!stale) setFound([]);
      } finally {
        if (!stale) setSearching(false);
      }
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  const choose = (o: Option) => {
    if (multiple) {
      helpers.setValue(
        selected.includes(o.value)
          ? selected.filter((v) => v !== o.value)
          : [...selected, o.value],
      );
      setQuery('');
    } else {
      helpers.setValue(o.value);
      setQuery('');
      setOpen(false);
    }
    helpers.setTouched(true, false);
  };

  const remove = (v: string) => {
    helpers.setValue(selected.filter((x) => x !== v));
    helpers.setTouched(true, false);
  };

  const onKeyDown = (key: string, prevent: () => void) => {
    if (key === 'ArrowDown') {
      prevent();
      setOpen(true);
      setActive((i) => Math.min(i + 1, found.length - 1));
    } else if (key === 'ArrowUp') {
      prevent();
      setActive((i) => Math.max(i - 1, 0));
    } else if (key === 'Enter' && open && found[active]) {
      prevent();
      choose(found[active]);
    } else if (key === 'Escape') {
      setOpen(false);
    } else if (key === 'Backspace' && multiple && !query && selected.length) {
      remove(selected[selected.length - 1]);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;
  const text = open ? query : multiple ? query : labelOf(selected[0] ?? '');

  return (
    <div className={cn('mb-4', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative mt-1">
        {multiple && selected.length > 0 && (
          <ul className="mb-1 flex flex-wrap gap-1">
            {selected.map((v) => (
              <li
                key={v}
                className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm"
              >
                {labelOf(v)}
                <button
                  type="button"
                  aria-label={labels.removeFile(labelOf(v))}
                  disabled={disabled}
                  onClick={() => remove(v)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && found[active] ? optionId(active) : undefined
          }
          aria-invalid={!!error}
          aria-describedby={
            [error && `${id}-error`, helperText && `${id}-help`]
              .filter(Boolean)
              .join(' ') || undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Let a click on an option land before closing.
            setTimeout(() => setOpen(false), 120);
            helpers.setTouched(true, false);
          }}
          onKeyDown={(e) => onKeyDown(e.key, () => e.preventDefault())}
          className={cn(
            'block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none sm:text-sm disabled:bg-gray-100',
            theme.focusRing,
            theme.focusBorder,
            error && 'border-red-500',
          )}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow"
          >
            {searching && (
              <li className="px-3 py-2 text-sm text-gray-500">
                {labels.searching}
              </li>
            )}
            {!searching && found.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">
                {labels.noResults}
              </li>
            )}
            {found.map((o, i) => (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                aria-selected={selected.includes(o.value)}
                // keep focus in the input so blur does not close before the click
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onKeyDown={() => {}}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  i === active && 'bg-gray-100',
                  selected.includes(o.value) && 'font-semibold',
                )}
              >
                {o.label}
              </li>
            ))}
          </ul>
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
};

export default Combobox;
