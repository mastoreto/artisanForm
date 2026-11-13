import { useId, useState } from 'react';
import { answerKeys } from '../../schema/answers';
import type { ConditionV1 } from '../../schema/contract/types';
import { useBuilder } from '../context';
import { useBx } from '../cx';
import { getField } from '../model/operations';
import type { PropertyDescriptor } from '../model/types';
import {
  ActionsEditor,
  ConditionEditor,
  TransitionsEditor,
} from './LogicEditors';

/** Text keys that must keep an empty string instead of being removed. */
const KEEP_EMPTY = new Set(['name', 'title', 'id']);

interface Option {
  value: string;
  label: string;
}

const OptionsEditor = ({
  value,
  onChange,
}: {
  value: Option[];
  onChange: (next: Option[]) => void;
}) => {
  const { labels } = useBuilder();
  const bx = useBx();
  const [paste, setPaste] = useState('');
  const set = (i: number, patch: Partial<Option>) =>
    onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const apply = () => {
    const next = paste
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [first, ...rest] = line.split(',');
        const label = rest.length
          ? rest.join(',').trim()
          : (first ?? '').trim();
        return { value: (first ?? '').trim(), label };
      });
    if (next.length) onChange(next);
    setPaste('');
  };
  return (
    <div className={bx('options')}>
      {value.map((o, i) => (
        <div key={`${i}:${o.value}`} className={bx('optionRow')}>
          <input
            className={bx('input')}
            aria-label={`${labels.optionValue} ${i + 1}`}
            value={o.value}
            onChange={(e) => set(i, { value: e.target.value })}
          />
          <input
            className={bx('input')}
            aria-label={`${labels.optionLabel} ${i + 1}`}
            value={o.label}
            onChange={(e) => set(i, { label: e.target.value })}
          />
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={`${labels.removeOption} ${i + 1}`}
            disabled={value.length <= 1}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={bx('button')}
        onClick={() =>
          onChange([
            ...value,
            {
              value: `option${value.length + 1}`,
              label: `Option ${value.length + 1}`,
            },
          ])
        }
      >
        {labels.addOption}
      </button>
      <details className={bx('details')}>
        <summary>{labels.pasteOptions}</summary>
        <p className={bx('help')}>{labels.pasteOptionsHelp}</p>
        <textarea
          className={bx('input')}
          rows={4}
          aria-label={labels.pasteOptions}
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <button
          type="button"
          className={bx('button')}
          onClick={apply}
          disabled={!paste.trim()}
        >
          {labels.applyOptions}
        </button>
      </details>
    </div>
  );
};

/** Edits any JSON value as text; applies it when it parses. */
const JsonEditor = ({
  value,
  onChange,
  id,
}: {
  value: unknown;
  onChange: (next: unknown) => void;
  id: string;
}) => {
  const { labels } = useBuilder();
  const bx = useBx();
  const [text, setText] = useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2),
  );
  const [bad, setBad] = useState(false);
  return (
    <>
      <textarea
        id={id}
        className={bx('input', 'afb-mono')}
        rows={5}
        aria-invalid={bad}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === '') {
            setBad(false);
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(e.target.value));
            setBad(false);
          } catch {
            setBad(true);
          }
        }}
      />
      {bad && (
        <p className={bx('error')} role="alert">
          {labels.invalidJson}
        </p>
      )}
    </>
  );
};

/** One labelled control for a property descriptor. */
export const PropertyControl = ({
  descriptor: d,
  value,
  onChange,
  error,
}: {
  descriptor: PropertyDescriptor;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string;
}) => {
  const { manifest, schema, labels, selection } = useBuilder();
  const bx = useBx();
  const id = useId();
  const refs = d.ref ? (manifest?.refs[d.ref] ?? []) : [];
  const text = (v: string) =>
    onChange(v === '' && !KEEP_EMPTY.has(d.path) ? undefined : v);

  let control: React.ReactNode;
  switch (d.control) {
    case 'boolean':
      control = (
        <input
          id={id}
          type="checkbox"
          className={bx('checkbox')}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked ? true : undefined)}
        />
      );
      break;
    case 'number':
      control = (
        <input
          id={id}
          type="number"
          className={bx('input')}
          min={d.min}
          max={d.max}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) =>
            onChange(e.target.value === '' ? undefined : Number(e.target.value))
          }
        />
      );
      break;
    case 'enum':
      control = (
        <select
          id={id}
          className={bx('input')}
          value={value === undefined ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(
              raw === ''
                ? undefined
                : typeof d.options?.[0] === 'number'
                  ? Number(raw)
                  : raw,
            );
          }}
        >
          <option value="">{labels.noValue}</option>
          {d.options?.map((o) => (
            <option key={String(o)} value={String(o)}>
              {String(o)}
            </option>
          ))}
        </select>
      );
      break;
    case 'textarea':
      control = (
        <textarea
          id={id}
          className={bx('input')}
          rows={3}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => text(e.target.value)}
        />
      );
      break;
    case 'options':
      control = (
        <OptionsEditor
          value={Array.isArray(value) ? (value as Option[]) : []}
          onChange={onChange}
        />
      );
      break;
    case 'ref':
      control =
        refs.length > 0 ? (
          <select
            id={id}
            className={bx('input')}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => text(e.target.value)}
          >
            <option value="">{labels.noValue}</option>
            {refs.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            className={bx('input')}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => text(e.target.value)}
          />
        );
      break;
    case 'refs':
      control = (
        <input
          id={id}
          className={bx('input')}
          value={Array.isArray(value) ? value.join(', ') : ''}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      );
      break;
    case 'step':
      control = (
        <select
          id={id}
          className={bx('input')}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => text(e.target.value)}
        >
          <option value="">{labels.noValue}</option>
          {schema.steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      );
      break;
    case 'text':
      control = (
        <input
          id={id}
          className={bx('input')}
          value={typeof value === 'string' ? value : ''}
          aria-invalid={Boolean(error)}
          onChange={(e) => text(e.target.value)}
        />
      );
      break;
    case 'condition': {
      // A field may read answers up to its own step (not itself); a step's own visibility, only earlier steps.
      const stepIndex =
        selection.kind === 'form'
          ? 0
          : schema.steps.findIndex((s) => s.id === selection.stepId);
      const own =
        selection.kind === 'field'
          ? getField(schema, selection.stepId, selection.path)
          : undefined;
      control = (
        <ConditionEditor
          value={value as ConditionV1 | undefined}
          onChange={onChange}
          upToStep={selection.kind === 'step' ? stepIndex - 1 : stepIndex}
          exclude={own ? new Set([...answerKeys(own), own.name]) : undefined}
        />
      );
      break;
    }
    case 'transitions':
      control = (
        <TransitionsEditor
          value={value as { when?: ConditionV1; to: string }[] | undefined}
          onChange={onChange}
          stepIndex={
            selection.kind === 'step'
              ? schema.steps.findIndex((s) => s.id === selection.stepId)
              : 0
          }
        />
      );
      break;
    case 'actions':
      control = (
        <ActionsEditor
          value={
            value as
              | { label: string; href?: string; action?: string }[]
              | undefined
          }
          onChange={onChange}
        />
      );
      break;
    default:
      // optionsMap and json: edited as JSON
      control = <JsonEditor id={id} value={value} onChange={onChange} />;
  }
  return (
    <div className={bx('property', d.control === 'boolean' && 'afb-inline')}>
      <label
        htmlFor={
          ['options', 'condition', 'transitions', 'actions'].includes(d.control)
            ? undefined
            : id
        }
        className={bx('propertyLabel')}
      >
        {d.label}
      </label>
      {control}
      {d.help && <p className={bx('help')}>{d.help}</p>}
      {error && (
        <p className={bx('error')} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
