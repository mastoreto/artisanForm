import type { RefKind } from '../../schema/capabilities';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';

/**
 * What is selected in the builder. A field is addressed by its step and a
 * `path` of indexes: `[2]` is the third field of the step, `[2, 0]` the first
 * row field of the `array` that is that third field.
 */
export type Selection =
  | { kind: 'form' }
  | { kind: 'step'; stepId: string }
  | { kind: 'field'; stepId: string; path: readonly number[] };

/** Who an option is for: a person building a form, or a developer wiring code. */
export type Level = 'simple' | 'advanced' | 'developer';

export type Section =
  | 'general'
  | 'validation'
  | 'layout'
  | 'data'
  | 'flow'
  | 'advanced';

/** How the inspector edits a property. */
export type Control =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'options'
  | 'optionsMap'
  | 'condition'
  | 'transitions'
  | 'ref'
  | 'refs'
  | 'step'
  | 'actions'
  | 'json';

/** One editable property of a field or step; the inspector is generated from a list of these. */
export interface PropertyDescriptor {
  /** Dotted path inside the element: `label`, `validation.minLength`, `ui.span`. */
  path: string;
  label: string;
  control: Control;
  level: Level;
  section: Section;
  /** Choices of an `enum` control. */
  options?: readonly (string | number)[];
  /** Which registered ids a `ref` / `refs` control offers. */
  ref?: RefKind;
  min?: number;
  max?: number;
  help?: string;
}

export type PaletteCategory =
  | 'text'
  | 'number'
  | 'datetime'
  | 'choice'
  | 'boolean'
  | 'file'
  | 'structure'
  | 'content';

/** What default values may depend on: the ids the app registered (from the capabilities manifest). */
export interface DefaultsContext {
  refs?: Partial<Record<RefKind, readonly string[]>>;
}

/** A schema change and the selection that should follow it. */
export interface Change {
  schema: ArtisanSchemaV1;
  selection?: Selection;
  /** Set when the operation was refused or only partly applied. */
  error?: 'not-found' | 'not-allowed' | 'invalid-name' | 'duplicate-name';
  /** Condition paths and `sameAs` links that were dropped because their field no longer exists. */
  prunedReferences?: string[];
}
