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
