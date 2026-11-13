import { expect, test } from 'bun:test';
import {
  checkSchema,
  NATIVE_FIELD_TYPES,
  NATIVE_STEP_TYPES,
} from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import {
  type BuilderState,
  commit,
  createBuilderState,
  redo,
  undo,
} from '../model/history';
import {
  addField,
  addStep,
  duplicateField,
  duplicateStep,
  getField,
  moveField,
  moveStep,
  removeField,
  removeStep,
  renameField,
  renameStep,
  setProperty,
} from '../model/operations';
import { fieldProperties, stepProperties } from '../model/properties';
import type { Change, Selection } from '../model/types';

/** Small deterministic generator: the same seed always gives the same run. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Every field of the schema as (stepId, path). */
const allFields = (s: ArtisanSchemaV1) => {
  const out: { stepId: string; path: number[]; type: string }[] = [];
  for (const step of s.steps) {
    if (step.type !== 'form') continue;
    step.fields.forEach((f, i) => {
      out.push({ stepId: step.id, path: [i], type: f.type });
      if (f.type === 'array')
        f.itemFields.forEach((r, j) => {
          out.push({ stepId: step.id, path: [i, j], type: r.type });
        });
    });
  }
  return out;
};

const errors = (s: ArtisanSchemaV1) =>
  checkSchema(s, { lint: false }).issues.filter((i) => i.severity === 'error');

// Properties whose value would need to point at something that exists or claim a name.
const SKIP = new Set([
  'id',
  'name',
  'sameAs',
  'href',
  'resultName',
  'endName',
  'dependentName',
]);

const run = (seed: number, steps: number) => {
  const next = rng(seed);
  const pick = <T>(xs: readonly T[]): T | undefined =>
    xs[Math.floor(next() * xs.length)];
  let state: BuilderState = createBuilderState({
    schemaVersion: 1,
    id: 'fuzz',
    steps: [{ id: 'main', type: 'form', title: 'Main', fields: [] }],
  });
  const log: string[] = [];

  const apply = (label: string, change: Change) => {
    log.push(label);
    state = commit(state, change);
    const found = errors(state.schema);
    if (found.length)
      throw new Error(
        `seed ${seed}: ${label}\n${log.slice(-6).join('\n')}\n${JSON.stringify(found.slice(0, 3))}`,
      );
  };

  for (let i = 0; i < steps; i++) {
    const s = state.schema;
    const forms = s.steps.filter((x) => x.type === 'form');
    const fields = allFields(s);
    const roll = next();
    if (roll < 0.1) {
      const type = pick(NATIVE_STEP_TYPES);
      if (type)
        apply(
          `addStep ${type}`,
          addStep(s, type, {
            index: Math.floor(next() * (s.steps.length + 1)),
          }),
        );
    } else if (roll < 0.4) {
      const step = pick(forms);
      const type = pick(NATIVE_FIELD_TYPES);
      if (step && type) {
        const arrays = allFields(s).filter(
          (f) =>
            f.stepId === step.id && f.type === 'array' && f.path.length === 1,
        );
        const parent = next() < 0.25 ? pick(arrays)?.path : undefined;
        apply(
          `addField ${type} in ${step.id}${parent ? `[${parent}]` : ''}`,
          addField(s, step.id, type, { parent, index: Math.floor(next() * 4) }),
        );
      }
    } else if (roll < 0.5) {
      const f = pick(fields);
      if (f)
        apply(
          `removeField ${f.stepId}${f.path}`,
          removeField(s, f.stepId, f.path),
        );
    } else if (roll < 0.58) {
      const st = pick(s.steps);
      if (st) apply(`removeStep ${st.id}`, removeStep(s, st.id));
    } else if (roll < 0.68) {
      const from = pick(fields);
      const to = pick(forms);
      if (from && to) {
        const arrays = fields.filter(
          (f) =>
            f.stepId === to.id && f.type === 'array' && f.path.length === 1,
        );
        const parent = next() < 0.3 ? pick(arrays)?.path : undefined;
        apply(
          `moveField ${from.stepId}${from.path} -> ${to.id}`,
          moveField(s, from, {
            stepId: to.id,
            index: Math.floor(next() * 4),
            parent,
          }),
        );
      }
    } else if (roll < 0.72) {
      const st = pick(s.steps);
      if (st)
        apply(
          `moveStep ${st.id}`,
          moveStep(s, st.id, Math.floor(next() * s.steps.length)),
        );
    } else if (roll < 0.78) {
      const f = pick(fields);
      if (f)
        apply(
          `duplicateField ${f.stepId}${f.path}`,
          duplicateField(s, f.stepId, f.path),
        );
    } else if (roll < 0.82) {
      const st = pick(s.steps);
      if (st) apply(`duplicateStep ${st.id}`, duplicateStep(s, st.id));
    } else if (roll < 0.87) {
      const f = pick(fields);
      if (f)
        apply(
          `renameField ${f.stepId}${f.path}`,
          renameField(s, f.stepId, f.path, `n${Math.floor(next() * 40)}`),
        );
    } else if (roll < 0.9) {
      const st = pick(s.steps);
      if (st)
        apply(
          `renameStep ${st.id}`,
          renameStep(s, st.id, `s${Math.floor(next() * 40)}`),
        );
    } else if (roll < 0.97) {
      // edit a property of a random field or step through its descriptors
      const f = pick(fields);
      const sel: Selection | undefined =
        f && next() < 0.8
          ? { kind: 'field', stepId: f.stepId, path: f.path }
          : (() => {
              const st = pick(s.steps);
              return st ? { kind: 'step', stepId: st.id } : undefined;
            })();
      if (sel) {
        const type =
          sel.kind === 'field'
            ? (getField(s, sel.stepId, sel.path)?.type as string)
            : (s.steps.find((x) => x.id === (sel as { stepId: string }).stepId)
                ?.type as string);
        const props =
          sel.kind === 'field'
            ? fieldProperties(type as never)
            : stepProperties(type as never);
        const d = pick(
          props.filter(
            (p) =>
              !SKIP.has(p.path.split('.').pop() as string) &&
              ['text', 'textarea', 'number', 'boolean', 'enum'].includes(
                p.control,
              ),
          ),
        );
        if (d) {
          const value =
            d.control === 'boolean'
              ? next() < 0.5
              : d.control === 'number'
                ? Math.round(
                    (d.min ?? 0) +
                      next() * Math.min(10, (d.max ?? 10) - (d.min ?? 0)),
                  )
                : d.control === 'enum'
                  ? pick(d.options ?? [])
                  : d.path.endsWith('pattern')
                    ? '^[a-z]+$'
                    : `value ${Math.floor(next() * 100)}`;
          apply(`setProperty ${d.path}`, setProperty(s, sel, d.path, value));
        }
      }
    } else {
      // time travel never breaks validity
      state = next() < 0.5 ? undo(state) : redo(state);
      expect(errors(state.schema)).toEqual([]);
    }
  }
  return state;
};

test.each(Array.from({ length: 30 }, (_, i) => i + 1))(
  'random sequences keep the schema valid (seed %i)',
  (seed) => {
    const state = run(seed, 80);
    expect(errors(state.schema)).toEqual([]);
  },
);

test('the same seed gives the same schema', () => {
  expect(run(7, 60).schema).toEqual(run(7, 60).schema);
});
