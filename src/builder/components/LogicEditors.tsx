import { useState } from 'react';
import type { ConditionV1 } from '../../schema/contract/types';
import { useBuilder } from '../context';
import { useBx } from '../cx';
import {
  type AnswerInfo,
  answerInfo,
  type ConditionNode,
  coerceValue,
  fromTree,
  isListOperator,
  isPresenceOperator,
  newLeaf,
  type Operator,
  operatorsFor,
  toTree,
} from '../model/conditions';

type Group = Extract<ConditionNode, { kind: 'group' }>;
type Leaf = Extract<ConditionNode, { kind: 'leaf' }>;

/** Replaces (or, with `null`, removes) the node at `path` of a tree, returning a new tree. */
const replaceAt = (
  root: Group,
  path: number[],
  next: ConditionNode | null,
): Group => {
  if (path.length === 0) return (next ?? root) as Group;
  const [i, ...rest] = path as [number, ...number[]];
  const items = [...root.items];
  const child = items[i];
  if (rest.length === 0) {
    if (next === null) items.splice(i, 1);
    else items[i] = next;
  } else if (child?.kind === 'group') items[i] = replaceAt(child, rest, next);
  return { ...root, items };
};

const ValueInput = ({
  leaf,
  info,
  onChange,
}: {
  leaf: Leaf;
  info?: AnswerInfo;
  onChange: (v: unknown) => void;
}) => {
  const { labels } = useBuilder();
  const bx = useBx();
  if (isPresenceOperator(leaf.operator)) return null;
  const type = info?.type ?? 'text';
  if (isListOperator(leaf.operator))
    return (
      <input
        className={bx('input')}
        aria-label={labels.condValue}
        title={labels.condListHelp}
        value={Array.isArray(leaf.value) ? leaf.value.join(', ') : ''}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((v) => coerceValue(type, v.trim()))
              .filter((v) => v !== ''),
          )
        }
      />
    );
  if (type === 'checkbox' || type === 'switch')
    return (
      <select
        className={bx('input')}
        aria-label={labels.condValue}
        value={String(leaf.value === true)}
        onChange={(e) => onChange(e.target.value === 'true')}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  if (info?.options?.length)
    return (
      <select
        className={bx('input')}
        aria-label={labels.condValue}
        value={String(leaf.value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        {info.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  return (
    <input
      className={bx('input')}
      aria-label={labels.condValue}
      type={['number', 'range', 'rating'].includes(type) ? 'number' : 'text'}
      value={String(leaf.value ?? '')}
      onChange={(e) => onChange(coerceValue(type, e.target.value))}
    />
  );
};

const NodeView = ({
  node,
  path,
  answers,
  depth,
  update,
}: {
  node: ConditionNode;
  path: number[];
  answers: AnswerInfo[];
  depth: number;
  update: (path: number[], next: ConditionNode | null) => void;
}) => {
  const { labels } = useBuilder();
  const bx = useBx();
  if (node.kind === 'leaf') {
    const info = answers.find((a) => a.key === node.field);
    const ops = operatorsFor(info?.type ?? 'text');
    return (
      <div className={bx('condRow')}>
        <select
          className={bx('input')}
          aria-label={labels.condAnswer}
          value={node.field}
          onChange={(e) => {
            const next = answers.find((a) => a.key === e.target.value);
            update(path, {
              ...newLeaf(next ? [next] : []),
              operator: ops.includes(node.operator) ? node.operator : 'eq',
            });
          }}
        >
          {!info && <option value={node.field}>{node.field}</option>}
          {answers.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
        <select
          className={bx('input')}
          aria-label={labels.condOperator}
          value={node.operator}
          onChange={(e) => {
            const operator = e.target.value as Operator;
            update(path, {
              ...node,
              operator,
              value: isListOperator(operator)
                ? Array.isArray(node.value)
                  ? node.value
                  : []
                : Array.isArray(node.value)
                  ? (node.value[0] ?? '')
                  : node.value,
            });
          }}
        >
          {ops.map((o) => (
            <option key={o} value={o}>
              {labels.operators[o]}
            </option>
          ))}
        </select>
        <ValueInput
          leaf={node}
          info={info}
          onChange={(value) => update(path, { ...node, value })}
        />
        <button
          type="button"
          className={bx('iconButton')}
          aria-label={labels.condRemove}
          onClick={() => update(path, null)}
        >
          ✕
        </button>
      </div>
    );
  }
  return (
    <div className={bx('condGroup')}>
      <div className={bx('condHead')}>
        <label className={bx('condNot')}>
          <input
            type="checkbox"
            checked={node.negate}
            onChange={(e) =>
              update(path, { ...node, negate: e.target.checked })
            }
          />{' '}
          {labels.condNot}
        </label>
        <span>{labels.condMatch}</span>
        <select
          className={bx('input')}
          aria-label={labels.condMatch}
          value={node.mode}
          onChange={(e) =>
            update(path, { ...node, mode: e.target.value as 'all' | 'any' })
          }
        >
          <option value="all">{labels.condAll}</option>
          <option value="any">{labels.condAny}</option>
        </select>
        {path.length > 0 && (
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={labels.condRemove}
            onClick={() => update(path, null)}
          >
            ✕
          </button>
        )}
      </div>
      {node.items.map((item, i) => (
        <NodeView
          key={i}
          node={item}
          path={[...path, i]}
          answers={answers}
          depth={depth + 1}
          update={update}
        />
      ))}
      <div className={bx('condActions')}>
        <button
          type="button"
          className={bx('button')}
          disabled={answers.length === 0}
          onClick={() =>
            update(path, { ...node, items: [...node.items, newLeaf(answers)] })
          }
        >
          {labels.condAdd}
        </button>
        {depth < 3 && (
          <button
            type="button"
            className={bx('button')}
            disabled={answers.length === 0}
            onClick={() =>
              update(path, {
                ...node,
                items: [
                  ...node.items,
                  {
                    kind: 'group',
                    mode: 'any',
                    negate: false,
                    items: [newLeaf(answers)],
                  },
                ],
              })
            }
          >
            {labels.condAddGroup}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Builds a condition without writing JSON: comparisons of an earlier answer
 * (typed by the answer: numbers, choices, yes/no), grouped with all/any and
 * negated with Not. `upToStep` limits the answers to those asked before.
 */
export const ConditionEditor = ({
  value,
  onChange,
  upToStep,
  exclude,
}: {
  value: ConditionV1 | undefined;
  onChange: (next: ConditionV1 | undefined) => void;
  upToStep: number;
  exclude?: ReadonlySet<string>;
}) => {
  const { schema, labels } = useBuilder();
  const bx = useBx();
  const answers = answerInfo(schema, upToStep, exclude);
  const [tree, setTree] = useState<Group>(() => toTree(value));
  // Follow a change that did not come from here (undo, another selection).
  const current = JSON.stringify(fromTree(tree) ?? null);
  const incoming = JSON.stringify(value ?? null);
  const [seen, setSeen] = useState(incoming);
  if (incoming !== seen) {
    setSeen(incoming);
    if (incoming !== current) setTree(toTree(value));
  }
  const update = (path: number[], next: ConditionNode | null) => {
    const updated = replaceAt(tree, path, next);
    setTree(updated);
    const cond = fromTree(updated);
    setSeen(JSON.stringify(cond ?? null));
    onChange(cond);
  };
  return (
    <div className={bx('cond')}>
      {answers.length === 0 && (
        <p className={bx('help')}>{labels.condNoAnswers}</p>
      )}
      {tree.items.length === 0 && answers.length > 0 && (
        <p className={bx('help')}>{labels.condEmpty}</p>
      )}
      <NodeView
        node={tree}
        path={[]}
        answers={answers}
        depth={0}
        update={update}
      />
    </div>
  );
};

interface Edge {
  when?: ConditionV1;
  to: string;
}

/** The next steps of a step: where to go, and under which condition. */
export const TransitionsEditor = ({
  value,
  onChange,
  stepIndex,
}: {
  value: Edge[] | undefined;
  onChange: (next: Edge[] | undefined) => void;
  stepIndex: number;
}) => {
  const { schema, labels } = useBuilder();
  const bx = useBx();
  const edges = value ?? [];
  const set = (next: Edge[]) => onChange(next.length ? next : undefined);
  return (
    <div className={bx('transitions')}>
      {edges.map((edge, i) => (
        <div key={i} className={bx('edge')}>
          <label className={bx('propertyLabel')}>
            {labels.transTo}
            <select
              className={bx('input')}
              aria-label={`${labels.transTo} ${i + 1}`}
              value={edge.to}
              onChange={(e) =>
                set(
                  edges.map((x, j) =>
                    j === i ? { ...x, to: e.target.value } : x,
                  ),
                )
              }
            >
              {schema.steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <details className={bx('details')}>
            <summary>
              {edge.when ? labels.transWhen : labels.transAlways}
            </summary>
            <ConditionEditor
              value={edge.when}
              upToStep={stepIndex}
              onChange={(when) =>
                set(
                  edges.map((x, j) =>
                    j === i ? (when ? { ...x, when } : { to: x.to }) : x,
                  ),
                )
              }
            />
          </details>
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={`${labels.transRemove} ${i + 1}`}
            onClick={() => set(edges.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={bx('button')}
        onClick={() =>
          set([
            ...edges,
            {
              to:
                schema.steps[Math.min(stepIndex + 1, schema.steps.length - 1)]
                  ?.id ?? '',
            },
          ])
        }
      >
        {labels.transAdd}
      </button>
    </div>
  );
};

interface ResultAction {
  label: string;
  href?: string;
  action?: string;
}

/** The buttons of a result step: text, and a link or a registered action. */
export const ActionsEditor = ({
  value,
  onChange,
}: {
  value: ResultAction[] | undefined;
  onChange: (next: ResultAction[] | undefined) => void;
}) => {
  const { labels, manifest } = useBuilder();
  const bx = useBx();
  const list = value ?? [];
  const set = (next: ResultAction[]) =>
    onChange(next.length ? next : undefined);
  const patch = (i: number, p: Partial<ResultAction>) =>
    set(
      list.map((a, j) => {
        if (j !== i) return a;
        const merged = { ...a, ...p };
        return Object.fromEntries(
          Object.entries(merged).filter(([, v]) => v !== '' && v !== undefined),
        ) as unknown as ResultAction;
      }),
    );
  const registered = manifest?.refs.actions ?? [];
  return (
    <div className={bx('options')}>
      {list.map((a, i) => (
        <div key={i} className={bx('optionRow')}>
          <input
            className={bx('input')}
            aria-label={`${labels.actionLabel} ${i + 1}`}
            value={a.label}
            onChange={(e) =>
              set(
                list.map((x, j) =>
                  j === i ? { ...x, label: e.target.value } : x,
                ),
              )
            }
          />
          <input
            className={bx('input')}
            aria-label={`${labels.actionHref} ${i + 1}`}
            placeholder={labels.actionHref}
            value={a.href ?? ''}
            onChange={(e) => patch(i, { href: e.target.value })}
          />
          {registered.length > 0 && (
            <select
              className={bx('input')}
              aria-label={`${labels.actionAction} ${i + 1}`}
              value={a.action ?? ''}
              onChange={(e) => patch(i, { action: e.target.value })}
            >
              <option value="">{labels.noValue}</option>
              {registered.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={labels.remove}
            onClick={() => set(list.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className={bx('button')}
        onClick={() => set([...list, { label: 'Button' }])}
      >
        {labels.actionsAdd}
      </button>
    </div>
  );
};
