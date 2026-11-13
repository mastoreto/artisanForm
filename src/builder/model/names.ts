import { answerKeys } from '../../schema/answers';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { ArtisanFieldV1 } from '../../schema/contract/fields';

/**
 * Every name the parser claims in a schema, implicit ones included: a field's
 * own name (content fields too), the second key of a date range and of a
 * dynamic select, the rows of an array, a payment's result name (`payment` by
 * default) and the accept name of a terms step (`termsAccepted` by default).
 * They all share one namespace, so a generated name must avoid all of them.
 */
export const claimedNames = (schema: ArtisanSchemaV1): Set<string> => {
  const out = new Set<string>();
  const field = (f: ArtisanFieldV1) => {
    out.add(f.name);
    for (const key of answerKeys(f)) out.add(key);
    if (f.type === 'array') f.itemFields.forEach(field);
  };
  for (const step of schema.steps) {
    if (step.type === 'form') step.fields.forEach(field);
    else if (step.type === 'payment') out.add(step.resultName ?? 'payment');
    else if (step.type === 'wait' && step.resultName) out.add(step.resultName);
    else if (step.type === 'terms')
      out.add(step.accept?.name ?? 'termsAccepted');
  }
  return out;
};

/** The keys a field of this `type` named `name` would write. */
const writes = (type: string, name: string): string[] =>
  type === 'daterange'
    ? [name, `${name}End`]
    : type === 'dynamicSelect'
      ? [name, `${name}Dependent`]
      : [name];

/** A safe identifier from free text: letters, digits and `_`, not starting with a digit. */
export const toName = (text: string): string => {
  const words = text
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .split(/[\s_-]+/)
    .filter(Boolean);
  const joined = words
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w[0]?.toUpperCase() + w.slice(1),
    )
    .join('');
  return /^\d/.test(joined) ? `field${joined}` : joined;
};

/**
 * The first free name from `base` (`base`, `base2`…), recording it (and the
 * second key of a date range or a dynamic select) in `taken`, so several
 * names can be chosen in a row.
 */
export const pickName = (
  taken: Set<string>,
  base: string,
  type = 'text',
): string => {
  const root = toName(base) || 'field';
  const free = (name: string) => writes(type, name).every((k) => !taken.has(k));
  let name = root;
  for (let i = 2; !free(name); i++) name = `${root}${i}`;
  for (const k of writes(type, name)) taken.add(k);
  return name;
};

/**
 * A name nobody claims yet: `base`, else `base2`, `base3`… For a date range or
 * a dynamic select the second key it writes must be free too. `ignore` lists
 * names that may be reused (the ones of the field being renamed).
 */
export const uniqueName = (
  schema: ArtisanSchemaV1,
  base: string,
  type = 'text',
  ignore: ReadonlySet<string> = new Set(),
): string => {
  const claimed = claimedNames(schema);
  const free = (name: string) =>
    writes(type, name).every((k) => !claimed.has(k) || ignore.has(k));
  const root = toName(base) || 'field';
  if (free(root)) return root;
  for (let i = 2; ; i++) if (free(`${root}${i}`)) return `${root}${i}`;
};

/** A step id nobody uses yet. */
export const uniqueStepId = (schema: ArtisanSchemaV1, base: string): string => {
  const used = new Set(schema.steps.map((s) => s.id));
  const root = toName(base) || 'step';
  if (!used.has(root)) return root;
  for (let i = 2; ; i++) if (!used.has(`${root}${i}`)) return `${root}${i}`;
};
