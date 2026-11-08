import { expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useArtisanField } from '../../../engine/form/useArtisanField';
import ArtisanForm from '../ArtisanForm';

let comp = 0;
const Probe = ({ name, label }: { name: string; label: string }) => {
  const [field] = useArtisanField<string>(name);
  comp++;
  return <input aria-label={label} {...field} value={field.value ?? ''} />;
};

test('typing in one field re-renders only that field, not its siblings', async () => {
  const user = userEvent.setup();
  let renders = 0;
  const fields = Array.from({ length: 20 }, (_, i) => ({
    type: 'probe',
    name: `f${i}`,
    label: `F${i}`,
  }));
  render(
    <ArtisanForm
      onSubmit={() => {}}
      fields={{
        probe: {
          initialValues: (f: { name: string }) => ({ [f.name]: '' }),
          render: (f: { name: string; label: string }) => {
            renders++;
            return <Probe name={f.name} label={f.label} />;
          },
          rules: () => ({}),
        } as never,
      }}
      scheme={{ steps: [{ title: 'S', fields: fields as never }] }}
    />,
  );
  const before = renders;
  const cbefore = comp;
  await user.type(screen.getByLabelText('F0'), 'abcde');
  // 5 keystrokes: only the typed field re-renders, the 19 others do not.
  expect(renders - before).toBe(0);
  expect(comp - cbefore).toBeLessThanOrEqual(10);
});
