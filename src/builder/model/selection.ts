import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { Selection } from './types';

/**
 * The element an issue path points at: `steps[1].fields[2].validation.min`
 * selects that field, `steps[1].next[0].to` the step, anything else the form.
 * Row fields of an array (`...fields[2].itemFields[0]`) are selected too.
 */
export const pathToSelection = (
  schema: ArtisanSchemaV1,
  issuePath: string,
): Selection => {
  const step = /^steps\[(\d+)\]/.exec(issuePath);
  if (!step) return { kind: 'form' };
  const stepId = schema.steps[Number(step[1])]?.id;
  if (stepId === undefined) return { kind: 'form' };
  const rest = issuePath.slice(step[0].length);
  const field = /^\.fields\[(\d+)\]/.exec(rest);
  if (!field) return { kind: 'step', stepId };
  const path = [Number(field[1])];
  let tail = rest.slice(field[0].length);
  for (;;) {
    const row = /^\.itemFields\[(\d+)\]/.exec(tail);
    if (!row) break;
    path.push(Number(row[1]));
    tail = tail.slice(row[0].length);
  }
  return { kind: 'field', stepId, path };
};

/** Whether a selection still points at something that exists. */
export const selectionExists = (
  schema: ArtisanSchemaV1,
  sel: Selection,
): boolean => {
  if (sel.kind === 'form') return true;
  const step = schema.steps.find((s) => s.id === sel.stepId);
  if (!step) return false;
  if (sel.kind === 'step') return true;
  if (step.type !== 'form') return false;
  let list = step.fields as { type: string; itemFields?: unknown[] }[];
  for (let i = 0; i < sel.path.length; i++) {
    const f = list[sel.path[i] as number];
    if (!f) return false;
    list = (f.itemFields ?? []) as typeof list;
  }
  return true;
};
