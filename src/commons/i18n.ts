import { type Catalog, format, textOf } from '../schema';
import type { CatalogValue } from '../schema/i18n';
import type { ArtisanLabels } from './labels';

type FunctionKeys = {
  [K in keyof ArtisanLabels]: ArtisanLabels[K] extends (
    ...args: never[]
  ) => string
    ? K
    : never;
}[keyof ArtisanLabels];

/**
 * Names of the `{placeholders}` of each function label, in argument order:
 * `labels.step: "Paso {n} de {total}: {title}"`. The compiler requires an
 * entry for every function label, so a new one cannot be forgotten.
 */
export const LABEL_PARAMS: Record<FunctionKeys, readonly string[]> = {
  step: ['n', 'total', 'title'],
  stepItem: ['n'],
  removeItem: ['n'],
  itemTitle: ['n'],
  minItems: ['n'],
  maxItems: ['n'],
  payWith: ['name'],
  fileTooLarge: ['max'],
  tooManyFiles: ['max'],
  minFiles: ['min'],
  removeFile: ['name'],
  cancelUpload: ['name'],
  retryUpload: ['name'],
  minDate: ['date'],
  maxDate: ['date'],
  minLength: ['n'],
  maxLength: ['n'],
  minValue: ['n'],
  maxValue: ['n'],
  unknownFieldType: ['type'],
  unknownStepKind: ['kind'],
};

const pick = (value: CatalogValue, locale: string, args: unknown[]) => {
  if (typeof value === 'string') return value;
  // Plural forms follow the first numeric argument.
  const n = args.find((a): a is number => typeof a === 'number');
  if (n === undefined) return value.other;
  let category: string;
  try {
    category = new Intl.PluralRules(locale).select(n);
  } catch {
    category = 'other';
  }
  return (value as Record<string, string | undefined>)[category] ?? value.other;
};

/**
 * The library's own texts from `labels.<key>` catalog entries (most specific
 * catalog first). Keys no catalog has are absent, so they fall through to the
 * layers below; unknown keys are ignored.
 */
export const labelsFromCatalogs = (
  catalogs: readonly Catalog[],
  locale: string,
): Partial<ArtisanLabels> => {
  const out: Record<string, unknown> = {};
  const keys = new Set(
    catalogs.flatMap((c) =>
      Object.keys(c)
        .filter((k) => k.startsWith('labels.'))
        .map((k) => k.slice(7)),
    ),
  );
  for (const key of keys) {
    const value = catalogs
      .map((c) => c[`labels.${key}`])
      .find((v) => textOf(v) !== undefined);
    if (value === undefined) continue;
    const names = (LABEL_PARAMS as Record<string, readonly string[]>)[key];
    out[key] = names
      ? (...args: unknown[]) =>
          format(
            pick(value, locale, args),
            Object.fromEntries(names.map((n, i) => [n, String(args[i])])),
          )
      : textOf(value);
  }
  return out as Partial<ArtisanLabels>;
};
