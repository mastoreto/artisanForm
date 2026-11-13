import { useState } from 'react';
import { schemaHash } from '../../schema';
import { useBuilder } from '../context';
import { useBx } from '../cx';
import type { BuilderResult } from '../useFormBuilder';

export interface SavePayload extends BuilderResult {
  /** SHA-256 of the schema's canonical JSON: an ETag, or the identity of a revision. */
  hash: string;
}

/** Undo and redo, the mode, a validity badge, JSON export and save. */
export const Toolbar = ({
  onSave,
  onModeChange,
}: {
  onSave?: (payload: SavePayload) => void;
  onModeChange?: (mode: 'simple' | 'advanced') => void;
}) => {
  const {
    labels,
    actions,
    canUndo,
    canRedo,
    result,
    schema,
    mode,
    features,
    readOnly,
  } = useBuilder();
  const bx = useBx();
  const [copied, setCopied] = useState(false);
  const errors = result.issues.filter((i) => i.severity === 'error').length;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className={bx('toolbar')} role="toolbar" aria-label="Builder">
      <button
        type="button"
        className={bx('button')}
        onClick={actions.undo}
        disabled={!canUndo || readOnly}
      >
        {labels.undo}
      </button>
      <button
        type="button"
        className={bx('button')}
        onClick={actions.redo}
        disabled={!canRedo || readOnly}
      >
        {labels.redo}
      </button>
      {onModeChange && (
        <fieldset className={bx('segmented')} aria-label="Mode">
          {(['simple', 'advanced'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={bx('segment', mode === m && 'afb-selected')}
              aria-pressed={mode === m}
              onClick={() => onModeChange(m)}
            >
              {m === 'simple' ? labels.modeSimple : labels.modeAdvanced}
            </button>
          ))}
        </fieldset>
      )}
      <span
        className={bx('badge', errors ? 'afb-bad' : 'afb-good')}
        role="status"
      >
        {errors ? labels.problems(errors) : labels.valid}
      </span>
      <span className={bx('spacer')} />
      {features.json && (
        <button type="button" className={bx('button')} onClick={copy}>
          {copied ? labels.copied : labels.exportJson}
        </button>
      )}
      {onSave && (
        <button
          type="button"
          className={bx('button', 'afb-primary')}
          disabled={!result.ok}
          onClick={async () =>
            onSave({ ...result, hash: await schemaHash(schema) })
          }
        >
          {labels.save}
        </button>
      )}
    </div>
  );
};
