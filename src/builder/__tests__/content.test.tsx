import { afterEach, describe, expect, mock, test } from 'bun:test';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { checkSchema, normalizeArtisanSchema } from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { FormBuilder } from '../components/FormBuilder';
import {
  addLocale,
  removeLocale,
  setMessage,
  setSourceLocale,
  translationRows,
} from '../model/i18n';
import { defaultTemplates } from '../templates';
import type { BuilderResult } from '../useFormBuilder';

afterEach(cleanup);

const small = (): ArtisanSchemaV1 => ({
  schemaVersion: 1,
  id: 'f',
  title: 'Hello',
  steps: [
    {
      id: 'one',
      type: 'form',
      title: 'One',
      fields: [{ type: 'text', name: 'name', label: 'Name {n}' }],
    },
  ],
});

describe('templates', () => {
  test.each(defaultTemplates.map((t) => [t.id, t] as const))(
    '%s is a valid, portable schema',
    (_id, t) => {
      const r = checkSchema(t.schema);
      expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
      expect(normalizeArtisanSchema(t.schema).portable).toBe(true);
    },
  );
});

describe('translations: the model', () => {
  test('a language starts empty, refuses bad tags and duplicates, and can be removed', () => {
    const a = addLocale(small(), 'es-AR');
    expect(a.schema.i18n?.messages).toEqual({ 'es-AR': {} });
    expect(addLocale(small(), 'not a tag').error).toBe('invalid-name');
    expect(addLocale(a.schema, 'es-AR').error).toBe('duplicate-name');
    const gone = removeLocale(a.schema, 'es-AR');
    expect(gone.schema.i18n).toBeUndefined();
  });

  test('setMessage sets and clears a key; the source language is kept apart', () => {
    let s = addLocale(small(), 'es').schema;
    s = setMessage(s, 'es', 'title', 'Hola').schema;
    expect(s.i18n?.messages?.es).toEqual({ title: 'Hola' });
    s = setMessage(s, 'es', 'title', '').schema;
    expect(s.i18n?.messages?.es).toEqual({});
    s = setSourceLocale(s, 'en').schema;
    expect(s.i18n?.sourceLocale).toBe('en');
    expect(setMessage(small(), 'fr', 'title', 'x').error).toBe('not-found');
  });

  test('rows show every text with its state, and placeholders that do not match', () => {
    let s = addLocale(small(), 'es').schema;
    s = setMessage(s, 'es', 'title', 'Hola').schema;
    s = setMessage(s, 'es', 'steps.one.fields.name.label', 'Nombre').schema; // lost {n}
    const { rows } = translationRows(s, 'es');
    const by = (k: string) => rows.find((r) => r.key === k)?.state;
    expect(by('title')).toBe('ok');
    expect(by('steps.one.fields.name.label')).toBe('bad-placeholders');
    expect(by('steps.one.title')).toBe('missing');
  });

  test('a translation of a text that is gone is reported as an orphan', () => {
    let s = addLocale(small(), 'es').schema;
    s = setMessage(s, 'es', 'steps.zzz.title', 'Fantasma').schema;
    expect(translationRows(s, 'es').orphans).toEqual(['steps.zzz.title']);
  });
});

describe('the panels', () => {
  const open = (name: string) =>
    fireEvent.click(screen.getByRole('button', { name }));

  test('a template replaces the form, asking twice when there is content', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(
      <FormBuilder
        defaultValue={
          defaultTemplates.find((t) => t.id === 'registration')?.schema
        }
        onChange={onChange}
      />,
    );
    open('Templates');
    const button = screen.getByRole('button', { name: 'Use Contact' });
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
    expect(button.textContent).toContain('Click again to confirm');
    fireEvent.click(button);
    expect(
      (onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined)?.schema.id,
    ).toBe('contact');
  });

  test('an empty form takes a template at once, and the result is valid', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder onChange={onChange} />);
    open('Templates');
    fireEvent.click(
      screen.getByRole('button', { name: 'Use Satisfaction survey' }),
    );
    const r = onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined;
    expect(r?.schema.id).toBe('survey');
    expect(r?.ok).toBe(true);
  });

  test('JSON: apply an edited schema, convert an old one, and refuse nonsense', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={small()} onChange={onChange} />);
    open('JSON');
    const area = screen.getByRole('textbox', { name: 'Schema JSON' });
    fireEvent.change(area, {
      target: { value: JSON.stringify({ ...small(), title: 'Edited' }) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(
      (onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined)?.schema
        .title,
    ).toBe('Edited');

    fireEvent.change(area, { target: { value: '{ nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert').textContent).toBe(
      'This is not valid JSON',
    );

    fireEvent.change(area, {
      target: {
        value: JSON.stringify({
          steps: [
            { title: 'Old', fields: [{ type: 'text', name: 'a', label: 'A' }] },
          ],
        }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const r = onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined;
    expect(r?.schema.schemaVersion).toBe(1);
    expect(r?.schema.steps[0]?.title).toBe('Old');
    expect(
      screen.getByText(/converted to the current format|not carried over/),
    ).toBeTruthy();

    fireEvent.change(area, {
      target: {
        value: JSON.stringify({ schemaVersion: 1, id: 'x', steps: [] }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert').textContent).toContain('empty-steps');
  });

  test('translations: add a language, translate a text, and preview in it', () => {
    const onChange = mock((_: BuilderResult) => {});
    render(<FormBuilder defaultValue={small()} onChange={onChange} />);
    open('Translations');
    fireEvent.change(screen.getByLabelText('Language (es, es-AR…)'), {
      target: { value: 'es' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add language' }));
    fireEvent.change(screen.getByLabelText('es: Hello'), {
      target: { value: 'Hola' },
    });
    const schema = (
      onChange.mock.calls.at(-1)?.[0] as BuilderResult | undefined
    )?.schema;
    expect(schema?.i18n?.messages?.es).toEqual({ title: 'Hola' });
    expect(screen.getByText('1 of 3 translated')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Language (es, es-AR…)'), {
      target: { value: 'nope!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add language' }));
    expect(screen.getByRole('alert').textContent).toBe(
      'This is not a language tag',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview in this language' }),
    );
    expect(
      screen
        .getByRole('button', { name: 'Preview in this language' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  test('features turn the panels off', () => {
    render(
      <FormBuilder
        defaultValue={small()}
        features={{
          templates: false,
          translations: false,
          json: false,
          import: false,
        }}
      />,
    );
    for (const name of ['Templates', 'Translations', 'JSON'])
      expect(screen.queryByRole('button', { name })).toBeNull();
    expect(
      within(screen.getByRole('toolbar')).getByRole('button', { name: 'Undo' }),
    ).toBeTruthy();
  });
});
