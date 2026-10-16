import { useEffect, useId, useState } from 'react';
import { type ArtisanLabels, defaultLabels } from '../../../commons/labels';
import { useArtisanField } from '../../../engine/form/useArtisanField';
import {
  describedBy as ariaDescribedBy,
  FieldBox,
  FieldError,
  FieldHelp,
  FieldLabel,
} from '../../ui/FieldParts';
import { useCx } from '../../ui/UiContext';

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
  const cx = useCx();
  const [field, meta, helpers] = useArtisanField<string | string[]>(name);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<Option[]>(options);
  const [searching, setSearching] = useState(false);
  // Async options come and go: remember every label seen to render chips.
  const [known, setKnown] = useState(() => new Map<string, string>());
  // Adjusting state while rendering (not in an effect) is the React-sanctioned
  // way to derive state from props; it only fires when a label is new.
  const seen = [...options, ...found].filter(
    (o) => known.get(o.value) !== o.label,
  );
  if (seen.length)
    setKnown(
      new Map([...known, ...seen.map((o) => [o.value, o.label] as const)]),
    );

  const selected = multiple
    ? ((field.value as string[] | undefined) ?? [])
    : field.value
      ? [field.value as string]
      : [];
  const error = meta.touched && meta.error ? meta.error : null;
  const labelOf = (v: string) =>
    [...options, ...found].find((o) => o.value === v)?.label ??
    known.get(v) ??
    v;

  useEffect(() => {
    if (!loadOptions) {
      const q = query.trim().toLowerCase();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- local filtering follows the query
      setFound(options.filter((o) => !q || o.label.toLowerCase().includes(q)));
      return;
    }
    let stale = false;
    setSearching(true);
    const timer = setTimeout(() => {
      Promise.resolve()
        .then(() => loadOptions(query))
        .then((result) => {
          if (!stale) setFound(result);
        })
        .catch(() => {
          if (!stale) setFound([]);
        })
        .finally(() => {
          if (!stale) setSearching(false);
        });
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
    helpers.setTouched();
  };

  const remove = (v: string) => {
    helpers.setValue(selected.filter((x) => x !== v));
    helpers.setTouched();
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
    <FieldBox
      id={id}
      label={label}
      helperText={helperText}
      error={error}
      errorCode={meta.code}
      className={className}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className={cx('comboWrap')}>
        {multiple && selected.length > 0 && (
          <ul className={cx('chipList')}>
            {selected.map((v) => (
              <li key={v} className={cx('chip')}>
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
          aria-describedby={ariaDescribedBy(id, { helperText, error })}
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
            helpers.setTouched();
          }}
          onKeyDown={(e) => onKeyDown(e.key, () => e.preventDefault())}
          className={cx('input')}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            className={cx('listbox')}
          >
            {searching && (
              <li className={cx('optionHint')}>{labels.searching}</li>
            )}
            {!searching && found.length === 0 && (
              <li className={cx('optionHint')}>{labels.noResults}</li>
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
                className={cx('option')}
                data-active={i === active || undefined}
                data-selected={selected.includes(o.value) || undefined}
              >
                {o.label}
              </li>
            ))}
          </ul>
        )}
      </div>
      <FieldHelp id={id} text={helperText} />
      <FieldError id={id} error={error} />
    </FieldBox>
  );
};

export default Combobox;
