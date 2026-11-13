import { answerKeys } from '../../schema/answers';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { ArtisanFieldV1 } from '../../schema/contract/fields';
import type { ConditionV1, OptionV1 } from '../../schema/contract/types';

export type Operator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'filled'
  | 'empty';

/** A condition as the editor holds it: a tree of groups and comparisons. */
export type ConditionNode =
  | { kind: 'leaf'; field: string; operator: Operator; value?: unknown }
  | {
      kind: 'group';
      mode: 'all' | 'any';
      negate: boolean;
      items: ConditionNode[];
    };

export type ConditionLeaf = Extract<ConditionNode, { kind: 'leaf' }>;
export type ConditionGroup = Extract<ConditionNode, { kind: 'group' }>;

/** An answer a condition may read. */
export interface AnswerInfo {
  key: string;
  label: string;
  type: string;
  stepIndex: number;
  options?: OptionV1[];
}

const NUMERIC = new Set(['number', 'range', 'rating']);
const ORDERED = new Set([...NUMERIC, 'date', 'time', 'datetime', 'month']);

/** The comparisons that make sense for an answer of this type. */
export const operatorsFor = (type: string): Operator[] => {
  if (type === 'checkbox' || type === 'switch') return ['eq', 'filled'];
  const base: Operator[] = ['eq', 'neq', 'in', 'notIn', 'filled', 'empty'];
  return ORDERED.has(type)
    ? ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'filled', 'empty']
    : base;
};

export const isPresenceOperator = (op: Operator) =>
  op === 'filled' || op === 'empty';
export const isListOperator = (op: Operator) => op === 'in' || op === 'notIn';

/**
 * The answers a condition can read: every key written by the fields of the
 * form steps up to `upToStep` (the second key of a date range or a dynamic
 * select included), minus `exclude`. Rows of an `array` are not addressable.
 */
export const answerInfo = (
  schema: ArtisanSchemaV1,
  upToStep: number,
  exclude: ReadonlySet<string> = new Set(),
): AnswerInfo[] => {
  const out: AnswerInfo[] = [];
  schema.steps.forEach((step, stepIndex) => {
    if (step.type !== 'form' || stepIndex > upToStep) return;
    for (const field of step.fields as ArtisanFieldV1[]) {
      const keys = answerKeys(field);
      const label = 'label' in field && field.label ? field.label : field.name;
      keys.forEach((key, i) => {
        if (exclude.has(key)) return;
        out.push({
          key,
          label: i === 0 ? label : `${label} (${key})`,
          type:
            field.type === 'daterange'
              ? 'date'
              : i === 1 && field.type === 'dynamicSelect'
                ? 'select'
                : field.type,
          stepIndex,
          options:
            'options' in field && i === 0
              ? (field.options as OptionV1[] | undefined)
              : undefined,
        });
      });
    }
  });
  return out;
};

/** Turns the typed text of an input into the value the answer holds (a number stays a number). */
export const coerceValue = (type: string, raw: string): unknown => {
  if (type === 'checkbox' || type === 'switch') return raw === 'true';
  if (NUMERIC.has(type)) {
    const n = Number(raw);
    return raw.trim() === '' || Number.isNaN(n) ? raw : n;
  }
  return raw;
};

const isGroup = (
  c: ConditionV1,
): c is Extract<ConditionV1, { all: ConditionV1[] } | { any: ConditionV1[] }> =>
  'all' in c || 'any' in c;

const toNode = (c: ConditionV1): ConditionNode => {
  if ('not' in c) {
    const inner = toNode(c.not);
    return inner.kind === 'group'
      ? { ...inner, negate: !inner.negate }
      : { kind: 'group', mode: 'all', negate: true, items: [inner] };
  }
  if (isGroup(c)) {
    const mode = 'all' in c ? 'all' : 'any';
    const items = ('all' in c ? c.all : c.any).map(toNode);
    return { kind: 'group', mode, negate: false, items };
  }
  const leaf = c as { field: string; operator: Operator; value?: unknown };
  return {
    kind: 'leaf',
    field: leaf.field,
    operator: leaf.operator,
    value: leaf.value,
  };
};

/** The editable tree of a condition: always a group at the top (empty when there is no condition). */
export const toTree = (cond: ConditionV1 | undefined): ConditionGroup => {
  if (!cond) return { kind: 'group', mode: 'all', negate: false, items: [] };
  const node = toNode(cond);
  return node.kind === 'group'
    ? node
    : { kind: 'group', mode: 'all', negate: false, items: [node] };
};

const fromNode = (node: ConditionNode): ConditionV1 | undefined => {
  if (node.kind === 'leaf') {
    if (!node.field) return undefined;
    return (
      isPresenceOperator(node.operator)
        ? { field: node.field, operator: node.operator }
        : {
            field: node.field,
            operator: node.operator,
            value: node.value ?? '',
          }
    ) as ConditionV1;
  }
  const kids = node.items
    .map(fromNode)
    .filter((c): c is ConditionV1 => c !== undefined);
  if (kids.length === 0) return undefined;
  const body = (
    kids.length === 1 && !node.negate ? kids[0] : { [node.mode]: kids }
  ) as ConditionV1;
  return node.negate
    ? ({
        not: kids.length === 1 ? (kids[0] as ConditionV1) : body,
      } as ConditionV1)
    : body;
};

/** The condition a tree stands for (a single comparison is stored bare), or `undefined` when empty. */
export const fromTree = (node: ConditionNode): ConditionV1 | undefined =>
  fromNode(node);

/** A new comparison on the first answer on offer. */
export const newLeaf = (answers: AnswerInfo[]): ConditionLeaf => {
  const first = answers[0];
  return {
    kind: 'leaf',
    field: first?.key ?? '',
    operator: 'eq',
    value:
      first?.type === 'checkbox' || first?.type === 'switch'
        ? true
        : (first?.options?.[0]?.value ?? ''),
  };
};
