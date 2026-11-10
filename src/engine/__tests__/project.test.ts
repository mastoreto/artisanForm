import { expect, test } from 'bun:test';
import { ArtisanSchemaError } from '../../schema/contract/errors';
import { normalizeArtisanSchema } from '../../schema/normalize';
import { projectToRuntime } from '../project';

const regs = {
  fieldTypes: ['text', 'email', 'select'],
  stepKinds: ['form', 'pending', 'result'],
};

const project = (
  schema: unknown,
  ext?: Parameters<typeof projectToRuntime>[1],
) => projectToRuntime(normalizeArtisanSchema(schema as never), ext, regs);

const base = {
  schemaVersion: 1,
  id: 'f',
  steps: [
    {
      id: 'a',
      type: 'form',
      title: 'A',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Name',
          validation: { minLength: 2 },
        },
      ],
    },
  ],
};

test('projects a v1 form step to the legacy shape the engine runs', () => {
  const p = project(base);
  expect(p.formId).toBe('f');
  expect(p.stepIds).toEqual(['a']);
  const step = p.scheme.steps[0] as unknown as Record<string, unknown>;
  expect(step.id).toBe('a');
  const field = (step.fields as Record<string, unknown>[])[0];
  expect(field).toMatchObject({
    type: 'text',
    name: 'name',
    label: 'Name',
    min: 2,
  });
});

test('the key changes with the content, not with the identity', () => {
  const same = project(structuredClone(base));
  expect(same.key).toBe(project(base).key);
  const other = structuredClone(base);
  other.steps[0].title = 'B';
  expect(project(other).key).not.toBe(project(base).key);
});

test('a wait strategy id resolves through extensions and failTo becomes an index', () => {
  const strategy = { subscribe: () => () => {} };
  const p = project(
    {
      ...base,
      steps: [
        ...base.steps,
        { id: 'w', type: 'wait', title: 'W', strategy: 'poll', failTo: 'a' },
      ],
    },
    { waits: { poll: strategy } } as never,
  );
  const wait = p.scheme.steps[1] as unknown as Record<string, unknown>;
  expect(wait.wait).toBe(strategy);
  expect(wait.failTo).toBe(0);
});

test('an unregistered extension id fails with unresolved-reference', () => {
  const schema = {
    ...base,
    steps: [{ id: 'w', type: 'wait', title: 'W', strategy: 'missing' }],
  };
  try {
    project(schema);
    throw new Error('should have thrown');
  } catch (e) {
    expect(e).toBeInstanceOf(ArtisanSchemaError);
    expect(
      (e as ArtisanSchemaError).issues.some(
        (i) => i.code === 'unresolved-reference',
      ),
    ).toBe(true);
  }
});
