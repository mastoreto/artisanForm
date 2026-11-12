import type { ReactNode } from 'react';
import type { StepContext } from '../components/steps/registry';
import type { WaitStrategy } from '../integrations/wait';
import type { FieldOption } from '../schema/legacy/types';

/**
 * Local, executable pieces a serializable schema refers to by id. A schema
 * that comes from JSON can only name these; it can never carry code. When a
 * remote schema is parsed with a `SchemaPolicy`, only the ids the host allows
 * may be used.
 */
export interface ArtisanExtensions {
  /** `combobox`/`multiselect` `optionsSource`: typed text → options. */
  options?: Record<string, (query: string) => Promise<FieldOption[]>>;
  /** `dynamicSelect` `dependentOptionsSource`: parent value → options. */
  dependentOptions?: Record<string, (parent: string) => Promise<FieldOption[]>>;
  /** `wait` step `strategy`. */
  waits?: Record<string, WaitStrategy>;
  /**
   * Step `hooks`. `beforeNext` hooks return `undefined` or `{ error }`
   * (sync or async); `onEnter` hooks ignore the result.
   */
  hooks?: Record<string, (values: Record<string, unknown>) => unknown>;
  /** `custom` step `renderer`. */
  renderers?: Record<string, (ctx: StepContext) => ReactNode>;
  /** `result` step action ids. */
  actions?: Record<string, () => void>;
}

/** A name the schema uses that no registry of the app provides. */
export interface UnresolvedReference {
  /** Which extension group should have had it (`hooks`, `waits`, `options`…). */
  group: keyof ArtisanExtensions;
  id: string;
  /** Where in the schema, in the parser's path format (`steps[0].hooks.beforeNext`). */
  path: string;
}

/**
 * Called for each reference the app cannot resolve. Return `'ignore'` to
 * render without it (the hook does not run, the options stay empty…); return
 * anything else and the form fails with `unresolved-reference`, as without it.
 * Only ignore what is optional: a missing wait strategy or renderer leaves its
 * step with nothing to do. Memoize it like `extensions`.
 */
export type OnUnresolved = (
  ref: UnresolvedReference,
  // biome-ignore lint/suspicious/noConfusingVoidType: a callback that returns nothing must be accepted
) => 'ignore' | undefined | void;
