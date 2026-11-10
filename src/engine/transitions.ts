import { evaluateCondition } from '../schema/contract/conditions';
import type { FormSchema, StepSchema } from '../schema/legacy/types';

type Values = Record<string, unknown>;
type FlowStep = Pick<StepSchema, 'id' | 'kind' | 'next' | 'loop' | 'revisit'>;

/** True when the schema uses transitions, loops or revisit rules (otherwise navigation stays linear). */
export const usesFlow = (scheme: FormSchema) =>
  scheme.steps.some((s) => s.next || s.loop || s.revisit);

/** How many times `id` was entered: once per time it was left (`history`), plus now if it is current. */
const entered = (history: readonly string[], id: string, currentId?: string) =>
  history.filter((h) => h === id).length + (currentId === id ? 1 : 0);

/**
 * The index (among the visible `steps`) to go to after `index`: the first
 * transition whose condition holds and whose target is visible and allowed,
 * otherwise the next visible step.
 *
 * A target already entered before is a re-entry: it needs `loop.max` and is
 * refused once it was re-entered that many times; a `revisit: 'deny'` step is
 * never entered again. `result` steps are only shown after the submit.
 */
export const resolveNext = (
  steps: readonly FlowStep[],
  index: number,
  values: Values,
  history: readonly string[],
): number => {
  const current = steps[index];
  for (const edge of current?.next ?? []) {
    if (edge.when && !evaluateCondition(edge.when, values)) continue;
    const target = steps.findIndex((s) => s.id === edge.to);
    if (target < 0 || steps[target].kind === 'result') continue;
    const times = entered(history, edge.to, current.id);
    if (times > 0) {
      const { loop, revisit } = steps[target];
      if (revisit === 'deny' || !loop || times > loop.max) continue;
    }
    return target;
  }
  return index + 1;
};

/**
 * Where "Back" goes: the last step left, unless that step is `revisit: 'deny'`
 * (a finished payment cannot be undone), in which case there is no way back.
 */
export const resolveBack = (
  steps: readonly FlowStep[],
  history: readonly string[],
): { index: number; history: string[] } | null => {
  const id = history[history.length - 1];
  if (id === undefined) return null;
  const index = steps.findIndex((s) => s.id === id);
  if (index < 0 || steps[index].revisit === 'deny') return null;
  return { index, history: history.slice(0, -1) };
};

/**
 * Whether the user may jump to `targetId` (stepper, `goToStep`): a step
 * already left needs `revisit` allowed, and no `deny` step may lie between it
 * and here (going back past a finished payment is the same as undoing it).
 */
export const canJumpTo = (
  steps: readonly FlowStep[],
  history: readonly string[],
  targetId: string,
): boolean => {
  const at = history.lastIndexOf(targetId);
  if (at < 0) return steps.find((s) => s.id === targetId)?.revisit !== 'deny';
  return history
    .slice(at)
    .every((id) => steps.find((s) => s.id === id)?.revisit !== 'deny');
};
