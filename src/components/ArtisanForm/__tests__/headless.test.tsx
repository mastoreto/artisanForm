import { afterEach, expect, mock, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Controller } from 'react-hook-form';
import { defineForm } from '../../../schema';
import { ArtisanWizardProvider, useArtisanWizard } from '../useArtisanWizard';

afterEach(cleanup);

const schema = defineForm({
  schemaVersion: 1,
  id: 'headless',
  steps: [
    {
      id: 'who',
      type: 'form',
      title: 'Who',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Name',
          required: true,
        },
        { type: 'text', name: 'company', label: 'Company' },
      ],
    },
    {
      id: 'extra',
      type: 'form',
      title: 'Extra',
      visibleWhen: { field: 'company', operator: 'filled' },
      fields: [{ type: 'text', name: 'role', label: 'Role' }],
    },
    {
      id: 'end',
      type: 'form',
      title: 'End',
      fields: [{ type: 'text', name: 'note', label: 'Note' }],
    },
  ],
});

// A UI with no af-* classes and no kit: plain inputs bound to `wizard.form`.
const Plain = ({ onSubmit }: { onSubmit: (v: unknown) => void }) => {
  const wizard = useArtisanWizard({ schema, onSubmit });
  const { current, bindForm } = wizard;
  return (
    <ArtisanWizardProvider wizard={wizard}>
      <form
        ref={bindForm}
        onSubmit={(e) => {
          e.preventDefault();
          void wizard.next();
        }}
      >
        <ol>
          {wizard.steps.map((s) => (
            <li key={s.id} data-state={s.state}>
              {s.title}
            </li>
          ))}
        </ol>
        <h2>{current?.title}</h2>
        {current?.fields.map((f) => (
          <Controller
            key={String(f.name)}
            control={wizard.form.control}
            name={String(f.name)}
            render={({ field, fieldState }) => (
              <label>
                {f.label}
                <input
                  {...field}
                  value={String(field.value ?? '')}
                  aria-invalid={!!fieldState.error}
                />
                {fieldState.error && (
                  <span role="alert">{fieldState.error.message}</span>
                )}
              </label>
            )}
          />
        ))}
        <button type="button" onClick={wizard.back} disabled={wizard.isFirst}>
          Back
        </button>
        <button type="submit">{wizard.isLast ? 'Finish' : 'Next'}</button>
      </form>
    </ArtisanWizardProvider>
  );
};

test('a custom UI keeps validation, conditions and navigation, with no af-* classes', async () => {
  const user = userEvent.setup();
  const onSubmit = mock((_: unknown) => {});
  const { container } = render(<Plain onSubmit={onSubmit} />);

  // required field blocks "Next"
  await user.click(screen.getByText('Next'));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Who' })).toBeTruthy();

  // the conditional step is not reachable until its condition holds
  await user.type(screen.getByLabelText(/^Name/), 'Ana');
  expect(screen.queryByText('Extra')).toBeNull();
  await user.click(screen.getByText('Next'));
  expect(await screen.findByRole('heading', { name: 'End' })).toBeTruthy();
  await user.click(screen.getByText('Back'));
  await user.type(await screen.findByLabelText(/^Company/), 'Acme');
  await user.click(screen.getByText('Next'));
  expect(await screen.findByRole('heading', { name: 'Extra' })).toBeTruthy();

  await user.click(screen.getByText('Next'));
  await user.click(await screen.findByText('Finish'));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    name: 'Ana',
    company: 'Acme',
  });
  expect(container.innerHTML).not.toContain('af-');
});

const Nav = ({
  stepId,
  onId,
}: {
  stepId?: string;
  onId?: (id: string) => void;
}) => {
  const wizard = useArtisanWizard({
    schema,
    onSubmit: () => {},
    stepId,
    onStepIdChange: onId,
  });
  return (
    <ArtisanWizardProvider wizard={wizard}>
      <p data-testid="current">{wizard.current?.id}</p>
      <button type="button" onClick={() => wizard.goToStep('end')}>
        to end
      </button>
      <button type="button" onClick={() => wizard.goToStep('extra')}>
        to extra
      </button>
    </ArtisanWizardProvider>
  );
};

test('goToStep moves by id, rejects hidden steps and reports the new id', async () => {
  const user = userEvent.setup();
  const onId = mock((_: string) => {});
  render(<Nav onId={onId} />);
  expect(screen.getByTestId('current').textContent).toBe('who');
  await user.click(screen.getByText('to extra')); // hidden: company is empty
  expect(screen.getByTestId('current').textContent).toBe('who');
  await user.click(screen.getByText('to end'));
  expect(screen.getByTestId('current').textContent).toBe('end');
  expect(onId.mock.calls.map((c) => c[0])).toEqual(['end']);
});

test('stepId starts the wizard at that step and follows changes', async () => {
  const view = render(<Nav stepId="end" />);
  expect(screen.getByTestId('current').textContent).toBe('end');
  view.rerender(<Nav stepId="who" />);
  await waitFor(() =>
    expect(screen.getByTestId('current').textContent).toBe('who'),
  );
});
