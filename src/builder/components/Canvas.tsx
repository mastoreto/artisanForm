import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ArtisanFieldV1 } from '../../schema/contract/fields';
import type { NativeStepType } from '../../schema/contract/steps';
import { useBuilder } from '../context';
import { useBx } from '../cx';
import { FIELD_CATALOG, STEP_CATALOG } from '../model/catalog';
import type { Selection } from '../model/types';
import { Flow } from './Flow';

export const fieldId = (stepId: string, path: readonly number[]) =>
  `field:${stepId}:${path.join('.')}`;
export const listId = (stepId: string, parent: readonly number[]) =>
  `list:${stepId}:${parent.join('.')}`;

const samePath = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((n, i) => n === b[i]);

const isSelected = (sel: Selection, stepId: string, path: readonly number[]) =>
  sel.kind === 'field' && sel.stepId === stepId && samePath(sel.path, path);

const FieldRow = ({
  field,
  stepId,
  path,
}: {
  field: ArtisanFieldV1;
  stepId: string;
  path: number[];
}) => {
  const { schema, selection, labels, actions, readOnly } = useBuilder();
  const bx = useBx();
  const parent = path.slice(0, -1);
  const index = path[path.length - 1] as number;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: fieldId(stepId, path),
    data: { kind: 'field', stepId, path },
    disabled: readOnly,
  });
  const label =
    'label' in field && field.label
      ? field.label
      : 'text' in field && field.text
        ? field.text
        : field.name;
  const name = `${label}`;
  const siblings =
    parent.length === 0
      ? ((
          schema.steps.find((s) => s.id === stepId) as
            | { fields?: unknown[] }
            | undefined
        )?.fields?.length ?? 0)
      : 0;
  const otherSteps = schema.steps.filter(
    (s) => s.type === 'form' && s.id !== stepId,
  );
  const selected = isSelected(selection, stepId, path);
  const entry = FIELD_CATALOG[field.type as keyof typeof FIELD_CATALOG];
  return (
    <li
      ref={setNodeRef}
      className={bx(
        'field',
        selected && 'afb-selected',
        isDragging && 'afb-dragging',
      )}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
      data-field={field.name}
    >
      <div className={bx('fieldBar')}>
        <button
          type="button"
          className={bx('handle')}
          aria-label={labels.dragHandle(name)}
          disabled={readOnly}
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          className={bx('fieldMain')}
          aria-pressed={selected}
          onClick={() => actions.select({ kind: 'field', stepId, path })}
        >
          <span className={bx('fieldLabel')}>{name}</span>
          <span className={bx('fieldMeta')}>
            {entry?.label ?? field.type} · {field.name}
            {'required' in field && field.required ? ' *' : ''}
          </span>
        </button>
        {!readOnly && (
          <span className={bx('fieldActions')}>
            <button
              type="button"
              className={bx('iconButton')}
              aria-label={`${labels.moveUp}: ${name}`}
              disabled={index === 0}
              onClick={() =>
                actions.moveField(
                  { stepId, path },
                  { stepId, index: index - 1, parent },
                )
              }
            >
              ↑
            </button>
            <button
              type="button"
              className={bx('iconButton')}
              aria-label={`${labels.moveDown}: ${name}`}
              onClick={() =>
                actions.moveField(
                  { stepId, path },
                  { stepId, index: index + 1, parent },
                )
              }
            >
              ↓
            </button>
            <button
              type="button"
              className={bx('iconButton')}
              aria-label={`${labels.duplicate}: ${name}`}
              onClick={() => actions.duplicateAt(stepId, path)}
            >
              ⧉
            </button>
            <button
              type="button"
              className={bx('iconButton')}
              aria-label={`${labels.remove}: ${name}`}
              onClick={() => actions.removeAt(stepId, path)}
            >
              ✕
            </button>
            {parent.length === 0 && otherSteps.length > 0 && siblings > 0 && (
              <select
                className={bx('moveSelect')}
                aria-label={`${labels.moveToStep}: ${name}`}
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    actions.moveField(
                      { stepId, path },
                      {
                        stepId: e.target.value,
                        index: Number.MAX_SAFE_INTEGER,
                      },
                    );
                }}
              >
                <option value="">{labels.moveToStep}…</option>
                {otherSteps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}
          </span>
        )}
      </div>
      {field.type === 'array' && (
        <div className={bx('rows')}>
          <FieldList
            stepId={stepId}
            parent={path}
            fields={field.itemFields}
            label={labels.rowsOf(name)}
          />
        </div>
      )}
    </li>
  );
};

/** One sortable list of fields: a step's own, or the rows of an `array`. */
export const FieldList = ({
  stepId,
  parent,
  fields,
  label,
}: {
  stepId: string;
  parent: number[];
  fields: readonly ArtisanFieldV1[];
  label?: string;
}) => {
  const { labels } = useBuilder();
  const bx = useBx();
  const { setNodeRef, isOver } = useDroppable({
    id: listId(stepId, parent),
    data: { kind: 'list', stepId, parent },
  });
  const ids = fields.map((_, i) => fieldId(stepId, [...parent, i]));
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <ul
        ref={setNodeRef}
        className={bx('list', isOver && 'afb-over')}
        aria-label={label ?? labels.canvasTitle}
      >
        {fields.map((f, i) => (
          <FieldRow
            key={ids[i]}
            field={f}
            stepId={stepId}
            path={[...parent, i]}
          />
        ))}
        {fields.length === 0 && (
          <li className={bx('empty')}>{labels.emptyStep}</li>
        )}
      </ul>
    </SortableContext>
  );
};

/** Steps as tabs, and the fields of the open one. */
export const Canvas = () => {
  const { schema, selection, labels, actions, readOnly, features, mode } =
    useBuilder();
  const bx = useBx();
  const activeId =
    selection.kind === 'form'
      ? (schema.steps.find((s) => s.type === 'form') ?? schema.steps[0])?.id
      : selection.stepId;
  const index = schema.steps.findIndex((s) => s.id === activeId);
  const step = schema.steps[index];
  const types = (Object.keys(STEP_CATALOG) as NativeStepType[])
    .filter((t) => features.steps || t === 'form')
    .filter(
      (t) => mode === 'advanced' || STEP_CATALOG[t].level !== 'developer',
    );
  return (
    <section className={bx('canvas')} aria-label={labels.canvasTitle}>
      <div
        className={bx('stepTabs')}
        role="tablist"
        aria-label={labels.stepsLabel}
      >
        {schema.steps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === activeId}
            className={bx('stepTab', s.id === activeId && 'afb-selected')}
            onClick={() => actions.select({ kind: 'step', stepId: s.id })}
          >
            {labels.stepPage(i + 1, s.title)}
          </button>
        ))}
        {!readOnly && (
          <select
            className={bx('moveSelect')}
            aria-label={labels.addStep}
            value=""
            onChange={(e) => {
              if (e.target.value)
                actions.addStep(e.target.value as NativeStepType);
            }}
          >
            <option value="">+ {labels.addStep}</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {STEP_CATALOG[t].label}
              </option>
            ))}
          </select>
        )}
      </div>
      {step && !readOnly && (
        <div className={bx('stepActions')}>
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={labels.moveLeft}
            disabled={index === 0}
            onClick={() => actions.moveStep(step.id, index - 1)}
          >
            ←
          </button>
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={labels.moveRight}
            disabled={index === schema.steps.length - 1}
            onClick={() => actions.moveStep(step.id, index + 1)}
          >
            →
          </button>
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={`${labels.duplicate}: ${step.title}`}
            onClick={() => actions.duplicateStepById(step.id)}
          >
            ⧉
          </button>
          <button
            type="button"
            className={bx('iconButton')}
            aria-label={`${labels.remove}: ${step.title}`}
            disabled={schema.steps.length === 1}
            onClick={() => actions.removeStepById(step.id)}
          >
            ✕
          </button>
        </div>
      )}
      {step?.type === 'form' ? (
        <FieldList stepId={step.id} parent={[]} fields={step.fields} />
      ) : step ? (
        <div className={bx('stepCard')}>
          <strong>{step.title}</strong>
          <span>
            {STEP_CATALOG[step.type as NativeStepType]?.description ??
              step.type}
          </span>
        </div>
      ) : null}
      {features.steps && <Flow />}
    </section>
  );
};
