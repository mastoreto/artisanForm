import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SnapshotConflict } from '../../persistence';
import { defineForm } from '../../schema/define';
import { mockStorage } from '../../storage/mock';
import ArtisanForm from './ArtisanForm';
import type { FormSchema } from './types';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const KEY = 'draft';
const stored = () =>
  JSON.parse(localStorage.getItem(`artisanform:${KEY}`) ?? 'null');
const backup = () => localStorage.getItem(`artisanform:${KEY}:incompatible`);

const step = (id: string, title = id.toUpperCase()) => ({
  id,
  type: 'form' as const,
  title,
  fields: [{ name: `f_${id}`, type: 'text' as const, label: `Campo ${id}` }],
});

const form = (
  steps: ReturnType<typeof step>[],
  extra: { id?: string; revision?: number } = {},
) =>
  defineForm({
    schemaVersion: 1,
    id: extra.id ?? 'reg',
    revision: extra.revision ?? 1,
    steps,
  });

const heading = () => screen.getByRole('heading', { level: 2 }).textContent;

/** Types in the first step, moves to the next one and returns once the draft is on step 'b'. */
const saveAtB = async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={form([step('a'), step('b'), step('c')])}
      persistKey={KEY}
      onSubmit={() => {}}
    />,
  );
  await user.type(screen.getByLabelText('Campo a'), 'uno');
  await user.click(screen.getByText('Siguiente'));
  await screen.findByRole('heading', { name: 'B' });
  await user.type(screen.getByLabelText('Campo b'), 'dos');
  await waitFor(() => expect(stored()?.currentStepId).toBe('b'));
  cleanup();
  return user;
};

describe('what is saved', () => {
  test('a v1 snapshot with form id, revision, step id and JSON values', async () => {
    await saveAtB();
    expect(stored()).toEqual({
      snapshotVersion: 1,
      formId: 'reg',
      formRevision: 1,
      currentStepId: 'b',
      values: { f_a: 'uno', f_b: 'dos', f_c: '' },
    });
  });

  test('secrets never reach storage, not even inside repeatable rows', async () => {
    const user = userEvent.setup();
    render(
      <ArtisanForm
        persistKey={KEY}
        onSubmit={() => {}}
        scheme={defineForm({
          schemaVersion: 1,
          id: 's',
          steps: [
            {
              id: 'a',
              type: 'form',
              title: 'A',
              fields: [
                { name: 'pw', type: 'password', label: 'Clave' },
                { name: 'user', type: 'text', label: 'Usuario' },
                {
                  name: 'cards',
                  type: 'array',
                  itemFields: [{ name: 'pin', type: 'password', label: 'PIN' }],
                },
              ],
            },
          ],
        })}
      />,
    );
    await user.type(screen.getByLabelText('Clave'), 'topsecret');
    await user.type(screen.getByLabelText('Usuario'), 'ana');
    await user.click(screen.getByText('Agregar otro'));
    await user.type(screen.getByLabelText('PIN'), '1234');
    await waitFor(() => expect(stored()?.values.user).toBe('ana'));
    const raw = localStorage.getItem(`artisanform:${KEY}`) as string;
    expect(raw).not.toContain('topsecret');
    expect(raw).not.toContain('1234');
    expect(stored().values.pw).toBeUndefined();
    expect(stored().values.cards).toBeUndefined();
  });

  test('uploaded files are stored as serializable descriptors', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ArtisanForm
        persistKey={KEY}
        storage={mockStorage({ delay: 20 })}
        onSubmit={() => {}}
        scheme={defineForm({
          schemaVersion: 1,
          id: 'f',
          steps: [
            {
              id: 'a',
              type: 'form',
              title: 'A',
              fields: [{ name: 'cv', type: 'file' }],
            },
          ],
        })}
      />,
    );
    await user.upload(
      container.querySelector('input[type=file]') as HTMLInputElement,
      new File(['x'], 'cv.pdf', { type: 'application/pdf' }),
    );
    await waitFor(() => expect(stored()?.values.cv?.[0]?.name).toBe('cv.pdf'));
    expect(stored().values.cv[0]).toMatchObject({
      id: expect.any(String),
      name: 'cv.pdf',
      size: 1,
    });
  });
});

describe('restoring', () => {
  test('goes back to the saved step by id even if steps were added before it', async () => {
    await saveAtB();
    render(
      <ArtisanForm
        scheme={form([step('x'), step('a'), step('b'), step('c')])}
        persistKey={KEY}
        onSubmit={() => {}}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'B' })).toBeTruthy();
    expect((screen.getByLabelText('Campo b') as HTMLInputElement).value).toBe(
      'dos',
    );
  });

  test('a step that is currently hidden does not trap the user: values come back, start at the first step', async () => {
    await saveAtB();
    const hidden = defineForm({
      schemaVersion: 1,
      id: 'reg',
      revision: 1,
      steps: [
        step('a'),
        {
          ...step('b'),
          visibleWhen: { field: 'f_a', operator: 'eq', value: 'otra cosa' },
        },
        step('c'),
      ],
    });
    render(
      <ArtisanForm scheme={hidden} persistKey={KEY} onSubmit={() => {}} />,
    );
    expect(heading()).toBe('A');
    expect((screen.getByLabelText('Campo a') as HTMLInputElement).value).toBe(
      'uno',
    );
  });

  test('a 0.2.0 draft ({values, step}) is restored and rewritten as a snapshot', async () => {
    const legacy: FormSchema = {
      steps: [
        { title: 'Uno', fields: [{ type: 'text', name: 'a', label: 'A' }] },
        { title: 'Dos', fields: [{ type: 'text', name: 'b', label: 'B' }] },
      ],
    };
    localStorage.setItem(
      `artisanform:${KEY}`,
      JSON.stringify({ values: { a: 'x', b: '' }, step: 1 }),
    );
    const user = userEvent.setup();
    render(
      <ArtisanForm scheme={legacy} persistKey={KEY} onSubmit={() => {}} />,
    );
    expect(await screen.findByRole('heading', { name: 'Dos' })).toBeTruthy();
    await user.type(screen.getByLabelText('B'), 'y');
    await waitFor(() => expect(stored()?.snapshotVersion).toBe(1));
    expect(stored()).toMatchObject({
      formId: `legacy:${KEY}`,
      currentStepId: 'dos',
      values: { a: 'x', b: 'y' },
    });
  });

  test('a 0.2.0 draft step index counts only the visible steps', async () => {
    const legacy: FormSchema = {
      steps: [
        {
          title: 'Oculto',
          showIf: { field: 'a', equals: 'nunca' },
          fields: [{ type: 'text', name: 'h', label: 'H' }],
        },
        {
          title: 'Visible 1',
          fields: [{ type: 'text', name: 'a', label: 'A' }],
        },
        {
          title: 'Visible 2',
          fields: [{ type: 'text', name: 'b', label: 'B' }],
        },
      ],
    };
    localStorage.setItem(
      `artisanform:${KEY}`,
      JSON.stringify({ values: { a: '', b: '' }, step: 1 }),
    );
    render(
      <ArtisanForm scheme={legacy} persistKey={KEY} onSubmit={() => {}} />,
    );
    expect(
      await screen.findByRole('heading', { name: 'Visible 2' }),
    ).toBeTruthy();
  });

  test('a v1 form adopts a 0.2.0 draft saved under the same key', async () => {
    localStorage.setItem(
      `artisanform:${KEY}`,
      JSON.stringify({ values: { f_a: 'viejo', f_b: '', f_c: '' }, step: 1 }),
    );
    render(
      <ArtisanForm
        scheme={form([step('a'), step('b'), step('c')])}
        persistKey={KEY}
        onSubmit={() => {}}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'B' })).toBeTruthy();
    expect(
      (await screen.findByLabelText('Campo b')) as HTMLInputElement,
    ).toBeTruthy();
  });
});

describe('incompatible drafts are never destroyed silently', () => {
  const cases: [string, ReturnType<typeof form>, SnapshotConflict['reason']][] =
    [
      [
        'another form',
        form([step('a'), step('b'), step('c')], { id: 'other' }),
        'form-id',
      ],
      [
        'another revision',
        form([step('a'), step('b'), step('c')], { revision: 2 }),
        'revision',
      ],
      ['a removed step', form([step('a'), step('c')]), 'step-missing'],
    ];

  for (const [name, schema, reason] of cases) {
    test(`${name}: by default the draft is backed up and the form starts clean`, async () => {
      await saveAtB();
      const raw = localStorage.getItem(`artisanform:${KEY}`);
      const onConflict = mock((_: SnapshotConflict) => 'backup' as const);
      render(
        <ArtisanForm
          scheme={schema}
          persistKey={KEY}
          onSnapshotConflict={onConflict}
          onSubmit={() => {}}
        />,
      );
      expect(heading()).toBe('A');
      expect((screen.getByLabelText('Campo a') as HTMLInputElement).value).toBe(
        '',
      );
      expect(onConflict.mock.calls[0][0].reason).toBe(reason);
      expect(backup()).toBe(raw);
    });
  }

  test('with no callback the default is the same backup', async () => {
    await saveAtB();
    const raw = localStorage.getItem(`artisanform:${KEY}`);
    render(
      <ArtisanForm
        scheme={form([step('a'), step('b')], { revision: 9 })}
        persistKey={KEY}
        onSubmit={() => {}}
      />,
    );
    expect(heading()).toBe('A');
    expect(backup()).toBe(raw);
  });

  test('the consumer can choose to restore anyway', async () => {
    await saveAtB();
    render(
      <ArtisanForm
        scheme={form([step('a'), step('b'), step('c')], { revision: 2 })}
        persistKey={KEY}
        onSnapshotConflict={() => 'restore'}
        onSubmit={() => {}}
      />,
    );
    expect(await screen.findByRole('heading', { name: 'B' })).toBeTruthy();
    expect((screen.getByLabelText('Campo b') as HTMLInputElement).value).toBe(
      'dos',
    );
    expect(backup()).toBeNull();
  });

  test('restoring into a form that lost the step keeps the values and starts at the beginning', async () => {
    await saveAtB();
    render(
      <ArtisanForm
        scheme={form([step('a'), step('c')])}
        persistKey={KEY}
        onSnapshotConflict={() => 'restore'}
        onSubmit={() => {}}
      />,
    );
    expect(heading()).toBe('A');
    expect((screen.getByLabelText('Campo a') as HTMLInputElement).value).toBe(
      'uno',
    );
  });

  test('the consumer can choose to discard', async () => {
    await saveAtB();
    render(
      <ArtisanForm
        scheme={form([step('a')], { revision: 3 })}
        persistKey={KEY}
        onSnapshotConflict={() => 'discard'}
        onSubmit={() => {}}
      />,
    );
    expect(backup()).toBeNull();
    expect((screen.getByLabelText('Campo a') as HTMLInputElement).value).toBe(
      '',
    );
  });

  test('corrupt and future-version drafts are reported and backed up too', async () => {
    const reasons: string[] = [];
    for (const raw of [
      '{not json',
      JSON.stringify({ snapshotVersion: 7, formId: 'reg' }),
    ]) {
      localStorage.clear();
      localStorage.setItem(`artisanform:${KEY}`, raw);
      render(
        <ArtisanForm
          scheme={form([step('a')])}
          persistKey={KEY}
          onSnapshotConflict={(c) => {
            reasons.push(c.reason);
            return 'backup';
          }}
          onSubmit={() => {}}
        />,
      );
      expect(backup()).toBe(raw);
      cleanup();
    }
    expect(reasons).toEqual(['corrupt', 'unsupported-version']);
  });

  test('the draft is deleted after a successful submit', async () => {
    const user = userEvent.setup();
    render(
      <ArtisanForm
        scheme={form([step('a')])}
        persistKey={KEY}
        onSubmit={() => {}}
      />,
    );
    await waitFor(() => expect(stored()).not.toBeNull());
    await user.click(screen.getByText('Finalizar'));
    await waitFor(() => expect(stored()).toBeNull());
  });
});
