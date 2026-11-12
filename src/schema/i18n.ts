import type { ArtisanSchemaV1 } from './contract/define';

/**
 * Translations for a v1 schema, kept OUT of the schema: the schema stays in
 * its source language (English) and a catalog maps stable text paths to the
 * translated text. Pure and dependency-free (no React), so a backend can
 * extract, check and serve catalogs.
 *
 * Paths are derived from ids, so renaming an id orphans its translations
 * (`validateCatalog` reports it):
 *
 *   title, description
 *   steps.<stepId>.title
 *   steps.<stepId>.controls.nextLabel | previousLabel
 *   steps.<stepId>.summary | message | errorMessage | content | accept.label
 *   steps.<stepId>.actions.<index>.label
 *   steps.<stepId>.fields.<name>.label | description | placeholder | prefix |
 *     suffix | endLabel | addLabel | text
 *   steps.<stepId>.fields.<name>.options.<value>
 *   steps.<stepId>.fields.<name>.dependentOptions.<parent>.<value>
 *   steps.<stepId>.fields.<name>.fields.<child>.…   (rows of an `array`)
 *
 * The keys `labels.<key>` are the library's own texts (see `labels.ts`).
 */

/** Plural forms of one text; `other` is required and is also the fallback. */
export type PluralForms = { other: string } & Partial<
  Record<'zero' | 'one' | 'two' | 'few' | 'many', string>
>;
export type CatalogValue = string | PluralForms;
export type Catalog = Record<string, CatalogValue>;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * `es-AR` → `['es-AR', 'es']`, `zh-Hant-TW` → `['zh-Hant-TW', 'zh-Hant', 'zh']`.
 * Case is normalized (language lower, script Title, region UPPER) and `_` is
 * accepted. Anything that is not a language tag gives `[]`.
 */
export const resolveLocaleChain = (locale: string): string[] => {
  const parts = String(locale).trim().split(/[-_]/);
  if (!/^[A-Za-z]{2,3}$/.test(parts[0] ?? '')) return [];
  if (parts.some((p) => !/^[A-Za-z0-9]{1,8}$/.test(p))) return [];
  const norm = parts.map((p, i) => {
    if (i === 0) return p.toLowerCase();
    if (p.length === 4 && /^[A-Za-z]+$/.test(p))
      return p[0].toUpperCase() + p.slice(1).toLowerCase();
    return p.length <= 3 ? p.toUpperCase() : p.toLowerCase();
  });
  return norm.map((_, i) => norm.slice(0, norm.length - i).join('-'));
};

// ---- Walking every translatable text of a schema ----

/** Called with the path, the source text, and a function that replaces it. */
type Visit = (path: string, text: string, set: (text: string) => void) => void;

/** Visits `o[key]` when it is a non-empty string; `path` is the full path of that text. */
const text = (o: Obj, key: string, path: string, visit: Visit) => {
  const v = o[key];
  if (typeof v === 'string' && v !== '')
    visit(path, v, (t) => {
      o[key] = t;
    });
};

const options = (list: unknown, path: string, visit: Visit) => {
  if (!Array.isArray(list)) return;
  for (const o of list)
    if (isObj(o) && typeof o.value === 'string')
      text(o, 'label', `${path}.${o.value}`, visit);
};

const field = (f: Obj, path: string, visit: Visit) => {
  for (const key of [
    'label',
    'description',
    'placeholder',
    'prefix',
    'suffix',
    'endLabel',
    'addLabel',
    'text',
  ])
    text(f, key, `${path}.${key}`, visit);
  options(f.options, `${path}.options`, visit);
  if (isObj(f.dependentOptions))
    for (const [parent, list] of Object.entries(f.dependentOptions))
      options(list, `${path}.dependentOptions.${parent}`, visit);
  if (Array.isArray(f.itemFields))
    for (const item of f.itemFields)
      if (isObj(item) && typeof item.name === 'string')
        field(item, `${path}.fields.${item.name}`, visit);
};

const walk = (schema: Obj, visit: Visit) => {
  text(schema, 'title', 'title', visit);
  text(schema, 'description', 'description', visit);
  if (!Array.isArray(schema.steps)) return;
  for (const step of schema.steps) {
    if (!isObj(step) || typeof step.id !== 'string') continue;
    const base = `steps.${step.id}`;
    for (const key of [
      'title',
      'summary',
      'message',
      'errorMessage',
      'content',
    ])
      text(step, key, `${base}.${key}`, visit);
    if (isObj(step.controls))
      for (const key of ['nextLabel', 'previousLabel'])
        text(step.controls, key, `${base}.controls.${key}`, visit);
    if (isObj(step.accept))
      text(step.accept, 'label', `${base}.accept.label`, visit);
    if (Array.isArray(step.actions))
      step.actions.forEach((a, i) => {
        if (isObj(a)) text(a, 'label', `${base}.actions.${i}.label`, visit);
      });
    if (Array.isArray(step.fields))
      for (const f of step.fields)
        if (isObj(f) && typeof f.name === 'string')
          field(f, `${base}.fields.${f.name}`, visit);
  }
};

/** The source (English) texts of a schema by path: the template to translate. */
export const extractMessages = (
  schema: ArtisanSchemaV1,
): Record<string, string> => {
  const out: Record<string, string> = {};
  // Walk a copy: `walk` may call `set`, and the input must never change.
  walk(structuredClone(schema) as unknown as Obj, (path, t) => {
    out[path] = t;
  });
  return out;
};

/** The text of a catalog entry (`other` for plural forms, which a schema text cannot select). */
export const textOf = (value: CatalogValue | undefined): string | undefined =>
  typeof value === 'string' ? value : value?.other;

/**
 * A copy of the schema with the catalogs applied, most specific first
 * (`[es-AR, es]`): each text takes the first catalog that has its path. A
 * path no catalog has keeps its source text, so a missing translation never
 * breaks a form. The input is not modified.
 */
export const applyCatalog = (
  schema: ArtisanSchemaV1,
  catalogs: readonly Catalog[],
): ArtisanSchemaV1 => {
  const copy = structuredClone(schema) as unknown as Obj;
  if (catalogs.length === 0) return copy as unknown as ArtisanSchemaV1;
  walk(copy, (path, _source, set) => {
    for (const catalog of catalogs) {
      const found = textOf(catalog[path]);
      if (found !== undefined && found !== '') return set(found);
    }
  });
  return copy as unknown as ArtisanSchemaV1;
};

// ---- Placeholders: `{name}` in a text, filled by `format` ----

export const placeholdersOf = (template: string): string[] =>
  [
    ...new Set([...template.matchAll(/\{([A-Za-z_]\w*)\}/g)].map((m) => m[1])),
  ].sort();

/** Replaces `{name}` with the param; an unknown name is left as written. */
export const format = (
  template: string,
  params: Record<string, string | number> = {},
): string =>
  template.replace(/\{([A-Za-z_]\w*)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );

export interface CatalogReport {
  /** Texts of the schema this catalog does not translate. */
  missing: string[];
  /** Entries of the catalog that no text of the schema has (an id was renamed or removed). */
  orphan: string[];
  /** Entries whose `{placeholders}` differ from the source text's. */
  badPlaceholders: string[];
}

/**
 * Compares a catalog with the schema it translates. `labels.*` entries are the
 * library's own texts: they are not orphans, and are checked against
 * `labelKeys` when given.
 */
export const validateCatalog = (
  schema: ArtisanSchemaV1,
  catalog: Catalog,
  options: { labelKeys?: readonly string[] } = {},
): CatalogReport => {
  const source = extractMessages(schema);
  const missing = Object.keys(source).filter(
    (p) => textOf(catalog[p]) === undefined,
  );
  const known = new Set(options.labelKeys?.map((k) => `labels.${k}`));
  const orphan = Object.keys(catalog).filter((p) =>
    p.startsWith('labels.')
      ? options.labelKeys !== undefined && !known.has(p)
      : !(p in source),
  );
  const badPlaceholders = Object.keys(catalog).filter((p) => {
    const t = textOf(catalog[p]);
    if (t === undefined || !(p in source)) return false;
    return placeholdersOf(t).join() !== placeholdersOf(source[p]).join();
  });
  return {
    missing: missing.sort(),
    orphan: orphan.sort(),
    badPlaceholders: badPlaceholders.sort(),
  };
};
