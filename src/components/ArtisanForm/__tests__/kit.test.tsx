import { afterEach, expect, test } from 'bun:test';
import { cleanup, render, screen } from '@testing-library/react';
import type { FormSchema } from '../../../schema/legacy/types';
import { defineUiKit } from '../../ui/kit';
import type { ArtisanInputProps } from '../../ui/types';
import ArtisanForm from '../ArtisanForm';

afterEach(cleanup);

const scheme: FormSchema = {
  steps: [
    {
      title: 'Data',
      fields: [{ type: 'text', name: 'name', label: 'Name' }],
    },
    {
      title: 'More',
      fields: [{ type: 'text', name: 'nick', label: 'Nick' }],
    },
  ],
};

const KitText = ({ id, label, value, onChange }: ArtisanInputProps<string>) => (
  <label htmlFor={id}>
    {label}
    <input
      id={id}
      data-testid="kit-input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  </label>
);

const kit = defineUiKit({
  name: 'test-kit',
  components: { inputs: { text: KitText } },
  classNames: { button: 'kit-button' },
  labels: { next: 'Forward' },
});

test('a kit replaces inputs, adds classes and sets labels', () => {
  render(<ArtisanForm scheme={scheme} onSubmit={() => {}} kit={kit} />);
  expect(screen.getByTestId('kit-input')).toBeTruthy();
  const next = screen.getByRole('button', { name: 'Forward' });
  expect(next.className).toContain('kit-button');
});

test('explicit props win over the kit', () => {
  render(
    <ArtisanForm
      scheme={scheme}
      onSubmit={() => {}}
      kit={kit}
      labels={{ next: 'Go on' }}
      classNames={{ button: 'mine' }}
    />,
  );
  const next = screen.getByRole('button', { name: 'Go on' });
  expect(next.className).toContain('mine');
  expect(next.className).not.toContain('kit-button');
});
