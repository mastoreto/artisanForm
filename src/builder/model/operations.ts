import { answerKeys } from '../../schema/answers';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type {
  ArtisanFieldV1,
  NativeFieldType,
} from '../../schema/contract/fields';
import { cloneJSON } from '../../schema/contract/json';
import type { NativeStepType } from '../../schema/contract/steps';
import { isSafeFieldName } from '../../schema/contract/url';
import {
  FIELD_CATALOG,
  type FieldEntry,
  isContentType,
  STEP_CATALOG,
  type StepEntry,
} from './catalog';
import { claimedNames, pickName, uniqueStepId } from './names';
import type { Change, DefaultsContext, Selection } from './types';

/**
 * Pure, immutable operations over a v1 schema. Each one returns a new schema
 * (the input is never touched) and the selection that should follow. They keep
 * the schema valid by construction: names and ids stay unique (implicit names
 * included), references to something removed are pruned, and a refused
 * operation returns the schema unchanged with an `error`.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const clone = <T>(v: T): T => cloneJSON(v);
const asObj = (v: unknown) => v as Obj;

const stepOf = (schema: ArtisanSchemaV1, stepId: string) =>
  schema.steps.find((s) => s.id === stepId) as Obj | undefined;

/** The list of fields that holds the child at the end of `parent` (the step's own, or an array's rows). */
const listAt = (
  schema: ArtisanSchemaV1,
  stepId: string,
  parent: readonly number[],
): Obj[] | undefined => {
  const step = stepOf(schema, stepId);
  if (step?.type !== 'form') return undefined;
  let list = step.fields as Obj[];
  for (const i of parent) {
    const f = list[i];
    if (f?.type !== 'array') return undefined;
    list = f.itemFields as Obj[];
  }
  return list;
};

/** The field a selection points at, if any. */
export const getField = (
  schema: ArtisanSchemaV1,
  stepId: string,
  path: readonly number[],
): ArtisanFieldV1 | undefined => {
  const list = listAt(schema, stepId, path.slice(0, -1));
  const last = path[path.length - 1];
  return (last === undefined ? undefined : list?.[last]) as
    | ArtisanFieldV1
    | undefined;
};

/** The names of a field and everything inside it. */
const namesOf = (field: ArtisanFieldV1): string[] => [
  ...answerKeys(field),
  field.name,
  ...(field.type === 'array' ? field.itemFields.flatMap(namesOf) : []),
];

// ---- References between elements: conditions and `sameAs` ----

type Cond = Obj;

const mapCondition = (
  cond: unknown,
  leaf: (field: string) => string | undefined,
): Cond | undefined => {
  if (!isObj(cond)) return undefined;
  if (Array.isArray(cond.all) || Array.isArray(cond.any)) {
    const key = Array.isArray(cond.all) ? 'all' : 'any';
    const kids = (cond[key] as unknown[])
      .map((c) => mapCondition(c, leaf))
      .filter((c): c is Cond => c !== undefined);
    return kids.length ? { ...cond, [key]: kids } : undefined;
  }
  if ('not' in cond) {
    const inner = mapCondition(cond.not, leaf);
    return inner ? { ...cond, not: inner } : undefined;
  }
  const next = leaf(String(cond.field));
  return next === undefined ? undefined : { ...cond, field: next };
};

/** Every element that can hold a condition or a `sameAs`, with its path. */
const eachElement = (
  schema: ArtisanSchemaV1,
  fn: (el: Obj, path: string, kind: 'step' | 'field') => void,
) => {
  const fields = (list: Obj[], base: string) =>
    list.forEach((f, i) => {
      fn(f, `${base}[${i}]`, 'field');
      if (f.type === 'array')
        fields(f.itemFields as Obj[], `${base}[${i}].itemFields`);
    });
  schema.steps.forEach((s, i) => {
    const step = asObj(s);
    fn(step, `steps[${i}]`, 'step');
    if (step.type === 'form')
      fields(step.fields as Obj[], `steps[${i}].fields`);
  });
};

/** Paths of every condition and `sameAs` that reads one of these names. */
export const referencesTo = (
  schema: ArtisanSchemaV1,
  names: ReadonlySet<string>,
): string[] => {
  const out: string[] = [];
  const reads = (c: unknown): boolean => {
    let hit = false;
    mapCondition(c, (f) => {
      if (names.has(f)) hit = true;
      return f;
    });
    return hit;
  };
  eachElement(schema, (el, path) => {
    if (el.visibleWhen && reads(el.visibleWhen))
      out.push(`${path}.visibleWhen`);
    if (Array.isArray(el.next))
      (el.next as Obj[]).forEach((e, i) => {
        if (e.when && reads(e.when)) out.push(`${path}.next[${i}].when`);
      });
    const v = el.validation;
    if (isObj(v) && typeof v.sameAs === 'string' && names.has(v.sameAs))
      out.push(`${path}.validation.sameAs`);
  });
  return out;
};

/** Rewrites every reference from an old name to a new one. */
const renameReferences = (
  schema: ArtisanSchemaV1,
  map: ReadonlyMap<string, string>,
) => {
  const leaf = (f: string) => map.get(f) ?? f;
  eachElement(schema, (el) => {
    if (el.visibleWhen) el.visibleWhen = mapCondition(el.visibleWhen, leaf);
    if (Array.isArray(el.next))
      for (const e of el.next as Obj[])
        if (e.when) e.when = mapCondition(e.when, leaf);
    const v = el.validation;
    if (isObj(v) && typeof v.sameAs === 'string' && map.has(v.sameAs))
      v.sameAs = map.get(v.sameAs);
  });
};

/**
 * Drops what reads a name that no longer exists: a `visibleWhen` loses that
 * leaf (all of it when nothing is left), a transition that depended on it is
 * removed (never turned into an unconditional one) and a `sameAs` is cleared.
 * Returns the paths it changed.
 */
const pruneReferences = (
  schema: ArtisanSchemaV1,
  gone: ReadonlySet<string>,
): string[] => {
  const pruned: string[] = [];
  const leaf = (f: string) => (gone.has(f) ? undefined : f);
  eachElement(schema, (el, path) => {
    if (el.visibleWhen) {
      const next = mapCondition(el.visibleWhen, leaf);
      if (JSON.stringify(next) !== JSON.stringify(el.visibleWhen)) {
        pruned.push(`${path}.visibleWhen`);
        if (next) el.visibleWhen = next;
        else delete el.visibleWhen;
      }
    }
    if (Array.isArray(el.next)) {
      const kept: Obj[] = [];
      for (const [i, e] of (el.next as Obj[]).entries()) {
        if (!e.when) {
          kept.push(e);
          continue;
        }
        const next = mapCondition(e.when, leaf);
        if (!next) {
          pruned.push(`${path}.next[${i}].when`);
          continue;
        }
        if (JSON.stringify(next) !== JSON.stringify(e.when))
          pruned.push(`${path}.next[${i}].when`);
        kept.push({ ...e, when: next });
      }
      if (kept.length) el.next = kept;
      else delete el.next;
    }
    const v = el.validation;
    if (isObj(v) && typeof v.sameAs === 'string' && gone.has(v.sameAs)) {
      delete v.sameAs;
      pruned.push(`${path}.validation.sameAs`);
      if (Object.keys(v).length === 0) delete el.validation;
    }
  });
  return pruned;
};

// ---- Steps ----

export const addStep = (
  schema: ArtisanSchemaV1,
  type: NativeStepType,
  options: { index?: number; title?: string; ctx?: DefaultsContext } = {},
): Change => {
  const next = clone(schema);
  const entry: StepEntry = STEP_CATALOG[type];
  const id = uniqueStepId(next, type);
  const step: Obj = {
    type,
    id,
    title: options.title ?? entry.label,
    ...clone(entry.defaults(options.ctx ?? {})),
  };
  // A second payment or terms step would claim the same implicit name.
  const taken = claimedNames(next);
  if (type === 'payment' && taken.has('payment'))
    step.resultName = pickName(taken, 'payment');
  if (type === 'terms' && taken.has('termsAccepted'))
    step.accept = {
      ...asObj(step.accept),
      name: pickName(taken, 'termsAccepted'),
    };
  const at = Math.max(
    0,
    Math.min(options.index ?? next.steps.length, next.steps.length),
  );
  next.steps.splice(at, 0, step as never);
  return { schema: next, selection: { kind: 'step', stepId: id } };
};

export const removeStep = (schema: ArtisanSchemaV1, stepId: string): Change => {
  const index = schema.steps.findIndex((s) => s.id === stepId);
  if (index < 0) return { schema, error: 'not-found' };
  // A schema needs at least one step.
  if (schema.steps.length === 1) return { schema, error: 'not-allowed' };
  const next = clone(schema);
  const [removed] = next.steps.splice(index, 1);
  const gone = new Set<string>();
  if (removed?.type === 'form')
    for (const f of removed.fields) for (const n of namesOf(f)) gone.add(n);
  // Nothing may still point at the step that went away.
  for (const raw of next.steps) {
    const step = asObj(raw);
    if (Array.isArray(step.next)) {
      const kept = (step.next as Obj[]).filter((e) => e.to !== stepId);
      if (kept.length) step.next = kept;
      else delete step.next;
    }
    if (step.failTo === stepId) delete step.failTo;
  }
  const prunedReferences = pruneReferences(next, gone);
  const near = next.steps[Math.min(index, next.steps.length - 1)];
  return {
    schema: next,
    selection: near ? { kind: 'step', stepId: near.id } : { kind: 'form' },
    prunedReferences,
  };
};

export const moveStep = (
  schema: ArtisanSchemaV1,
  stepId: string,
  toIndex: number,
): Change => {
  const from = schema.steps.findIndex((s) => s.id === stepId);
  if (from < 0) return { schema, error: 'not-found' };
  const next = clone(schema);
  const [step] = next.steps.splice(from, 1);
  next.steps.splice(
    Math.max(0, Math.min(toIndex, next.steps.length)),
    0,
    step as never,
  );
  return { schema: next, selection: { kind: 'step', stepId } };
};

export const duplicateStep = (
  schema: ArtisanSchemaV1,
  stepId: string,
): Change => {
  const index = schema.steps.findIndex((s) => s.id === stepId);
  if (index < 0) return { schema, error: 'not-found' };
  const next = clone(schema);
  const copy = clone(asObj(next.steps[index]));
  const id = uniqueStepId(next, `${stepId}Copy`);
  copy.id = id;
  copy.title = `${String(copy.title)} (copy)`;
  const taken = claimedNames(next);
  const renamed = new Map<string, string>();
  const renameFields = (list: Obj[]) => {
    for (const f of list) {
      const field = f as unknown as ArtisanFieldV1;
      const before = answerKeys(field);
      const name = pickName(taken, String(f.name), String(f.type));
      f.name = name;
      before.forEach((old, i) => {
        const now = answerKeys(f as unknown as ArtisanFieldV1)[i];
        if (now) renamed.set(old, now);
      });
      if (f.type === 'array') renameFields(f.itemFields as Obj[]);
    }
  };
  if (copy.type === 'form') renameFields(copy.fields as Obj[]);
  if (copy.type === 'payment') copy.resultName = pickName(taken, 'payment');
  if (copy.type === 'terms')
    copy.accept = {
      ...asObj(copy.accept),
      name: pickName(taken, 'termsAccepted'),
    };
  // The copy's own conditions follow its renamed fields.
  const inner = { ...next, steps: [copy] } as unknown as ArtisanSchemaV1;
  renameReferences(inner, renamed);
  next.steps.splice(index + 1, 0, copy as never);
  return { schema: next, selection: { kind: 'step', stepId: id } };
};

/** Gives a step another id, keeping transitions and translations pointing at it. */
export const renameStep = (
  schema: ArtisanSchemaV1,
  stepId: string,
  newId: string,
): Change => {
  if (!stepOf(schema, stepId)) return { schema, error: 'not-found' };
  if (newId === stepId) return { schema, selection: { kind: 'step', stepId } };
  if (!isSafeFieldName(newId) || newId.trim() === '')
    return { schema, error: 'invalid-name' };
  if (schema.steps.some((s) => s.id === newId))
    return { schema, error: 'duplicate-name' };
  const next = clone(schema);
  for (const raw of next.steps) {
    const step = asObj(raw);
    if (step.id === stepId) step.id = newId;
    if (Array.isArray(step.next))
      for (const e of step.next as Obj[]) if (e.to === stepId) e.to = newId;
    if (step.failTo === stepId) step.failTo = newId;
  }
  renameCatalogKeys(next, `steps.${stepId}.`, `steps.${newId}.`);
  return { schema: next, selection: { kind: 'step', stepId: newId } };
};

// ---- Fields ----

const newField = (
  type: NativeFieldType,
  taken: Set<string>,
  ctx: DefaultsContext,
): Obj => {
  const entry: FieldEntry = FIELD_CATALOG[type];
  const name = pickName(taken, entry.baseName, type);
  const field: Obj = { type, name };
  if (isContentType(type)) {
    // content fields have no label: their words are `text`
  } else field.label = entry.label;
  Object.assign(field, clone(entry.defaults(ctx)));
  if (type === 'array')
    for (const row of field.itemFields as Obj[])
      row.name = pickName(taken, String(row.name), String(row.type));
  return field;
};

export const addField = (
  schema: ArtisanSchemaV1,
  stepId: string,
  type: NativeFieldType,
  options: { index?: number; parent?: number[]; ctx?: DefaultsContext } = {},
): Change => {
  const parent = options.parent ?? [];
  const next = clone(schema);
  const list = listAt(next, stepId, parent);
  if (!list) return { schema, error: 'not-found' };
  // Rows of an array are flat: no arrays and no content inside.
  if (parent.length > 0 && !FIELD_CATALOG[type].inArray)
    return { schema, error: 'not-allowed' };
  const field = newField(type, claimedNames(next), options.ctx ?? {});
  const at = Math.max(0, Math.min(options.index ?? list.length, list.length));
  list.splice(at, 0, field);
  return {
    schema: next,
    selection: { kind: 'field', stepId, path: [...parent, at] },
  };
};

export const removeField = (
  schema: ArtisanSchemaV1,
  stepId: string,
  path: readonly number[],
): Change => {
  const next = clone(schema);
  const parent = path.slice(0, -1);
  const list = listAt(next, stepId, parent);
  const index = path[path.length - 1];
  if (!list || index === undefined || !list[index])
    return { schema, error: 'not-found' };
  // A repeating group needs at least one field: delete the group instead.
  if (parent.length > 0 && list.length === 1)
    return { schema, error: 'not-allowed' };
  const [removed] = list.splice(index, 1);
  const gone = new Set(namesOf(removed as unknown as ArtisanFieldV1));
  const prunedReferences = pruneReferences(next, gone);
  const sibling = Math.min(index, list.length - 1);
  return {
    schema: next,
    selection:
      sibling >= 0
        ? { kind: 'field', stepId, path: [...parent, sibling] }
        : parent.length
          ? { kind: 'field', stepId, path: parent }
          : { kind: 'step', stepId },
    prunedReferences,
  };
};

export const moveField = (
  schema: ArtisanSchemaV1,
  from: { stepId: string; path: readonly number[] },
  to: { stepId: string; index: number; parent?: number[] },
): Change => {
  const next = clone(schema);
  const sourceList = listAt(next, from.stepId, from.path.slice(0, -1));
  const sourceIndex = from.path[from.path.length - 1];
  const targetParent = to.parent ?? [];
  // The target list is resolved before removing, so indexes cannot shift under it.
  const targetList = listAt(next, to.stepId, targetParent);
  if (
    !sourceList ||
    sourceIndex === undefined ||
    !sourceList[sourceIndex] ||
    !targetList
  )
    return { schema, error: 'not-found' };
  const field = sourceList[sourceIndex] as Obj;
  const type = field.type as NativeFieldType;
  if (targetParent.length > 0 && !FIELD_CATALOG[type]?.inArray)
    return { schema, error: 'not-allowed' };
  // Taking the last field out of a repeating group would leave it empty.
  if (
    from.path.length > 1 &&
    sourceList.length === 1 &&
    sourceList !== targetList
  )
    return { schema, error: 'not-allowed' };
  sourceList.splice(sourceIndex, 1);
  const at = Math.max(0, Math.min(to.index, targetList.length));
  targetList.splice(at, 0, field);
  // Moving into or out of a row changes nothing about names, which are global.
  return {
    schema: next,
    selection: {
      kind: 'field',
      stepId: to.stepId,
      path: [...targetParent, at],
    },
  };
};

export const duplicateField = (
  schema: ArtisanSchemaV1,
  stepId: string,
  path: readonly number[],
): Change => {
  const next = clone(schema);
  const parent = path.slice(0, -1);
  const list = listAt(next, stepId, parent);
  const index = path[path.length - 1];
  if (!list || index === undefined || !list[index])
    return { schema, error: 'not-found' };
  const copy = clone(list[index]) as Obj;
  const taken = claimedNames(next);
  const rename = (f: Obj) => {
    f.name = pickName(taken, String(f.name), String(f.type));
    if (f.type === 'array')
      for (const row of f.itemFields as Obj[]) rename(row);
  };
  rename(copy);
  // A copy does not inherit a link to the original's own answers.
  const v = copy.validation;
  if (isObj(v)) delete v.sameAs;
  list.splice(index + 1, 0, copy);
  return {
    schema: next,
    selection: { kind: 'field', stepId, path: [...parent, index + 1] },
  };
};

/** The chain of field names from the step down to the field, as the translation paths build it. */
const namePath = (
  schema: ArtisanSchemaV1,
  stepId: string,
  path: readonly number[],
) => {
  const names: string[] = [];
  let list = (stepOf(schema, stepId)?.fields ?? []) as Obj[];
  for (const i of path) {
    const f = list[i];
    if (!f) break;
    names.push(String(f.name));
    list = (f.itemFields ?? []) as Obj[];
  }
  return names;
};

/** Renames the keys of every translation catalog that start with `from`. */
const renameCatalogKeys = (
  schema: ArtisanSchemaV1,
  from: string,
  to: string,
) => {
  const messages = schema.i18n?.messages;
  if (!messages) return;
  for (const catalog of Object.values(messages))
    for (const key of Object.keys(catalog))
      if (key.startsWith(from)) {
        catalog[`${to}${key.slice(from.length)}`] = catalog[key] as never;
        delete catalog[key];
      }
};

/**
 * Renames a field. Conditions, `sameAs` and translations that pointed at it
 * follow, and the implicit second key of a date range or dynamic select moves
 * with it. Refused if the name is unsafe or already claimed.
 */
export const renameField = (
  schema: ArtisanSchemaV1,
  stepId: string,
  path: readonly number[],
  newName: string,
): Change => {
  const field = getField(schema, stepId, path);
  const selection: Selection = { kind: 'field', stepId, path: [...path] };
  if (!field) return { schema, error: 'not-found' };
  if (newName === field.name) return { schema, selection };
  if (newName.trim() === '' || !isSafeFieldName(newName))
    return { schema, error: 'invalid-name' };
  const own = new Set(answerKeys(field).concat(field.name));
  const claimed = claimedNames(schema);
  const probe = { ...field, name: newName } as ArtisanFieldV1;
  if (
    answerKeys(probe)
      .concat(newName)
      .some((k) => claimed.has(k) && !own.has(k))
  )
    return { schema, error: 'duplicate-name', selection };
  const next = clone(schema);
  const target = getField(next, stepId, path) as unknown as Obj;
  const before = answerKeys(field);
  const names = namePath(next, stepId, path);
  target.name = newName;
  const after = answerKeys(target as unknown as ArtisanFieldV1);
  const map = new Map<string, string>();
  before.forEach((old, i) => {
    if (after[i] !== undefined && after[i] !== old) map.set(old, after[i]);
  });
  renameReferences(next, map);
  const prefix = `steps.${stepId}.fields.${names.join('.fields.')}.`;
  const renamedChain = [...names.slice(0, -1), newName];
  renameCatalogKeys(
    next,
    prefix,
    `steps.${stepId}.fields.${renamedChain.join('.fields.')}.`,
  );
  return { schema: next, selection };
};

// ---- Generic properties ----

const targetOf = (schema: ArtisanSchemaV1, sel: Selection): Obj | undefined => {
  if (sel.kind === 'form') return schema as unknown as Obj;
  if (sel.kind === 'step') return stepOf(schema, sel.stepId);
  return getField(schema, sel.stepId, sel.path) as unknown as Obj | undefined;
};

/** Reads a dotted path (`validation.min`) of the selected element. */
export const getProperty = (
  schema: ArtisanSchemaV1,
  sel: Selection,
  path: string,
): unknown => {
  let cur: unknown = targetOf(schema, sel);
  for (const key of path.split('.')) {
    if (!isObj(cur)) return undefined;
    cur = cur[key];
  }
  return cur;
};

/**
 * Sets (or, with `undefined`, removes) a dotted path of the selected element.
 * Emptied parents (`validation: {}`) are removed so the schema stays clean.
 * `name` and a step's `id` go through their rename operations so references
 * follow.
 */
export const setProperty = (
  schema: ArtisanSchemaV1,
  sel: Selection,
  path: string,
  value: unknown,
): Change => {
  if (path === 'name' && sel.kind === 'field' && typeof value === 'string')
    return renameField(schema, sel.stepId, sel.path, value);
  if (path === 'id' && sel.kind === 'step' && typeof value === 'string')
    return renameStep(schema, sel.stepId, value);
  const next = clone(schema);
  const target = targetOf(next, sel);
  if (!target) return { schema, error: 'not-found' };
  const keys = path.split('.');
  const chain: Obj[] = [target];
  for (const key of keys.slice(0, -1)) {
    const child = chain[chain.length - 1]?.[key];
    if (isObj(child)) chain.push(child);
    else if (value === undefined) return { schema: next, selection: sel };
    else {
      const made: Obj = {};
      (chain[chain.length - 1] as Obj)[key] = made;
      chain.push(made);
    }
  }
  const last = keys[keys.length - 1] as string;
  if (value === undefined) delete (chain[chain.length - 1] as Obj)[last];
  else (chain[chain.length - 1] as Obj)[last] = clone(value);
  // Drop parents that were left empty.
  for (let i = chain.length - 1; i > 0; i--)
    if (Object.keys(chain[i] as Obj).length === 0)
      delete (chain[i - 1] as Obj)[keys[i - 1] as string];
  return { schema: next, selection: sel };
};
