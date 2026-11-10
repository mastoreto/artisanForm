import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormSchema } from '../../../schema/legacy/types';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const scheme = {
  steps: [
    { title: 'One', fields: [{ type: 'text', name: 'a', label: 'A' }] },
    { title: 'Two', fields: [{ type: 'text', name: 'b', label: 'B' }] },
    { title: 'Done', kind: 'result', message: 'All set' },
  ],
} as FormSchema;

test('components.StatusPanel replaces the state screens', async () => {
  const user = userEvent.setup();
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={() => {}}
      components={{
        StatusPanel: ({ tone, message }) => (
          <div data-testid="custom-status" data-tone={tone}>
            {message}
          </div>
        ),
      }}
    />,
  );
  await user.click(screen.getByText('Next'));
  await user.click(screen.getByText('Finish'));
  const panel = await screen.findByTestId('custom-status');
  expect(panel.textContent).toBe('All set');
  expect(panel.getAttribute('data-tone')).toBe('success');
});

test('the stepper is display-only unless stepperNavigation is on', async () => {
  const user = userEvent.setup();
  const view = render(<ArtisanForm scheme={scheme} onSubmit={() => {}} />);
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Two' });
  expect(screen.queryByRole('button', { name: 'One' })).toBeNull();
  view.unmount();

  const nav = render(
    <ArtisanForm scheme={scheme} onSubmit={() => {}} stepperNavigation />,
  );
  await user.click(screen.getByText('Next'));
  await screen.findByRole('heading', { name: 'Two' });
  // only finished steps are selectable
  expect(screen.queryByRole('button', { name: 'Two' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'One' }));
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'One' })).toBeTruthy(),
  );
  nav.unmount();
});

test('the stylesheet ships a dark theme, reduced motion and keyboard focus rules', () => {
  const css = readFileSync(
    join(import.meta.dir, '../../../styles/artisanform.css'),
    'utf8',
  );
  expect(css).toContain('.af-root[data-theme="dark"]');
  expect(css).toContain('.af-root[data-theme="auto"]');
  expect(css).toContain('prefers-reduced-motion: reduce');
  expect(css).toContain('.af-stepper-button:focus-visible');
  // dark is opt-in: nothing switches to dark on the OS setting alone
  expect(css).not.toMatch(/prefers-color-scheme: dark\)\s*\{\s*\.af-root\s*\{/);
});

test('theme sets data-theme on the form (and nothing without it)', () => {
  const { container, rerender } = render(
    <ArtisanForm scheme={scheme} onSubmit={() => {}} />,
  );
  const root = () => container.querySelector('form') as HTMLFormElement;
  expect(root().hasAttribute('data-theme')).toBe(false);
  rerender(<ArtisanForm scheme={scheme} onSubmit={() => {}} theme="dark" />);
  expect(root().dataset.theme).toBe('dark');
});
