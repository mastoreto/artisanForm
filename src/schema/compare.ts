import { answerFields } from './answers';
import type { ArtisanSchemaV1 } from './contract/define';
import type { ArtisanFieldV1 } from './contract/fields';
import type { OptionV1 } from './contract/types';

export interface SchemaComparison {
  /** Questions only the new revision asks. */
  added: string[];
  /** Questions only the previous revision asked. */
  removed: string[];
  /** Same name, different `type`: answers already given would change meaning. */
  typeChanged: { name: string; from: string; to: string }[];
  requiredChanged: { name: string; from: boolean; to: boolean }[];
  /** Option values the new revision no longer offers (old answers may not match). */
  optionsRemoved: { name: string; values: string[] }[];
  /**
   * True when answers given to the previous revision keep their meaning: no
   * question changed its `type`. Adding or removing questions, requiring one
   * or dropping an option is compatible (old answers are read with the
   * revision they were given with).
   */
  compatible: boolean;
}

/** Questions by name; the rows of an `array` are `team[].name`. */
const questions = (schema: ArtisanSchemaV1) => {
  const out = new Map<string, ArtisanFieldV1>();
  const add = (field: ArtisanFieldV1, prefix: string) => {
    out.set(`${prefix}${field.name}`, field);
    if (field.type === 'array')
      for (const item of field.itemFields)
        add(item, `${prefix}${field.name}[].`);
  };
  for (const field of answerFields(schema)) add(field, '');
  return out;
};

const isRequired = (field: ArtisanFieldV1) =>
  (field as { required?: boolean }).required === true;

const optionValues = (field: ArtisanFieldV1): string[] =>
  Array.isArray((field as { options?: unknown }).options)
    ? (field as { options: OptionV1[] }).options.map((o) => o.value)
    : [];

/** What changed between two revisions of the same form. Pure; sorted by name. */
export const compareSchemas = (
  previous: ArtisanSchemaV1,
  next: ArtisanSchemaV1,
): SchemaComparison => {
  const before = questions(previous);
  const after = questions(next);
  const result: SchemaComparison = {
    added: [],
    removed: [],
    typeChanged: [],
    requiredChanged: [],
    optionsRemoved: [],
    compatible: true,
  };
  for (const name of [...after.keys()].sort()) {
    const to = after.get(name) as ArtisanFieldV1;
    const from = before.get(name);
    if (!from) {
      result.added.push(name);
      continue;
    }
    if (from.type !== to.type)
      result.typeChanged.push({ name, from: from.type, to: to.type });
    if (isRequired(from) !== isRequired(to))
      result.requiredChanged.push({
        name,
        from: isRequired(from),
        to: isRequired(to),
      });
    const kept = new Set(optionValues(to));
    const dropped = optionValues(from).filter((v) => !kept.has(v));
    if (dropped.length) result.optionsRemoved.push({ name, values: dropped });
  }
  result.removed = [...before.keys()].filter((n) => !after.has(n)).sort();
  result.compatible = result.typeChanged.length === 0;
  return result;
};
