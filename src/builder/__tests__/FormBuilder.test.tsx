import { afterEach, describe, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { FormBuilder } from '../components/FormBuilder';
import type { BuilderResult } from '../useFormBuilder';

afterEach(cleanup);

const start = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  title: 'F',
  steps: [{ id: 'one', type: 'form', title: 'One', fields: [] }],
});

const last = (spy: ReturnType<typeof mock>) =>
  spy.mock.calls.at(-1)?.[0] as BuilderResult;
const names = (r: BuilderResult) =>
  (r.schema.steps[0] as unknown as { fields: { name: string }[] }).fields.map(
    (f) => f.name,
  );

const canvas = () => screen.getByRole('region', { name: 'Form' });

describe('adding and arranging', () => {
  test('clicking an input in the palette adds it, selects it and reports a valid schema', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    expect(names(last(onChange))).toEqual(['text']);
    expect(last(onChange).ok).toBe(true);
    expect(
      within(canvas()).getByText('Text', { selector: '.afb-field-label' }),
    ).toBeTruthy();
    // the inspector now edits that input
    expect(
      screen.getByRole('region', { name: 'Settings' }).textContent,
    ).toContain('Input (Text)');
  });

  test('inputs get distinct names and the preview shows them', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    for (const label of ['Add Text', 'Add Text', 'Add Email'])
      fireEvent.click(screen.getByRole('button', { name: label }));
    expect(names(last(onChange))).toEqual(['text', 'text2', 'email']);
    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getAllByLabelText('Text').length).toBe(2);
  });

  test('move up and down, duplicate and remove work from the buttons', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    for (const label of ['Add Text', 'Add Email', 'Add Number'])
      fireEvent.click(screen.getByRole('button', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'Move up: Number' }));
    expect(names(last(onChange))).toEqual(['text', 'number', 'email']);
    fireEvent.click(screen.getByRole('button', { name: 'Move down: Text' }));
    expect(names(last(onChange))).toEqual(['number', 'text', 'email']);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate: Email' }));
    expect(names(last(onChange))).toEqual([
      'number',
      'text',
      'email',
      'email2',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove: Number' }));
    expect(names(last(onChange))).toEqual(['text', 'email', 'email2']);
  });

  test('undo and redo walk the changes', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Email' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(names(last(onChange))).toEqual(['text']);
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(names(last(onChange))).toEqual(['text', 'email']);
  });

  test('steps: add one, switch tabs, and the fields follow the open step', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Add step'), {
      target: { value: 'form' },
    });
    expect(last(onChange).schema.steps.map((s) => s.id)).toEqual([
      'one',
      'form',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    const second = last(onChange).schema.steps[1] as unknown as {
      fields: unknown[];
    };
    expect(second.fields.length).toBe(1);
    fireEvent.click(screen.getByRole('tab', { name: /Step 1/ }));
    expect(screen.getAllByRole('tab', { selected: true }).length).toBe(1);
  });
});

describe('the inspector', () => {
  const withText = () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    return onChange;
  };
  const inspector = () => screen.getByRole('region', { name: 'Settings' });

  test('editing the label changes the schema and the preview', () => {
    const onChange = withText();
    fireEvent.change(within(inspector()).getByLabelText('Label'), {
      target: { value: 'Full name' },
    });
    const field = (
      last(onChange).schema.steps[0] as unknown as {
        fields: { label: string }[];
      }
    ).fields[0];
    expect(field?.label).toBe('Full name');
    expect(
      within(screen.getByRole('region', { name: 'Preview' })).getByLabelText(
        'Full name',
      ),
    ).toBeTruthy();
  });

  test('required is a checkbox that adds and removes the key', () => {
    const onChange = withText();
    const box = within(inspector()).getByLabelText('Required');
    fireEvent.click(box);
    expect(
      (
        last(onChange).schema.steps[0] as unknown as {
          fields: { required?: boolean }[];
        }
      ).fields[0]?.required,
    ).toBe(true);
    fireEvent.click(box);
    expect(
      (last(onChange).schema.steps[0] as unknown as { fields: object[] })
        .fields[0],
    ).not.toHaveProperty('required');
  });

  test('renaming to a taken name is refused and says why', () => {
    const onChange = withText();
    fireEvent.click(screen.getByRole('button', { name: 'Add Email' }));
    fireEvent.change(within(inspector()).getByLabelText('Name'), {
      target: { value: 'text' },
    });
    expect(within(inspector()).getByRole('alert').textContent).toBe(
      'Another input already uses this name',
    );
    expect(names(last(onChange))).toEqual(['text', 'email']);
  });

  test('options of a choice are edited as rows', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Dropdown' }));
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Add option' }),
    );
    const options = (r: BuilderResult) =>
      (r.schema.steps[0] as unknown as { fields: { options: unknown[] }[] })
        .fields[0]?.options;
    expect(options(last(onChange)).length).toBe(4);
    fireEvent.click(
      within(inspector()).getByRole('button', { name: 'Remove option 4' }),
    );
    expect(options(last(onChange)).length).toBe(3);
    expect(last(onChange).ok).toBe(true);
  });

  test('the form itself and a step have their own settings', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={start()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Step 1/ }));
    fireEvent.change(within(inspector()).getByLabelText('Title'), {
      target: { value: 'About you' },
    });
    expect(last(onChange).schema.steps[0]?.title).toBe('About you');
  });
});

describe('modes, policy and read only', () => {
  const palette = () => screen.getByRole('region', { name: 'Inputs' });

  test('simple mode hides advanced inputs and developer settings; advanced shows them', () => {
    const { rerender } = render(
      <FormBuilder defaultValue={start()} mode="simple" />,
    );
    expect(
      within(palette()).queryByRole('button', { name: 'Add Password' }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add Text' }));
    expect(screen.queryByLabelText('Id')).toBeNull();
    rerender(<FormBuilder defaultValue={start()} mode="advanced" />);
    expect(
      within(palette()).getByRole('button', { name: 'Add Password' }),
    ).toBeTruthy();
  });

  test('a policy limits the inputs on offer', () => {
    render(
      <FormBuilder
        defaultValue={start()}
        policy={{ nativeFieldTypes: ['text', 'email'] }}
      />,
    );
    expect(
      within(palette())
        .getAllByRole('button')
        .map((b) => b.getAttribute('data-type')),
    ).toEqual(['text', 'email']);
  });

  test('searching narrows the palette', () => {
    render(<FormBuilder defaultValue={start()} />);
    fireEvent.change(screen.getByLabelText('Search inputs'), {
      target: { value: 'date' },
    });
    const types = within(palette())
      .getAllByRole('button')
      .map((b) => b.getAttribute('data-type'));
    expect(types).toContain('date');
    expect(types).not.toContain('text');
  });

  test('read only disables the editing controls', () => {
    render(<FormBuilder defaultValue={start()} readOnly />);
    expect(
      (screen.getByRole('button', { name: 'Add Text' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Undo' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  test('features turn parts off', () => {
    render(
      <FormBuilder
        defaultValue={start()}
        features={{ preview: false, json: false }}
      />,
    );
    expect(screen.queryByRole('region', { name: 'Preview' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copy JSON' })).toBeNull();
  });
});

describe('output', () => {
  test('the badge follows validity and save hands over the schema with its hash', async () => {
    const onSave = mock((_: unknown) => {});
    render(<FormBuilder defaultValue={start()} onSave={onSave} />);
    expect(
      within(screen.getByRole('toolbar')).getByRole('status').textContent,
    ).toBe('Valid');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 20));
    const payload = onSave.mock.calls[0]?.[0] as {
      schema: ArtisanSchemaV1;
      ok: boolean;
      hash: string;
    };
    expect(payload.ok).toBe(true);
    expect(payload.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('a controlled value that changes from outside is followed', () => {
    const { rerender } = render(<FormBuilder value={start()} />);
    const next = {
      ...start(),
      title: 'Other',
      steps: [
        { id: 'one', type: 'form' as const, title: 'Renamed', fields: [] },
      ],
    };
    rerender(<FormBuilder value={next} />);
    expect(screen.getByRole('tab', { name: /Renamed/ })).toBeTruthy();
  });

  test('a schema with problems is reported, not hidden', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(
      <FormBuilder
        defaultValue={start()}
        onChange={onChange}
        manifest={{
          contract: 'artisanform.capabilities/1',
          fieldTypes: ['text'],
          stepKinds: ['form'],
          features: [],
          refs: {
            hooks: [],
            waits: [],
            renderers: [],
            actions: [],
            options: [],
            dependentOptions: [],
            paymentProviders: [],
            storage: [],
          },
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add Email' }));
    expect(last(onChange).ok).toBe(true); // email is a native type the manifest lists by default
  });
});
