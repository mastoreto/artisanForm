import {
  type Catalog,
  extractMessages,
  resolveLocaleChain,
  validateCatalog,
} from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { cloneJSON } from '../../schema/contract/json';
import type { Change } from './types';

const messagesOf = (schema: ArtisanSchemaV1) => schema.i18n?.messages ?? {};

/** A copy with the `i18n` block tidied: empty catalogs are kept (a language being started), an empty block is dropped. */
const tidy = (next: ArtisanSchemaV1) => {
  const i18n = next.i18n;
  if (
    i18n &&
    !i18n.sourceLocale &&
    Object.keys(i18n.messages ?? {}).length === 0
  )
    delete next.i18n;
  return next;
};

/** Starts a language: an empty catalog under its tag (`es`, `es-AR`). */
export const addLocale = (schema: ArtisanSchemaV1, locale: string): Change => {
  const tag = locale.trim();
  if (resolveLocaleChain(tag).length === 0)
    return { schema, error: 'invalid-name' };
  if (messagesOf(schema)[tag]) return { schema, error: 'duplicate-name' };
  const next = cloneJSON(schema);
  next.i18n = { ...next.i18n, messages: { ...messagesOf(next), [tag]: {} } };
  return { schema: next };
};

export const removeLocale = (
  schema: ArtisanSchemaV1,
  locale: string,
): Change => {
  if (!messagesOf(schema)[locale]) return { schema, error: 'not-found' };
  const next = cloneJSON(schema);
  const { [locale]: _gone, ...rest } = messagesOf(next);
  next.i18n = { ...next.i18n, messages: rest };
  return { schema: tidy(next) };
};

/** Sets the translation of a text path; an empty text removes it (it falls back to the source). */
export const setMessage = (
  schema: ArtisanSchemaV1,
  locale: string,
  key: string,
  text: string,
): Change => {
  if (!messagesOf(schema)[locale]) return { schema, error: 'not-found' };
  const next = cloneJSON(schema);
  const catalog: Catalog = { ...messagesOf(next)[locale] };
  if (text === '') delete catalog[key];
  else catalog[key] = text;
  next.i18n = {
    ...next.i18n,
    messages: { ...messagesOf(next), [locale]: catalog },
  };
  return { schema: next };
};

export const setSourceLocale = (
  schema: ArtisanSchemaV1,
  locale: string | undefined,
): Change => {
  const next = cloneJSON(schema);
  if (locale) next.i18n = { ...next.i18n, sourceLocale: locale };
  else if (next.i18n) delete next.i18n.sourceLocale;
  return { schema: tidy(next) };
};

export interface TranslationRow {
  key: string;
  /** The text in the schema's own language. */
  source: string;
  /** The translation as typed (empty when missing); plural forms are shown as JSON and not editable here. */
  text: string;
  plural: boolean;
  state: 'ok' | 'missing' | 'bad-placeholders';
}

/** Every translatable text of the schema with its state in one language. */
export const translationRows = (
  schema: ArtisanSchemaV1,
  locale: string,
): { rows: TranslationRow[]; orphans: string[] } => {
  const catalog = messagesOf(schema)[locale] ?? {};
  const report = validateCatalog(schema, catalog);
  const bad = new Set<string>(report.badPlaceholders);
  const rows = Object.entries(extractMessages(schema)).map(
    ([key, source]): TranslationRow => {
      const value = catalog[key];
      const plural = value !== undefined && typeof value !== 'string';
      return {
        key,
        source,
        text:
          value === undefined
            ? ''
            : typeof value === 'string'
              ? value
              : JSON.stringify(value),
        plural,
        state: bad.has(key)
          ? 'bad-placeholders'
          : value === undefined
            ? 'missing'
            : 'ok',
      };
    },
  );
  return { rows, orphans: report.orphan };
};
