import type { ArtisanStepV1 } from './steps';
import type { FormUIConfig } from './types';

export interface ArtisanSchemaV1 {
  /** Format version. Unknown (e.g. future) versions are rejected by the parser. */
  schemaVersion: 1;
  /** Identifies the form (snapshots are tied to it). */
  id: string;
  /** Identifies a specific revision of the definition (snapshots record it). */
  revision?: number;
  title?: string;
  description?: string;
  ui?: FormUIConfig;
  steps: ArtisanStepV1[];
}

/**
 * Identity helper for the TypeScript mode: gives autocompletion and checks
 * the literal against the contract, and returns it untouched, so what you
 * write is exactly what can be serialized.
 */
export const defineForm = (schema: ArtisanSchemaV1): ArtisanSchemaV1 => schema;
