import { afterEach, describe, expect, test } from 'bun:test';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormSchema } from '../../../schema/legacy/types';
import ArtisanForm from '../../ArtisanForm/ArtisanForm';
import type { ArtisanUiKit } from '../kit';

/**
 * Accessibility checks every UI kit must pass (the contract of
 * `ArtisanInputProps`). Run it against the kit's own components.
 */
const scheme: FormSchema = {
  steps: [
    {
      title: 'Data',
      fields: [
        { type: 'text', name: 'name', label: 'Full name', required: true },
        { type: 'email', name: 'mail', label: 'Mail address', required: true },
        { type: 'textarea', name: 'bio', label: 'About you' },
        {
          type: 'select',
          name: 'plan',
          label: 'Plan',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
        { type: 'checkbox', name: 'agree', label: 'I agree' },
        { type: 'text', name: 'locked', label: 'Locked', disabled: true },
      ],
    },
    { title: 'Done', fields: [{ type: 'text', name: 'x', label: 'X' }] },
  ],
};

export const describeKitConformance = (kit?: ArtisanUiKit) => {
  describe(`UI conformance: ${kit?.name ?? 'default UI'}`, () => {
    afterEach(cleanup);
    const mount = () =>
      render(<ArtisanForm scheme={scheme} onSubmit={() => {}} kit={kit} />);

    test('every control is reachable by its label', () => {
      mount();
      for (const label of [
        'Full name',
        'Mail address',
        'About you',
        'Plan',
        'I agree',
      ])
        expect(screen.getByLabelText(label)).toBeTruthy();
    });

    test('disabled fields are disabled', () => {
      mount();
      expect(
        (screen.getByLabelText('Locked') as HTMLInputElement).disabled,
      ).toBe(true);
    });

    test('a blocked Next flags and focuses the first invalid field', async () => {
      mount();
      await userEvent.click(screen.getByRole('button', { name: /next/i }));
      const first = screen.getByLabelText('Full name');
      await waitFor(() =>
        expect(first.getAttribute('aria-invalid')).toBe('true'),
      );
      await waitFor(() => expect(document.activeElement).toBe(first));
    });

    test('the error text is linked through aria-describedby', async () => {
      mount();
      await userEvent.click(screen.getByRole('button', { name: /next/i }));
      const control = screen.getByLabelText('Mail address');
      await waitFor(() =>
        expect(control.getAttribute('aria-describedby')).toBeTruthy(),
      );
      const ids = (control.getAttribute('aria-describedby') ?? '').split(' ');
      const text = ids
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');
      expect(text.length).toBeGreaterThan(0);
    });
  });
};
