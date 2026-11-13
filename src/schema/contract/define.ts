import type { Catalog } from '../i18n';
import type { ArtisanStepV1 } from './steps';
import type { FormUIConfig } from './types';

/** Translations carried inside the schema (small forms); see `artisanform/schema` i18n helpers. */
export interface I18nBlockV1 {
  /** The language the schema's own texts are written in (default `en`). */
  sourceLocale?: string;
  /** Catalogs by locale: stable text path to translated text. */
  messages?: Record<string, Catalog>;
}

export interface ArtisanSchemaV1 {
  /** Optional pointer to the JSON Schema of the contract, for editor completion. Ignored by the engine. */
  $schema?: string;
  /** Format version. Unknown (e.g. future) versions are rejected by the parser. */
  schemaVersion: 1;
  /** Identifies the form (snapshots are tied to it). */
  id: string;
  /** Identifies a specific revision of the definition (snapshots record it). */
  revision?: number;
  title?: string;
  description?: string;
  ui?: FormUIConfig;
  i18n?: I18nBlockV1;
  steps: ArtisanStepV1[];
}

/**
 * Identity helper for the TypeScript mode: gives autocompletion and checks
 * the literal against the contract, and returns it untouched, so what you
 * write is exactly what can be serialized. The literal type is kept, so
 * `InferValues<typeof schema>` gives the submitted values.
 */
export const defineForm = <const S extends ArtisanSchemaV1>(schema: S): S =>
  schema;
