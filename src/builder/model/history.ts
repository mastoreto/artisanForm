import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { selectionExists } from './selection';
import type { Change, Selection } from './types';

interface Snapshot {
  schema: ArtisanSchemaV1;
  selection: Selection;
}

/** The state of a builder: the schema, what is selected, and the undo and redo stacks. */
export interface BuilderState extends Snapshot {
  past: Snapshot[];
  future: Snapshot[];
  /** Key and time of the last change, to merge a burst of edits into one undo step. */
  lastKey?: string;
  lastAt?: number;
}

export const HISTORY_LIMIT = 100;

export const createBuilderState = (
  schema: ArtisanSchemaV1,
  selection: Selection = { kind: 'form' },
): BuilderState => ({ schema, selection, past: [], future: [] });

export interface CommitOptions {
  /** Edits with the same key close together become one undo step (typing in one field). */
  key?: string;
  /** Time of the change in ms; pass it to keep the function pure. */
  at?: number;
  /** Merge window in ms (default 800). */
  mergeMs?: number;
  limit?: number;
}

/**
 * Applies a change. A refused change (`error` set and nothing different) is
 * ignored. A new change clears the redo stack.
 */
export const commit = (
  state: BuilderState,
  change: Change,
  options: CommitOptions = {},
): BuilderState => {
  if (change.error && change.schema === state.schema) return state;
  const selection = change.selection ?? state.selection;
  const merge =
    options.key !== undefined &&
    options.key === state.lastKey &&
    options.at !== undefined &&
    state.lastAt !== undefined &&
    options.at - state.lastAt <= (options.mergeMs ?? 800) &&
    state.past.length > 0;
  const past = merge
    ? state.past
    : [
        ...state.past,
        { schema: state.schema, selection: state.selection },
      ].slice(-(options.limit ?? HISTORY_LIMIT));
  return {
    schema: change.schema,
    selection,
    past,
    future: [],
    lastKey: options.key,
    lastAt: options.at,
  };
};

export const undo = (state: BuilderState): BuilderState => {
  const previous = state.past[state.past.length - 1];
  if (!previous) return state;
  return {
    ...previous,
    past: state.past.slice(0, -1),
    future: [
      { schema: state.schema, selection: state.selection },
      ...state.future,
    ],
  };
};

export const redo = (state: BuilderState): BuilderState => {
  const [next, ...rest] = state.future;
  if (!next) return state;
  return {
    ...next,
    past: [...state.past, { schema: state.schema, selection: state.selection }],
    future: rest,
  };
};

/** Changes only the selection (not an undo step). A selection that does not exist is ignored. */
export const select = (
  state: BuilderState,
  selection: Selection,
): BuilderState =>
  selectionExists(state.schema, selection) ? { ...state, selection } : state;

export const canUndo = (state: BuilderState) => state.past.length > 0;
export const canRedo = (state: BuilderState) => state.future.length > 0;
